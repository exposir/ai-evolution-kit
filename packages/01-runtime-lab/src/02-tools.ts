/**
 * Chapter 2: Tool Definition (赋予能力)
 * 目标：教会 AI "看懂"工具的说明书（Schema），但不真正执行。
 *
 * 核心要点：
 * 1. 使用 Zod 定义工具参数 Schema
 * 2. 转换为 OpenAI 兼容的 JSON Schema
 * 3. 理解 AI 只会 "生成" 调用参数，不会真正执行
 *
 * @module 01-runtime-lab/02-tools
 * [INPUT]: openai (ChatCompletion + tools), zod (Schema 定义与验证)
 * [OUTPUT]: 独立可执行脚本，无对外导出
 * [POS]: Runtime Lab 第二章，引入 Tool 概念，展示 AI 如何"请求"调用工具
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import path from "node:path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
import * as readline from "node:readline";
import OpenAI from "openai";
import { z } from "zod";
// zod 是一个 TypeScript 优先的模式声明和验证库。
// 在这里，我们用它来：
// 1. 定义工具参数的结构 (Schema)
// 2. 运行时验证 AI 生成的 JSON 参数是否符合预期
// 它的妙处在于：写一次定义，既有了类型提示，又有了运行时检查。
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

// 使用 Zod 定义计算器工具的参数 Schema
const CalculatorSchema = z.object({
  // .describe() 非常关键：
  // 1. 生成文档：在转换为 JSON Schema 时，这些描述会告诉 AI 每个参数的含义
  // 2. 解析验证：在运行时，Zod 会验证 AI 传回来的数据是否符合这里的 number 类型
  a: z.number().describe("第一个数字"),
  b: z.number().describe("第二个数字"),
  operation: z
    .enum(["add", "subtract", "multiply", "divide"])
    .describe("运算操作"),
});

// 将 Zod Schema 转换为 OpenAI 兼容的 JSON Schema
// 注意：这里手动转换，也可以使用 zod-to-json-schema 库
const calculatorJsonSchema = {
  type: "object" as const,
  properties: {
    a: { type: "number", description: "第一个数字" },
    b: { type: "number", description: "第二个数字" },
    operation: {
      type: "string",
      enum: ["add", "subtract", "multiply", "divide"],
      description: "运算操作",
    },
  },
  required: ["a", "b", "operation"],
};

// 定义工具列表
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "calculator",
      description: "执行基本的数学运算：加减乘除",
      parameters: calculatorJsonSchema,
    },
  },
];

const messages: ChatCompletionMessageParam[] = [];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function chat(userInput: string) {
  messages.push({ role: "user", content: userInput });

  const response = await openai.chat.completions.create({
    // [核心] 模型 ID
    // OpenAI: gpt-4o, gpt-3.5-turbo
    // DeepSeek: deepseek-chat (V3), deepseek-reasoner (R1)
    // Qwen: qwen-turbo, qwen-plus, qwen-max
    // Moonshot: moonshot-v1-8k, moonshot-v1-32k
    // GLM: glm-4, glm-3-turbo
    model: process.env.CHAT_MODEL || "gpt-4o",

    // [核心] 消息列表
    // 格式: { role: "system" | "user" | "assistant" | "tool", content: ... }
    // 注意: DeepSeek/Moonshot/Qwen 暂不支持 "developer" role (OpenAI O1 专用)
    // 注意: 视觉模型(Vision)才支持 content 为 array 包含 image_url
    messages: messages,

    // [核心] 工具定义
    // 支持: OpenAI, DeepSeek, Qwen, GLM-4, Moonshot
    // 限制: DeepSeek V2, Baichuan 等早期版本可能不支持 parallel_tool_calls
    tools: tools,

    // ====== 可选参数 & 兼容性指南 (OpenAI / DeepSeek / Qwen / GLM / Moonshot) ======

    // [通用] 频率惩罚 (-2.0 到 2.0)
    // 支持: OpenAI, DeepSeek, Qwen, GLM-4, Moonshot
    // frequency_penalty: 0,

    // [限制] Logit Bias (修改特定 Token 概率)
    // 支持: OpenAI, Qwen
    // 不支持/忽略: DeepSeek, Moonshot, GLM
    // logit_bias: {},

    // [限制] Log Probabilities (返回 Token 概率)
    // 支持: OpenAI, Qwen (部分)
    // 不支持: DeepSeek, Moonshot
    // logprobs: false,
    // top_logprobs: null,

    // [通用] Max Tokens (最大生成长度)
    // 支持: 所有主流模型
    // max_tokens: null,

    // [通用] N (生成候选数量)
    // 支持: OpenAI
    // 限制: 大多数国产模型仅支持 n=1
    // n: 1,

    // [通用] 存在惩罚 (-2.0 到 2.0)
    // 支持: OpenAI, DeepSeek, Qwen, GLM-4
    // presence_penalty: 0,

    // [重要] Response Format (JSON 模式)
    // 支持: OpenAI (json_object), DeepSeek (Beta), Qwen, GLM-4, Moonshot
    // 注意: 使用时必须在 Prompt 中也明确要求 "输出 JSON"
    // response_format: { type: "text" },

    // [限制] Seed (随机种子/确定性输出)
    // 支持: OpenAI, Qwen
    // 不支持: DeepSeek, Moonshot
    // seed: null,

    // [特定] Service Tier
    // 仅 OpenAI 支持
    // service_tier: null,

    // [通用] Stop (停止序列)
    // 支持: 所有主流模型
    // stop: null,

    // [通用] Stream (流式输出)
    // 支持: 所有主流模型
    // stream: false,
    // stream_options: null, // OpenAI 特有 (如 include_usage)

    // [通用] Temperature (随机性 0-2)
    // 支持: 所有主流模型 (部分模型上限为 1.0)
    // temperature: 1,

    // [通用] Top P (核采样 0-1)
    // 支持: 所有主流模型 (建议与 temperature 二选一)
    // top_p: 1,

    // [重要] Tool Choice (工具调用控制)
    // 支持: OpenAI, DeepSeek, Qwen, GLM-4, Moonshot
    // 模式: "auto" (默认), "none", "required", 或指定 { type: "function", ... }
    // tool_choice: "auto",

    // [限制] Parallel Tool Calls (并行工具调用)
    // 支持: OpenAI, DeepSeek (V2.5+), Qwen, GLM-4
    // 不支持: 较旧的开源模型
    // parallel_tool_calls: true,

    // [其他] 用户标识
    // user: "user-id",
  });

  const choice = response.choices[0];
  const message = choice.message;

  // 检查 AI 是否想要调用工具
  if (message.tool_calls && message.tool_calls.length > 0) {
    console.log("\n[AI 想要调用工具]");
    for (const toolCall of message.tool_calls) {
      console.log(`  工具名称: ${toolCall.function.name}`);
      console.log(`  参数: ${toolCall.function.arguments}`);

      // 使用 Zod 验证参数
      const args = JSON.parse(toolCall.function.arguments);
      const parsed = CalculatorSchema.safeParse(args);
      if (parsed.success) {
        console.log(`  Zod 验证: 通过 ✓`);
        console.log(
          `  解析结果: a=${parsed.data.a}, b=${parsed.data.b}, op=${parsed.data.operation}`
        );
      } else {
        console.log(`  Zod 验证: 失败 ✗`);
        console.log(`  错误: ${parsed.error.message}`);
      }
    }
    console.log(
      '\n[注意] AI 只是 "请求" 调用工具，实际执行需要我们在代码中实现。'
    );
    console.log("[注意] 这就是下一章 (Chapter 3: The Loop) 要解决的问题。\n");
  } else {
    // AI 直接回复文本
    console.log(`AI: ${message.content}\n`);
  }

  // 将 AI 回复添加到历史
  messages.push(message);
}

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function main() {
  console.log("=".repeat(50));
  console.log("  第二章: 工具定义");
  console.log('  尝试问: "1 加 1 等于几" 或 "帮我计算 100 除以 5"');
  console.log('  输入 "exit" 退出');
  console.log("=".repeat(50));
  console.log();

  while (true) {
    const userInput = await prompt("You: ");

    if (userInput.toLowerCase() === "exit") {
      console.log("再见！");
      rl.close();
      break;
    }

    if (!userInput.trim()) continue;

    try {
      await chat(userInput);
    } catch (error) {
      console.error("错误:", error);
    }
  }
}

main();
