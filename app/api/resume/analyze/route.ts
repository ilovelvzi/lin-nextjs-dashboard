import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import postgres from 'postgres';
import client from '@/app/lib/ai-client';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const SYSTEM_PROMPT = `你是一位专业的简历优化顾问，拥有丰富的招聘和人才评估经验。
请分析用户提供的简历内容，并给出详细的评分和优化建议。

请严格按照以下JSON格式返回分析结果，不要包含任何其他文字：
{
  "overall_score": <0-100的整数>,
  "content_score": <0-100的整数>,
  "format_score": <0-100的整数>,
  "keyword_score": <0-100的整数>,
  "experience_score": <0-100的整数>,
  "education_score": <0-100的整数>,
  "summary": "<总体评价，2-3句话>",
  "strengths": ["<优势1>", "<优势2>", "<优势3>"],
  "weaknesses": ["<不足1>", "<不足2>", "<不足3>"],
  "suggestions": [
    {
      "category": "<类别，如：工作经历、技能、教育背景、个人总结等>",
      "original_text": "<原文片段，可为null>",
      "suggested_text": "<建议修改后的文本>",
      "reason": "<修改原因>",
      "priority": "<high|medium|low>"
    }
  ]
}

评分标准：
- overall_score: 简历整体质量综合评分
- content_score: 内容完整性、准确性和相关性
- format_score: 格式规范性、可读性和视觉效果
- keyword_score: 关键词匹配度（如有岗位描述则与岗位匹配，否则评估行业关键词覆盖度）
- experience_score: 工作经历描述的质量和量化程度
- education_score: 教育背景完整性

suggestions中至少提供3条具体可操作的建议。`;

type AnalysisResult = {
  overall_score: number;
  content_score: number;
  format_score: number;
  keyword_score: number;
  experience_score: number;
  education_score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: Array<{
    category: string;
    original_text: string | null;
    suggested_text: string | null;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }>;
};

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

  // Mark resume as analyzing
  await sql`
    UPDATE resumes SET status = 'analyzing', updated_at = CURRENT_TIMESTAMP
    WHERE id = ${resumeId}
  `;

  const userMessage = jobDescription
    ? `简历内容：\n${resumeContent}\n\n目标岗位描述：\n${jobDescription}`
    : `简历内容：\n${resumeContent}`;

  // Use SSE for streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      }

      sendEvent('status', { status: 'analyzing', message: 'AI正在分析您的简历...' });

      try {
        const completion = await client.chat.completions.create({
          model: 'qwen-plus',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
          ],
          response_format: { type: 'json_object' },
        });

        const rawContent = completion.choices[0]?.message?.content ?? '{}';
        const analysis = JSON.parse(rawContent) as AnalysisResult;

        // Send report data
        sendEvent('report', {
          overall_score: analysis.overall_score ?? 0,
          content_score: analysis.content_score ?? 0,
          format_score: analysis.format_score ?? 0,
          keyword_score: analysis.keyword_score ?? 0,
          experience_score: analysis.experience_score ?? 0,
          education_score: analysis.education_score ?? 0,
          summary: analysis.summary ?? '',
          strengths: analysis.strengths ?? [],
          weaknesses: analysis.weaknesses ?? [],
        });

        // Save report to database
        await sql`
          INSERT INTO resume_reports (
            resume_id, overall_score, content_score, format_score,
            keyword_score, experience_score, education_score,
            summary, strengths, weaknesses
          ) VALUES (
            ${resumeId},
            ${analysis.overall_score ?? 0},
            ${analysis.content_score ?? 0},
            ${analysis.format_score ?? 0},
            ${analysis.keyword_score ?? 0},
            ${analysis.experience_score ?? 0},
            ${analysis.education_score ?? 0},
            ${analysis.summary ?? null},
            ${sql.array(analysis.strengths ?? [])},
            ${sql.array(analysis.weaknesses ?? [])}
          )
        `;

        // Send suggestions one by one with a small delay for progressive rendering
        const suggestions = analysis.suggestions ?? [];
        for (let i = 0; i < suggestions.length; i++) {
          const s = suggestions[i];

          // Save suggestion to database
          const rows = await sql<{ id: string }[]>`
            INSERT INTO resume_suggestions (
              resume_id, category, original_text, suggested_text, reason, priority
            ) VALUES (
              ${resumeId},
              ${s.category ?? '其他'},
              ${s.original_text ?? null},
              ${s.suggested_text ?? null},
              ${s.reason ?? null},
              ${s.priority ?? 'medium'}
            )
            RETURNING id
          `;

          sendEvent('suggestion', {
            id: rows[0].id,
            resume_id: resumeId,
            category: s.category ?? '其他',
            original_text: s.original_text ?? null,
            suggested_text: s.suggested_text ?? null,
            reason: s.reason ?? null,
            priority: s.priority ?? 'medium',
            is_applied: false,
            index: i,
            total: suggestions.length,
          });
        }

        // Update resume status and score
        await sql`
          UPDATE resumes
          SET status = 'completed', score = ${analysis.overall_score ?? 0}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${resumeId}
        `;

        sendEvent('done', { status: 'completed', score: analysis.overall_score ?? 0 });
      } catch (error) {
        console.error('AI analysis error:', error);
        await sql`
          UPDATE resumes SET status = 'failed', updated_at = CURRENT_TIMESTAMP
          WHERE id = ${resumeId}
        `;
        sendEvent('error', { message: 'AI分析失败，请稍后重试' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
