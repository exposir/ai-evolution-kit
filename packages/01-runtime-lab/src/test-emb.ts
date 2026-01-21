/**
 * 在 01-runtime-lab 目录测试 embedding
 */
import dotenv from "dotenv";
import nodePath from "path";
import { fileURLToPath } from "url";

// 从项目根目录加载 .env
const __dirname = nodePath.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: nodePath.resolve(__dirname, "../../../.env") });

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

async function test() {
  console.log("API Key:", process.env.OPENAI_API_KEY?.slice(0, 10) + "...");
  console.log("Base URL:", process.env.OPENAI_BASE_URL);
  console.log("Model:", process.env.EMBEDDING_MODEL);

  const response = await openai.embeddings.create({
    model: process.env.EMBEDDING_MODEL || "embedding-3",
    input: "测试",
  });

  const emb = response.data[0].embedding;
  console.log("\n维度:", emb.length);
  console.log("前 5 个值:", emb.slice(0, 5));
  console.log("非零值数量:", emb.filter((v) => v !== 0).length);
}

test();
