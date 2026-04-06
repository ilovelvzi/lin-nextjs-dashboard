'use server';
import postgres from 'postgres';
import type { Resume, ResumeSuggestion, ResumeReport } from './definitions';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

export async function fetchUserResumes(userId: string): Promise<Resume[]> {
  try {
    const rows = await sql<Resume[]>`
      SELECT id, user_id, title, original_content, optimized_content,
             job_description, score, status,
             created_at::text, updated_at::text
      FROM resumes
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    return rows;
  } catch (error) {
    console.error('Database Error:', error);
    return [];
  }
}

export async function fetchResumeById(id: string): Promise<Resume | null> {
  try {
    const rows = await sql<Resume[]>`
      SELECT id, user_id, title, original_content, optimized_content,
             job_description, score, status,
             created_at::text, updated_at::text
      FROM resumes
      WHERE id = ${id}
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database Error:', error);
    return null;
  }
}

export async function fetchResumeReport(resumeId: string): Promise<ResumeReport | null> {
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
    console.error('Database Error:', error);
    return null;
  }
}

export async function fetchResumeSuggestions(resumeId: string): Promise<ResumeSuggestion[]> {
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
    console.error('Database Error:', error);
    return [];
  }
}
