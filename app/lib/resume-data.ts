"use server";
import type { ResumeSuggestion, ResumeReport } from "./definitions";
import sql from "./db";

export async function fetchResumeReport(
  resumeId: string,
): Promise<ResumeReport | null> {
  try {
    const rows = await sql<ResumeReport[]>`
      SELECT id, resume_id, overall_score, content_score, format_score,
             keyword_score, experience_score, education_score,
             summary, strengths, weaknesses, created_at::text
      FROM resume_reports
      WHERE resume_id = ${resumeId}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch (error) {
    console.error("Database Error:", error);
    return null;
  }
}

export async function fetchResumeSuggestions(
  resumeId: string,
): Promise<ResumeSuggestion[]> {
  try {
    const rows = await sql<ResumeSuggestion[]>`
      SELECT id, resume_id, category, original_text, suggested_text,
             reason, priority, is_applied, created_at::text
      FROM resume_suggestions
      WHERE resume_id = ${resumeId}
      ORDER BY
        CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        created_at ASC
    `;
    return rows;
  } catch (error) {
    console.error("Database Error:", error);
    return [];
  }
}
