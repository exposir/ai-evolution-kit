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
    model: process.env.CHAT_MODEL || "gpt-4o", // 要使用的模型 ID (如 gpt-4o, gpt-3.5-turbo)
    messages: messages, // 迄今为止的对话消息列表
    tools: tools, // 模型可以调用的工具列表 (目前仅支持 type: "function")
    // ====== 可选参数 (完整列表) ======
    // frequency_penalty: 0, // 频率惩罚，降低模型重复相同内容的概率 (-2.0 到 2.0)
    // logit_bias: {}, //因为: 修改特定 token 出现的概率
    // logprobs: false, // 是否返回 log probabilities
    // top_logprobs: null, // 如果 logprobs 为 true，返回前 N 个 token 的 log probabilities (0-20)
    // max_tokens: null, // 生成的最大 token 数
    // n: 1, // 为每个 prompt 生成多少个 completion
    // presence_penalty: 0, // 存在惩罚，鼓励模型谈论新主题 (-2.0 到 2.0)
    // response_format: { type: "text" }, // 指定输出格式，如 { type: "json_object" }
    // seed: null, // 随机数种子，用于尽量保证确定性输出
    // service_tier: null, // 指定服务层级 (如 "auto", "default")
    // stop: null, // 停止序列，可以是 string 或 string[]
    // stream: false, // 是否流式输出
    // stream_options: null, // 流式输出的选项
    // temperature: 1, // 采样温度，控制随机性 (0 到 2)
    // top_p: 1, // 核采样 (Nucleus sampling)，与 temperature 二选一 (0 到 1)
    // tool_choice: "auto", // 控制是否/如何调用工具 ("none", "auto", "required", 或指定工具)
    // parallel_tool_calls: true, // 是否允许并行工具调用
    // user: "user-id", // 最终用户的唯一标识，用于监控和检测滥用
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
  console.log("  Chapter 2: Tool Definition");
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
      console.error("Error:", error);
    }
  }
}

main();
