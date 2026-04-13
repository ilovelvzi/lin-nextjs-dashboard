import sql from "./db";
import { embedQuery } from "./embedding";

// ─── Types ──────────────────────────────────────────────────────────────────

type Chunk = { content: string; source: string; similarity: number };

// ─── Channel 1: Semantic (vector) search ────────────────────────────────────

async function semanticSearch(
  vectorStr: string,
  limit: number,
): Promise<Chunk[]> {
  const rows = await sql<
    { content: string; metadata: { source: string }; similarity: number }[]
  >`
    SELECT * FROM match_documents(
      ${vectorStr}::vector,
      0.3,
      ${limit}
    )
  `;
  return rows.map((c) => ({
    content: c.content,
    source: c.metadata?.source ?? "未知来源",
    similarity: c.similarity,
  }));
}

// ─── Channel 2: Keyword search via pg_trgm (character-level, works for Chinese)

async function keywordSearch(query: string, limit: number): Promise<Chunk[]> {
  try {
    const rows = await sql<
      { content: string; metadata: { source: string }; rank: number }[]
    >`
      SELECT content, metadata,
             similarity(content, ${query}) AS rank
      FROM documents
      WHERE similarity(content, ${query}) > 0.1
      ORDER BY rank DESC
      LIMIT ${limit}
    `;
    return rows.map((c) => ({
      content: c.content,
      source: c.metadata?.source ?? "未知来源",
      similarity: c.rank,
    }));
  } catch {
    // pg_trgm 扩展不可用时静默降级，语义检索通道仍有效
    return [];
  }
}

// ─── RRF merge ──────────────────────────────────────────────────────────────

function rrfMerge(semantic: Chunk[], keyword: Chunk[], k = 60): Chunk[] {
  const scores = new Map<string, { chunk: Chunk; score: number }>();

  const addRanks = (chunks: Chunk[]) => {
    chunks.forEach((chunk, rank) => {
      const key = chunk.content;
      const rrf = 1 / (k + rank + 1);
      const existing = scores.get(key);
      if (existing) {
        existing.score += rrf;
      } else {
        scores.set(key, { chunk, score: rrf });
      }
    });
  };

  addRanks(semantic);
  addRanks(keyword);

  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .map((v) => ({ ...v.chunk, similarity: v.score }));
}

// ─── Reranker ───────────────────────────────────────────────────────────────

const MIN_RELEVANCE = 0.05; // reranker 分数低于此值视为无关，不传给 LLM

async function rerank(
  query: string,
  chunks: Chunk[],
  topN = 6,
): Promise<Chunk[]> {
  if (chunks.length === 0) return [];
  if (chunks.length <= topN) return chunks;

  try {
    const res = await fetch(
      "https://dashscope.aliyuncs.com/api/v1/services/rerank/text-rerank/text-rerank",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gte-rerank",
          input: {
            query,
            documents: chunks.map((c) => c.content),
            top_n: topN,
            return_documents: false,
          },
        }),
      },
    );
    if (!res.ok) throw new Error("Rerank API 失败");
    const data = await res.json();

    const ranked = (
      data.output.results as { index: number; relevance_score: number }[]
    ).map((r) => ({ ...chunks[r.index], similarity: r.relevance_score }));

    // 过滤掉相关性过低的 chunk，避免模型用无关内容生成答案
    return ranked.filter((c) => c.similarity >= MIN_RELEVANCE);
  } catch {
    // Reranker 不可用时降级返回 RRF top-N
    return chunks.slice(0, topN);
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function retrieveContext(
  query: string,
): Promise<{ content: string; source: string; similarity: number }[]> {
  const embedding = await embedQuery(query);
  const vectorStr = `[${embedding.join(",")}]`;

  // 两路并行检索，各取最多 20 个候选
  const [semanticResult, keywordResult] = await Promise.all([
    semanticSearch(vectorStr, 20),
    keywordSearch(query, 20),
  ]);

  // RRF 融合去重排序
  const merged = rrfMerge(semanticResult, keywordResult);

  // 取前 12 送 Reranker，最终返回 top-6（低于相关性阈值的自动过滤）
  return rerank(query, merged.slice(0, 12), 6);
}
