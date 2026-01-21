/**
 * 直接用 fetch 调用智谱 embedding API 查看原始响应
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

async function test() {
  const url = `${process.env.OPENAI_BASE_URL}/embeddings`;
  console.log("URL:", url);
  console.log("API Key:", process.env.OPENAI_API_KEY?.slice(0, 10) + "...");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "embedding-3",
      input: "测试文本",
    }),
  });

  const text = await response.text();
  console.log("\n状态码:", response.status);
  console.log("原始响应:", text.slice(0, 500));

  // 解析看看 embedding 数据
  try {
    const json = JSON.parse(text);
    if (json.data?.[0]?.embedding) {
      const emb = json.data[0].embedding;
      console.log("\n解析后:");
      console.log("  维度:", emb.length);
      console.log("  类型:", typeof emb[0]);
      console.log("  前 5 个:", emb.slice(0, 5));
    }
  } catch (e) {
    console.log("解析失败");
  }
}

test();
