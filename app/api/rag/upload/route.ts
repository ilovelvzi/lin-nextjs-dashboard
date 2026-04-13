import { NextRequest } from "next/server";
import sql from "@/app/lib/db";
import { extractText } from "unpdf";
import mammoth from "mammoth";
import { chunkText } from "@/app/lib/chunker";
import { embedBatch } from "@/app/lib/embedding";

const EMBED_BATCH = 10;

// ─── DOCX 表格保留：HTML → 结构化纯文本 ──────────────────────────────────────

function htmlToStructuredText(html: string): string {
  return (
    html
      // 表格 → 管道格式，保留行列结构
      .replace(/<table[\s\S]*?<\/table>/gi, (table) => {
        const rows = table.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
        const textRows = rows.map((row) => {
          const cells = row.match(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi) ?? [];
          const cellTexts = cells.map((c) =>
            c
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim(),
          );
          return "| " + cellTexts.join(" | ") + " |";
        });
        return "\n" + textRows.join("\n") + "\n";
      })
      // 标题保留换行
      .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, "\n$1\n")
      // 段落、列表项
      .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "$1\n")
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "• $1\n")
      .replace(/<br\s*\/?>/gi, "\n")
      // 剥离剩余 HTML 标签
      .replace(/<[^>]+>/g, " ")
      // HTML 实体
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      // 整理空白
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

// ─── SSE helper ──────────────────────────────────────────────────────────────

function sseEvent(data: object): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

// ─── POST: 上传文件，提取、分块、向量化、入库（SSE 推送进度）──────────────────

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return Response.json({ error: "未收到文件" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!["pdf", "docx", "txt"].includes(ext)) {
    return Response.json(
      { error: "仅支持 PDF、DOCX、TXT 格式" },
      { status: 400 },
    );
  }

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
  if (file.size > MAX_FILE_SIZE) {
    return Response.json(
      {
        error: `文件大小不能超过 100MB（当前 ${(file.size / 1024 / 1024).toFixed(1)}MB）`,
      },
      { status: 400 },
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => controller.enqueue(sseEvent(data));

      try {
        // 1. 提取文本
        send({ stage: "reading", message: "读取文件内容..." });
        const arrayBuffer = await file.arrayBuffer();
        let text = "";

        if (ext === "pdf") {
          // 逐页提取并注入页码标记，便于 AI 回答时定位页码
          const result = await extractText(new Uint8Array(arrayBuffer), {
            mergePages: false,
          });
          const pages: string[] = Array.isArray(result.text)
            ? result.text
            : [result.text as unknown as string];
          text = pages
            .map((p, i) => `[第 ${i + 1} 页]\n${p.trim()}`)
            .filter((p) => p.length > 15)
            .join("\n\n");
        } else if (ext === "docx") {
          // 使用 HTML 转换保留表格结构，再转成易于 embedding 的纯文本
          const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
          text = htmlToStructuredText(html);
        } else {
          text = new TextDecoder().decode(arrayBuffer);
        }

        if (!text.trim()) throw new Error("文件内容为空，无法入库");

        // 2. 语义分块
        send({ stage: "chunking", message: "文本分块中..." });
        const chunks = chunkText(text);
        send({
          stage: "chunking",
          message: `切出 ${chunks.length} 个文本块`,
          total: chunks.length,
        });

        // 3. 批量向量化（在事务外完成，外部 API 调用不应占用 DB 连接）
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

          send({
            stage: "embedding",
            message: "向量化中...",
            current: Math.min(i + EMBED_BATCH, chunks.length),
            total: chunks.length,
          });

          if (i + EMBED_BATCH < chunks.length) {
            await new Promise((r) => setTimeout(r, 200));
          }
        }

        // 4. 事务：原子性删除旧数据 + 写入全部新 chunks，确保不出现半截入库
        send({
          stage: "embedding",
          message: "写入数据库...",
          current: chunks.length,
          total: chunks.length,
        });
        await sql.begin(async (tx) => {
          await tx`DELETE FROM documents WHERE metadata->>'source' = ${file.name}`;
          for (const row of rows) {
            const metadata = tx.json({
              source: file.name,
              chunk_index: row.chunkIndex,
            });
            await tx`
              INSERT INTO documents (content, embedding, metadata)
              VALUES (${row.content}, ${row.vector}::vector, ${metadata})
            `;
          }
        });

        send({
          stage: "done",
          message: `「${file.name}」已成功入库，共 ${chunks.length} 个文本块`,
        });
      } catch (err: unknown) {
        send({
          stage: "error",
          message: err instanceof Error ? err.message : "处理失败",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}

// ─── GET: 列出知识库中所有文档 ────────────────────────────────────────────────

export async function GET() {
  const rows = await sql<{ source: string; count: string }[]>`
    SELECT metadata->>'source' AS source,
           COUNT(*)::text      AS count
    FROM documents
    GROUP BY source
    ORDER BY source
  `;
  return Response.json(
    rows.map((r) => ({ source: r.source, count: Number(r.count) })),
  );
}

// ─── DELETE: 删除某个文档的所有向量块 ─────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const source = new URL(req.url).searchParams.get("source");
  if (!source)
    return Response.json({ error: "缺少 source 参数" }, { status: 400 });

  await sql`DELETE FROM documents WHERE metadata->>'source' = ${source}`;
  return Response.json({ ok: true });
}
