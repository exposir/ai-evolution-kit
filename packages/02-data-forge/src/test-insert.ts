/**
 * 测试脚本：直接往 Supabase 插入数据（绕过 Embedding）
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// 从项目根目录加载 .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// 生成假的 2048 维向量（智谱 embedding-3）
const fakeEmbedding = Array(2048)
  .fill(0)
  .map(() => Math.random() - 0.5);

const testData = [
  {
    content: "这是第一条测试数据：AI Evolution Kit 是一个前端转 AI 的学习项目。",
    metadata: { source: "test", chapter: 10 },
    embedding: fakeEmbedding,
  },
  {
    content: "这是第二条测试数据：Supabase 是开源的 Firebase 替代品。",
    metadata: { source: "test", chapter: 10 },
    embedding: fakeEmbedding,
  },
  {
    content: "这是第三条测试数据：pgvector 扩展让 PostgreSQL 支持向量检索。",
    metadata: { source: "test", chapter: 10 },
    embedding: fakeEmbedding,
  },
];

async function main() {
  console.log("正在插入测试数据到 Supabase...\n");

  const { data, error } = await supabase
    .from("documents")
    .insert(testData)
    .select("id, content");

  if (error) {
    console.error("插入失败:", error.message);
    process.exit(1);
  }

  console.log("✅ 插入成功！插入的记录：\n");
  data?.forEach((row) => {
    console.log(`  ID ${row.id}: ${row.content.slice(0, 40)}...`);
  });

  // 验证总数
  const { count } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true });

  console.log(`\n📊 documents 表当前共有 ${count} 条记录`);
  console.log("\n👉 现在去 Supabase 后台查看：");
  console.log(
    "   https://supabase.com/dashboard → 选择项目 → Table Editor → documents"
  );
}

main();
