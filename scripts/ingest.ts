import { config } from "dotenv";
config({ path: ".env.local" });

import sql from "../app/lib/db";
import { extractText } from "unpdf";
import { chunkText } from "../app/lib/chunker";
import { embedBatch } from "../app/lib/embedding";
import fs from "fs";
import path from "path";

const EMBED_BATCH = 10;

async function ingestFile(filePath: string) {
  const source = path.basename(filePath);
  console.log(`\n▸ 处理：${source}`);

  const buffer = fs.readFileSync(filePath);
  // 逐页提取并注入页码标记
  const result = await extractText(new Uint8Array(buffer), {
    mergePages: false,
  });
  const pages: string[] = Array.isArray(result.text)
    ? result.text
    : [result.text as unknown as string];
  const text = pages
    .map((p, i) => `[第 ${i + 1} 页]\n${p.trim()}`)
    .filter((p) => p.length > 15)
    .join("\n\n");
  const chunks = chunkText(text);
  console.log(`  切出 ${chunks.length} 个文本块（语义分块）`);

  // Phase 1：在事务外完成全部 embedding（外部 API 调用）
  type Row = { content: string; vector: string; chunkIndex: number };
  const rows: Row[] = [];

  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    const batch = chunks.slice(i, i + EMBED_BATCH);
    const embeddings = await embedBatch(batch);
    for (let j = 0; j < batch.length; j++) {
      rows.push({
        content: batch[j],
        vector: `[${embeddings[j].join(",")}]`,
        chunkIndex: i + j,
      });
    }
    process.stdout.write(
      `\r  向量化进度：${Math.min(i + EMBED_BATCH, chunks.length)} / ${chunks.length}`,
    );
    if (i + EMBED_BATCH < chunks.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  // Phase 2：单事务原子写入，防止半截入库
  console.log(`\n  写入数据库...`);
  await sql.begin(async (tx) => {
    await tx`DELETE FROM documents WHERE metadata->>'source' = ${source}`;
    for (const row of rows) {
      const metadata = tx.json({ source, chunk_index: row.chunkIndex });
      await tx`
        INSERT INTO documents (content, embedding, metadata)
        VALUES (${row.content}, ${row.vector}::vector, ${metadata})
      `;
    }
  });

  console.log(`  ✓ 完成`);
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

  await sql.end();
  console.log("\n所有文件处理完毕！");
}

main().catch(console.error);
