import { retrieveContext } from "@/app/lib/retrieval";
import client from "@/app/lib/ai-client";

type MsgIn = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const { messages }: { messages: MsgIn[] } = await req.json();

  // 最后一条用户消息作为检索 query
  const userQuery = messages[messages.length - 1].content;

  // 去数据库检索相关文本块
  const chunks = await retrieveContext(userQuery);

  const enc = new TextEncoder();
  function sse(event: string, data: unknown): Uint8Array {
    return enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  if (chunks.length === 0) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(sse("sources", []));
        controller.enqueue(
          sse("text", {
            delta: "知识库中暂未找到相关内容，请先上传文档或换一种问法。",
          }),
        );
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream; charset=utf-8" },
    });
  }

  // 把检索到的文本块拼成上下文，带上来源文件名
  const context = chunks
    .map((c, i) => `[${i + 1}] 来源：${c.source}\n${c.content}`)
    .join("\n\n---\n\n");

  // 保留最近 6 条对话（3 轮）作为多轮上下文，避免超出 context window
  const history = messages.slice(-6);

  const completionStream = await client.chat.completions.create({
    model: "qwen-plus",
    temperature: 0.1,
    stream: true,
    messages: [
      {
        role: "system",
        content: `你是一个知识库助手，严格根据以下上下文内容回答用户问题。

规则：
1. 只使用上下文中的信息作答，不得编造或推断上下文未提及的内容。
2. 如果上下文中没有足够信息，直接回答"知识库中暂无相关内容"，不要强行作答。
3. 回答时用 [1][2] 标注引用的片段编号；如果综合了多个片段，逐一标注。
4. 用中文回答，语言简洁，重点突出；如有步骤或列表，用换行分隔。
5. 如果问题涉及页码，可根据上下文中的 [第 N 页] 标记告知用户。

## 知识库上下文
${context}`,
      },
      ...history,
    ],
  });

  const stream = new ReadableStream({
    async start(controller) {
      // 先把检索到的来源元数据发给前端
      controller.enqueue(
        sse(
          "sources",
          chunks.map(({ source, content, similarity }) => ({
            source,
            content,
            similarity,
          })),
        ),
      );
      // 再逐 token 流式传输 LLM 回答
      for await (const chunk of completionStream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) controller.enqueue(sse("text", { delta }));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8" },
  });
}
