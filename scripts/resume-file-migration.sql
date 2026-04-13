-- ============================================================
-- 简历文件存储迁移
-- 为 resumes 表新增文件 URL、类型和 HTML 字段
-- 执行方式：psql $POSTGRES_URL -f scripts/resume-file-migration.sql
-- ============================================================

ALTER TABLE resumes ADD COLUMN IF NOT EXISTS original_file_url  VARCHAR(500);
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS original_file_type VARCHAR(10);
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS original_html      TEXT;
