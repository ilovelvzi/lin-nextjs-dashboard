import { config } from "dotenv";
config({ path: ".env.local" });

import sql from "../app/lib/db";
import { extractText } from "unpdf";
import fs from "fs";
import path from "path";

function chunkText(text: string): string[] {
  const chunkSize = 500;
  const overlap = 50;
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const chunk = text.slice(start, start + chunkSize).trim();
    if (chunk.length > 0) chunks.push(chunk);
    start += chunkSize - overlap;
  }
  return chunks;
}

async function embedText(text: string): Promise<number[]> {
  const res = await fetch(
    "https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-v3",
        input: text,
        dimensions: 1024,
      }),
    },
  );

  if (!res.ok) throw new Error(`Embedding 失败: ${await res.text()}`);
  const data = await res.json();

  return data.data[0].embedding;
}

async function insertChunk(
  content: string,
  embedding: number[],
  source: string,
  chunkIndex: number,
) {
  const vectorStr = `[${embedding.join(",")}]`;

  const metadata = sql.json({ source, chunk_index: chunkIndex }); // ← 改这里

  await sql`
    INSERT INTO documents (content, embedding, metadata)
    VALUES (
      ${content},
      ${vectorStr}::vector,
      ${metadata}
    )
  `;
}

async function ingestFile(filePath: string) {
  console.log(`\n开始处理：${filePath}`);
  const buffer = fs.readFileSync(filePath);
  const { text } = await extractText(new Uint8Array(buffer), {
    mergePages: true,
  });
  const chunks = chunkText(text);
  console.log(`共切出 ${chunks.length} 个文本块`);

  for (let i = 0; i < chunks.length; i++) {
    process.stdout.write(`\r进度：${i + 1} / ${chunks.length}`);
    const embedding = await embedText(chunks[i]);
    await insertChunk(chunks[i], embedding, path.basename(filePath), i);
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\n完成！`);
}

async function main() {
  const docsDir = "./docs";
  const files = fs.readdirSync(docsDir).filter((f) => f.endsWith(".pdf"));

  if (files.length === 0) {
    console.log("docs/ 下没有 PDF 文件");
    process.exit(0);
  }

  for (const file of files) {
    await ingestFile(path.join(docsDir, file));
  }

  // postgres 库需要手动关闭连接
  await sql.end();
  console.log("\n所有文件处理完毕！");
}

main().catch(console.error);
