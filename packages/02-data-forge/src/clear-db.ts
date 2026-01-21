/**
 * 清空 documents 表
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

async function clear() {
  const { error } = await supabase.from("documents").delete().neq("id", 0);
  if (error) {
    console.error("清空失败:", error);
  } else {
    console.log("documents 表已清空");
  }
}

clear();
