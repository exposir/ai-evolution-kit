/**
 * Chapter 1: Bare Metal Chat (Stream Version)
 * 目标：基于 Ch1 基础，实现流式 (Stream) 响应，提升用户体验。
 *
 * 核心要点：
 * 1. 设置 stream: true 开启流式模式
 * 2. 使用 for await...of 循环处理数据流
 * 3. 实时输出字符到 stdout (process.stdout.write)
 * 4. 拼接完整回复以维护上下文
 *
 * @module 01-runtime-lab/01-chat-stream
 * [INPUT]: openai (ChatCompletion API), dotenv (环境变量), readline (终端交互)
 * [OUTPUT]: 独立可执行脚本，无对外导出
 * [POS]: Runtime Lab Ch1 的进阶版本，演示生产环境中更常见的流式交互
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import path from "node:path";
import dotenv from "dotenv";

// 尝试加载根目录的 .env 文件
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
import * as readline from "node:readline";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// 初始化 OpenAI 客户端
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

// 维护对话历史
const messages: ChatCompletionMessageParam[] = [];

// 创建 readline 接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// 流式聊天函数
async function chatStream(userInput: string): Promise<string> {
  // 1. 将用户输入添加到历史
  messages.push({ role: "user", content: userInput });

  // 2. 调用 OpenAI API (开启 stream 模式)
  const stream = await openai.chat.completions.create({
    model: process.env.CHAT_MODEL || "gpt-4o",
    messages: messages,
    stream: true, // <--- 关键点
  });

  let fullResponse = "";
  process.stdout.write("AI: "); // 先打印前缀

  // 3. 处理流式响应
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    const finishReason = chunk.choices[0]?.finish_reason;

    // 处理内容
    if (delta?.content) {
      process.stdout.write(delta.content);
      fullResponse += delta.content;
    }

    // 处理拒绝 (安全过滤)
    if (delta?.refusal) {
      console.log(`\n[Safety Refusal]: ${delta.refusal}`);
      fullResponse += `(Refused: ${delta.refusal})`;
    }

    // 检查结束原因
    if (finishReason === "content_filter") {
      console.log("\n[Warning]: Response cut off by content filter.");
    }
  }

  process.stdout.write("\n"); // 换行

  // 4. 空响应处理与历史记录
  if (!fullResponse.trim()) {
    console.log("[Info] AI 返回了空内容 (可能是思考时间过长或被过滤)");
  }

  messages.push({ role: "assistant", content: fullResponse });

  return fullResponse;
}

// 提问函数
function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    // rl.question 是做什么的？
    // 它负责先把提示符（Prompt）画在屏幕上，然后拦截输入流，
    // 直到用户敲回车，才把控制权交还给你。
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// 主循环
async function main() {
  console.log("=".repeat(50));
  console.log("  Chapter 1: Bare Metal Chat (Stream Mode)");
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

    if (!userInput.trim()) {
      continue;
    }

    try {
      // 在 chatStream 内部已经处理了 console 输出
      await chatStream(userInput);
      console.log(); // 额外的空行分隔
    } catch (error) {
      console.error("Error:", error);
    }
  }
}

main();

// 哥，关于终端输出的机制，这里有一个关键的区别点。
// 在这个流式（Stream）交互的实现中，我们并没有只用 console，而是混合使用了更底层的 process.stdout.write。
//
// 1. console.log (宏观层 - "喊话"):
//    - 特点：每次输出自动换行 (newline)。
//    - 用途：用于打印系统信息、分割线、错误警告等块状内容（如 main 函数中的 UI）。
//
// 2. process.stdout.write (微观层 - "绣花"):
//    - 特点：不自动换行，光标停留在字符后。
//    - 用途：这是实现 LLM "打字机效果" 的核心。
//      因为 AI 是按 Token 流式吐字的，如果用 console.log，屏幕会瞬间被单字刷屏。
//      必须用 stdout.write 才能让字符无缝拼接，形成流畅的阅读体验。
//
// 3. 侦探视角 - 调用关系解密：
//    其实 console.log 只是一个封装好的工人类（Console Class）。
//    当你调用 console.log 时，它在内部通过 util.format 格式化字符串后，
//    最终调用的恰恰就是 process.stdout.write 并补上一个 '\n'。
//
//    - process.stdout 是通往终端的裸光缆（Stream）。
//    - console 是光缆上的扬声器（Formatter）。

/**
 * 目标：手写一个 MiniConsole，揭示 console.log 的底层原理
 *
 * 核心原理：
 * 1. **格式化 (Formatting)**:
 *    它首先调用 Node.js 内部的 `util.format(...args)`。这个函数负责处理占位符（如 %s, %d）
 *    并将对象转换为字符串表示。这是 console.log 能打印任意类型数据的秘密。
 *
 * 2. **写入流 (Stream Writing)**:
 *    格式化后的字符串被传递给 stdout 流。
 *
 * 3. **追加换行 (Newline)**:
 *    最关键的一步，console.log 会在最后强制追加一个 `\n` 换行符，
 *    然后调用 `process.stdout.write(finalString)`。
 *
 * 简而言之：`console.log` = `util.format` + `process.stdout.write` + `\n`
 */

// import * as util from "node:util";

// class MiniConsole {
//   private stdout: NodeJS.WriteStream;

//   constructor(stdout: NodeJS.WriteStream) {
//     this.stdout = stdout;
//   }

//   log(...args: any[]): void {
//     // 1. 格式化：将任意参数转换成字符串 (这也是 console.log 支持 %s %d 的原因)
//     // util.format 是 Node.js 内部用来处理字符串格式化的核心工具
//     const formatted = util.format(...args);

//     // 2. 写入流：直接调用物理层的 write 方法，并手动补上换行符
//     this.stdout.write(formatted + "\n");
//   }
// }

// // === 现场演示 ===

// const myConsole = new MiniConsole(process.stdout);

// console.log("--- 标准 console.log ---");
// console.log("Hello", "World", { a: 1 });

// console.log("\n--- 我们手写的 MiniConsole ---");
// myConsole.log("Hello", "Mini", { a: 1 });

// console.log(
//   "\n[验证] 所谓的 console.log，真的只是 stdout.write 加个回车而已。"
// );
