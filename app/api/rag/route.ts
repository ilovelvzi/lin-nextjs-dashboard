import { retrieveContext } from "@/app/lib/retrieval";
import client from "@/app/lib/ai-client";

export async function POST(req: Request) {
  const { messages } = await req.json();

  // 取出用户最新的问题
  const userQuery = messages[messages.length - 1].content;

  // 去数据库检索相关文本块
  const chunks = await retrieveContext(userQuery);

  // 如果没检索到任何内容，直接告诉用户
  if (chunks.length === 0) {
    return new Response(JSON.stringify({ error: "知识库中没有找到相关内容" }), {
      status: 200,
    });
  }

  // 把检索到的文本块拼成上下文，带上来源文件名
  const context = chunks
    .map((c, i) => `[${i + 1}] 来源：${c.source}\n${c.content}`)
    .join("\n\n---\n\n");

  const completionStream = await client.chat.completions.create({
    model: "qwen-plus",
    temperature: 0.1,
    stream: true,
    messages: [
      {
        role: "system",
        content: `你是一个知识库助手，只根据以下上下文内容回答用户问题。
如果上下文中没有足够信息，请直接说"知识库中暂无相关内容"，不要编造答案。
回答时用 [1][2] 标注引用的是哪个片段。

## 知识库上下文
${context}`,
      },
      messages[0],
    ],
  });

  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of completionStream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) controller.enqueue(new TextEncoder().encode(delta));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
