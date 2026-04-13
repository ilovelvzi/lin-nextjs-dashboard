import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import sql from "@/app/lib/db";
import client from "@/app/lib/ai-client";

const OPTIMIZE_SYSTEM_PROMPT = `你是一位专业的简历写作专家。
请根据用户提供的简历内容和用户采纳的优化建议，生成一份经过优化的简历。

优化要求：
1. 保持原有的基本信息和工作经历的真实性，不虚构内容
2. 严格按照用户采纳的每条优化建议进行修改
3. 优化工作经历的描述，使用STAR法则（情境、任务、行动、结果），增加量化数据
4. 优化技能描述，突出与目标岗位最相关的技能
5. 改善语言表达，使用专业、简洁的措辞
6. 优化整体结构和格式，提高可读性
7. 加强关键词的使用，提高ATS系统通过率
8. 如果有目标岗位描述，重点优化与岗位要求匹配的部分

输出格式要求：
- 使用 Markdown 格式输出完整简历，方便排版和阅读
- 用 # 表示姓名（一级标题），## 表示各大分区（如：个人信息、工作经历、教育背景、技能等）
- 用 **加粗** 标注公司名、职位名、学校名等重要信息
- 用 - 列表展示技能、职责、成就等条目内容
- 联系方式等个人信息可用 | 分隔在一行
- 请直接返回优化后的 Markdown 简历全文，不要包含任何解释说明或代码块标记（不要用 \`\`\`markdown 包裹）`;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  let body: {
    resumeContent: string;
    jobDescription?: string;
    resumeId: string;
    appliedSuggestions?: Array<{
      category: string;
      original_text: string | null;
      suggested_text: string | null;
      reason: string | null;
    }>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }

  const { resumeContent, jobDescription, resumeId, appliedSuggestions } = body;
  if (!resumeContent || !resumeId) {
    return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
  }

  // Verify the resume belongs to the user
  const resumeRows = await sql<{ id: string }[]>`
    SELECT id FROM resumes WHERE id = ${resumeId} AND user_id = ${session.user.id}
  `;
  if (resumeRows.length === 0) {
    return NextResponse.json({ error: "简历不存在" }, { status: 404 });
  }

  // Build user message with applied suggestions
  let userMessage = `原始简历：\n${resumeContent}`;

  if (appliedSuggestions && appliedSuggestions.length > 0) {
    userMessage += "\n\n用户已采纳的优化建议：\n";
    appliedSuggestions.forEach((s, i) => {
      userMessage += `\n${i + 1}. 【${s.category}】`;
      if (s.original_text) userMessage += `\n   原文：${s.original_text}`;
      if (s.suggested_text)
        userMessage += `\n   建议修改为：${s.suggested_text}`;
      if (s.reason) userMessage += `\n   原因：${s.reason}`;
    });
    userMessage += "\n\n请严格按照以上采纳的建议对简历进行修改优化。";
  }

  if (jobDescription) {
    userMessage += `\n\n目标岗位描述：\n${jobDescription}`;
  }

  // Use SSE for streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      }

      sendEvent("status", {
        status: "optimizing",
        message: "AI正在生成优化简历...",
      });

      try {
        const completionStream = await client.chat.completions.create({
          model: "qwen-plus",
          messages: [
            { role: "system", content: OPTIMIZE_SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
          stream: true,
        });

        let fullContent = "";

        for await (const chunk of completionStream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            sendEvent("chunk", { text: delta });
          }
        }

        // Save optimized content to database
        await sql`
          UPDATE resumes
          SET optimized_content = ${fullContent}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${resumeId}
        `;

        sendEvent("done", { status: "completed" });
      } catch (error) {
        console.error("AI optimize error:", error);
        sendEvent("error", { message: "AI优化失败，请稍后重试" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
