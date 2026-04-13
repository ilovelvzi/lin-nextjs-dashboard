const EMBED_URL =
  "https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings";
const EMBED_MODEL = "text-embedding-v3";
const EMBED_DIMS = 1024;

/** 批量文本 → 向量，保持顺序，DashScope 单次上限 10 条 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const res = await fetch(EMBED_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: texts,
      dimensions: EMBED_DIMS,
    }),
  });
  if (!res.ok) throw new Error(`Embedding 失败: ${await res.text()}`);
  const data = await res.json();
  return (data.data as { index: number; embedding: number[] }[])
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

/** 单条查询文本 → 向量，带简单 LRU 缓存（最多 500 条） */
const cache = new Map<string, number[]>();
const CACHE_MAX = 500;

export async function embedQuery(text: string): Promise<number[]> {
  const hit = cache.get(text);
  if (hit) return hit;

  const [embedding] = await embedBatch([text]);

  if (cache.size >= CACHE_MAX) {
    cache.delete(cache.keys().next().value!);
  }
  cache.set(text, embedding);
  return embedding;
}
