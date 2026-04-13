-- ============================================================
-- RAG 知识库 — 数据库 Schema（幂等，可反复执行）
-- 执行方式：psql $POSTGRES_URL -f scripts/migrate.sql
-- ============================================================

-- ─── 扩展 ────────────────────────────────────────────────────

-- pgvector：向量存储与相似度检索
CREATE EXTENSION IF NOT EXISTS vector;

-- pg_trgm：字符级三元组相似度，用于中文关键词检索
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── 表 ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS documents (
  id        BIGSERIAL PRIMARY KEY,
  content   TEXT    NOT NULL,
  embedding vector(1024),          -- DashScope text-embedding-v3，1024 维
  metadata  JSONB                   -- { source: string, chunk_index: number }
);

-- ─── 索引 ────────────────────────────────────────────────────

-- HNSW 向量索引（cosine 距离），大幅加速 ANN 搜索
-- ef_construction=128 / m=16 是常用均衡值，可按数据量调整
CREATE INDEX IF NOT EXISTS documents_embedding_hnsw_idx
  ON documents
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 128);

-- GIN 三元组索引，加速 pg_trgm similarity() 查询（中文关键词检索）
CREATE INDEX IF NOT EXISTS documents_content_trgm_idx
  ON documents
  USING gin (content gin_trgm_ops);

-- metadata source 字段索引，加速按文档名 DELETE / GROUP BY
CREATE INDEX IF NOT EXISTS documents_metadata_source_idx
  ON documents ((metadata->>'source'));

-- ─── 向量检索函数 ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION match_documents(
  query_embedding  vector(1024),
  match_threshold  float,
  match_count      int
)
RETURNS TABLE (
  content    text,
  metadata   jsonb,
  similarity float
)
LANGUAGE sql STABLE AS $$
  SELECT
    content,
    metadata,
    1 - (embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
