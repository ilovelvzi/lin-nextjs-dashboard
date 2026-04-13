import sql from "@/app/lib/db";

export async function GET() {
  try {
    await sql`
      ALTER TABLE resumes ADD COLUMN IF NOT EXISTS original_file_url  VARCHAR(500)
    `;
    await sql`
      ALTER TABLE resumes ADD COLUMN IF NOT EXISTS original_file_type VARCHAR(10)
    `;
    await sql`
      ALTER TABLE resumes ADD COLUMN IF NOT EXISTS original_html      TEXT
    `;
    return Response.json({ message: "迁移成功：resumes 表已添加文件相关字段" });
  } catch (error) {
    console.error("Migration error:", error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
