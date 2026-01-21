/**
 * 测试向量检索 RPC
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

async function test() {
  // 生成查询向量
  const resp = await openai.embeddings.create({
    model: process.env.EMBEDDING_MODEL || "embedding-3",
    input: "AI",
  });
  const queryEmbedding = resp.data[0].embedding;
  console.log("向量维度:", queryEmbedding.length);

  // 调用 RPC
  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_threshold: 0.1, // 很低的阈值
    match_count: 5,
  });

  if (error) {
    console.error("RPC 错误:", error);
    return;
  }

  console.log("原始返回:", JSON.stringify(data, null, 2));
  if (data && data.length > 0) {
    data.forEach((row: any, i: number) => {
      console.log(`\n[${i + 1}] ID: ${row.id}`);
      console.log(`    相似度: ${(row.similarity * 100).toFixed(2)}%`);
      console.log(`    内容: ${row.content?.slice(0, 80)}...`);
    });
  } else {
    console.log("无结果");
  }
}

test();
