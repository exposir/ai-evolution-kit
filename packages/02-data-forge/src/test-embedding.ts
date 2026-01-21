/**
 * 测试智谱 embedding API 返回值
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../../../.env");
console.log("ENV 路径:", envPath);
console.log("文件存在:", fs.existsSync(envPath));
dotenv.config({ path: envPath });

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

async function test() {
  console.log("API Key:", process.env.OPENAI_API_KEY?.slice(0, 10) + "...");
  console.log("Base URL:", process.env.OPENAI_BASE_URL);
  console.log();

  // 尝试不同的模型名
  const models = ["embedding-3", "embedding-2", "text_embedding"];

  for (const model of models) {
    try {
      console.log(`\n测试模型: ${model}`);
      const response = await openai.embeddings.create({
        model,
        input: "测试文本",
      });

      const embedding = response.data[0].embedding;
      console.log("  维度:", embedding.length);
      console.log("  前 5 个值:", embedding.slice(0, 5));
      console.log("  非零值:", embedding.filter((v) => v !== 0).length);
    } catch (e: any) {
      console.log("  错误:", e.message?.slice(0, 100));
    }
  }
}

test();
