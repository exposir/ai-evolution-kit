/**
 * 检查 documents 表的 embedding 数据
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function check() {
  // 查询 documents 表
  const { data, error } = await supabase
    .from("documents")
    .select("id, content, embedding")
    .limit(1);

  if (error) {
    console.error("查询错误:", error);
    return;
  }

  if (data && data.length > 0) {
    const row = data[0];
    console.log("ID:", row.id);
    console.log("Content:", row.content?.slice(0, 50));
    console.log("Embedding 类型:", typeof row.embedding);
    console.log("Embedding 是否数组:", Array.isArray(row.embedding));

    if (row.embedding) {
      if (typeof row.embedding === 'string') {
        console.log("Embedding 前 100 字符:", row.embedding.slice(0, 100));
      } else if (Array.isArray(row.embedding)) {
        console.log("Embedding 长度:", row.embedding.length);
        console.log("Embedding 前 5 个值:", row.embedding.slice(0, 5));
      }
    }
  }
}

check();
