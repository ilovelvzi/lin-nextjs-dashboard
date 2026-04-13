"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import postgres from "postgres";
import { z } from "zod";
import type { Resume } from "./definitions";

const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require" });

const CreateResumeSchema = z.object({
  title: z.string().min(1, { message: "请输入简历标题。" }).max(255),
  originalContent: z
    .string()
    .min(10, { message: "简历内容太短，请输入更多内容。" }),
  jobDescription: z.string().optional(),
  fileUrl: z.string().optional(),
  fileType: z.enum(["pdf", "docx"]).optional(),
  originalHtml: z.string().optional(),
});

export async function createResume(
  formData: FormData,
): Promise<{ id: string } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "未登录，请先登录。" };
  }

  const validated = CreateResumeSchema.safeParse({
    title: formData.get("title"),
    originalContent: formData.get("originalContent"),
    jobDescription: formData.get("jobDescription") || undefined,
    fileUrl: formData.get("fileUrl") || undefined,
    fileType: formData.get("fileType") || undefined,
    originalHtml: formData.get("originalHtml") || undefined,
  });

  if (!validated.success) {
    const fieldErrors = validated.error.flatten().fieldErrors;
    const firstError =
      fieldErrors.title?.[0] ||
      fieldErrors.originalContent?.[0] ||
      fieldErrors.jobDescription?.[0] ||
      "输入验证失败。";
    return { error: firstError };
  }

  const { title, originalContent, jobDescription, fileUrl, fileType, originalHtml } = validated.data;

  try {
    const rows = await sql<{ id: string }[]>`
      INSERT INTO resumes (user_id, title, original_content, job_description, status, original_file_url, original_file_type, original_html)
      VALUES (
        ${session.user.id},
        ${title},
        ${originalContent},
        ${jobDescription ?? null},
        'pending',
        ${fileUrl ?? null},
        ${fileType ?? null},
        ${originalHtml ?? null}
      )
      RETURNING id
    `;
    revalidatePath("/dashboard/resume");
    return { id: rows[0].id };
  } catch (error) {
    console.error("Database Error:", error);
    return { error: "数据库错误：创建简历失败。" };
  }
}

export async function deleteResume(id: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  try {
    await sql`
      DELETE FROM resumes
      WHERE id = ${id} AND user_id = ${session.user.id}
    `;
    revalidatePath("/dashboard/resume");
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("删除简历失败。");
  }
}

export async function applyOptimization(
  suggestionId: string,
  resumeId: string,
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  try {
    await sql`
      UPDATE resume_suggestions
      SET is_applied = TRUE
      WHERE id = ${suggestionId}
        AND resume_id = ${resumeId}
    `;
    revalidatePath(`/dashboard/resume/${resumeId}`);
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("采纳建议失败。");
  }
}

export async function unapplyOptimization(
  suggestionId: string,
  resumeId: string,
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  try {
    await sql`
      UPDATE resume_suggestions
      SET is_applied = FALSE
      WHERE id = ${suggestionId}
        AND resume_id = ${resumeId}
    `;
    revalidatePath(`/dashboard/resume/${resumeId}`);
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("撤销建议失败。");
  }
}

export async function batchApplyOptimizations(
  suggestionIds: string[],
  resumeId: string,
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  if (suggestionIds.length === 0) return;

  try {
    await sql`
      UPDATE resume_suggestions
      SET is_applied = TRUE
      WHERE id = ANY(${suggestionIds as string[]})
        AND resume_id = ${resumeId}
    `;
    revalidatePath(`/dashboard/resume/${resumeId}`);
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("批量采纳建议失败。");
  }
}

export async function getResumeById(id: string): Promise<Resume | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  try {
    const rows = await sql<Resume[]>`
      SELECT id, user_id, title, original_content, optimized_content,
             job_description, score, status,
             original_file_url, original_file_type, original_html,
             created_at::text, updated_at::text
      FROM resumes
      WHERE id = ${id} AND user_id = ${session.user.id}
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch (error) {
    console.error("Database Error:", error);
    return null;
  }
}

export async function getUserResumes(): Promise<Resume[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  try {
    const rows = await sql<Resume[]>`
      SELECT id, user_id, title, original_content, optimized_content,
             job_description, score, status,
             created_at::text, updated_at::text
      FROM resumes
      WHERE user_id = ${session.user.id}
      ORDER BY created_at DESC
    `;
    return rows;
  } catch (error) {
    console.error("Database Error:", error);
    return [];
  }
}
