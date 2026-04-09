import sql from "./db";

// 把用户问题向量化
async function embedQuery(text: string): Promise<number[]> {
  const res = await fetch(
    "https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "text-embedding-v3", input: text, dimensions: 1024 }),
    },
  );
  if (!res.ok) throw new Error(`Embedding 失败: ${await res.text()}`);
  const data = await res.json();
  return data.data[0].embedding;
}

// 从数据库检索最相关的文本块
export async function retrieveContext(
  query: string,
): Promise<{ content: string; source: string; similarity: number }[]> {
  const embedding = await embedQuery(query);
  const vectorStr = `[${embedding.join(",")}]`;

  const chunks = await sql<
    { content: string; metadata: { source: string }; similarity: number }[]
  >`
    SELECT * FROM match_documents(
      ${vectorStr}::vector,
      0.7,   -- 相似度阈值，低于这个分数的结果直接丢弃
      4      -- 最多返回 4 个文本块
    )
  `;

  return chunks.map((c) => ({
    content: c.content,
    source: c.metadata?.source ?? "未知来源",
    similarity: c.similarity,
  }));
}
