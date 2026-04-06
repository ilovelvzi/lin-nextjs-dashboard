import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import postgres from 'postgres';
import client from '@/app/lib/ai-client';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const OPTIMIZE_SYSTEM_PROMPT = `你是一位专业的简历写作专家。
请根据用户提供的简历内容（以及可选的目标岗位描述），生成一份经过优化的简历。

优化要求：
1. 保持原有的基本信息和工作经历的真实性，不虚构内容
2. 优化工作经历的描述，使用STAR法则（情境、任务、行动、结果），增加量化数据
3. 优化技能描述，突出与目标岗位最相关的技能
4. 改善语言表达，使用专业、简洁的措辞
5. 优化整体结构和格式，提高可读性
6. 加强关键词的使用，提高ATS系统通过率
7. 如果有目标岗位描述，重点优化与岗位要求匹配的部分

请直接返回优化后的简历全文，不要包含任何解释说明或额外格式。`;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  let body: { resumeContent: string; jobDescription?: string; resumeId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 });
  }

  const { resumeContent, jobDescription, resumeId } = body;
  if (!resumeContent || !resumeId) {
    return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
  }

  // Verify the resume belongs to the user
  const resumeRows = await sql<{ id: string }[]>`
    SELECT id FROM resumes WHERE id = ${resumeId} AND user_id = ${session.user.id}
  `;
  if (resumeRows.length === 0) {
    return NextResponse.json({ error: '简历不存在' }, { status: 404 });
  }

  const userMessage = jobDescription
    ? `原始简历：\n${resumeContent}\n\n目标岗位描述：\n${jobDescription}`
    : `原始简历：\n${resumeContent}`;

  try {
    const completion = await client.chat.completions.create({
      model: 'qwen-plus',
      messages: [
        { role: 'system', content: OPTIMIZE_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    });

    const optimizedContent = completion.choices[0]?.message?.content ?? '';

    // Save optimized content to database
    await sql`
      UPDATE resumes
      SET optimized_content = ${optimizedContent}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${resumeId}
    `;

    return NextResponse.json({ success: true, optimizedContent });
  } catch (error) {
    console.error('AI optimize error:', error);
    return NextResponse.json({ error: 'AI优化失败，请稍后重试' }, { status: 500 });
  }
}
