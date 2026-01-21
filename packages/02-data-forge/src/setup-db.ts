/**
 * 数据库初始化脚本：创建 documents 表和向量索引
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// 从项目根目录加载 .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const SETUP_SQL = `
-- 1. 启用 vector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. 创建文档表 (2048 维适配智谱 embedding-3，无索引避免维度限制)
CREATE TABLE IF NOT EXISTS documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding VECTOR(2048),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 创建检索函数
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding VECTOR(2048),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id BIGINT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
`;

async function setupDatabase() {
  console.log("正在初始化数据库...\n");
  console.log(`Supabase URL: ${SUPABASE_URL}`);

  // 尝试通过 Supabase 的 SQL API 执行
  // 注意：这个端点可能需要特定权限
  const endpoints = [
    "/rest/v1/rpc/exec_sql", // 自定义函数方式
    "/pg/query", // 内部 API
    "/sql", // 另一个可能的端点
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n尝试端点: ${endpoint}`);
      const response = await fetch(`${SUPABASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({ query: SETUP_SQL, sql: SETUP_SQL }),
      });

      const text = await response.text();
      console.log(`状态: ${response.status}`);

      if (response.ok) {
        console.log("✅ 执行成功!");
        console.log(text);
        return true;
      } else {
        console.log(`响应: ${text.slice(0, 200)}`);
      }
    } catch (error) {
      console.log(`错误: ${error}`);
    }
  }

  return false;
}

async function main() {
  const success = await setupDatabase();

  if (!success) {
    console.log("\n" + "=".repeat(50));
    console.log("❌ 无法通过 API 执行建表 SQL");
    console.log("=".repeat(50));
    console.log("\n请手动在 Supabase Dashboard 执行：");
    console.log("1. 打开 https://supabase.com/dashboard");
    console.log("2. 选择项目 → SQL Editor");
    console.log("3. 粘贴以下 SQL 并执行：");
    console.log("\n" + SETUP_SQL);
  }
}

main();
