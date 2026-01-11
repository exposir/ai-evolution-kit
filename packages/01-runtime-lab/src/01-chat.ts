/**
 * Chapter 1: Bare Metal Chat (你好，LLM)
 * 目标：建立与 OpenAI API 的第一条通信链路，并维持对话上下文。
 *
 * 核心要点：
 * 1. 使用 dotenv 加载 API Key
 * 2. 使用 readline 处理终端输入
 * 3. 维护 messages 数组实现上下文记忆
 *
 * @module 01-runtime-lab/01-chat
 * [INPUT]: openai (ChatCompletion API), dotenv (环境变量), readline (终端交互)
 * [OUTPUT]: 独立可执行脚本，无对外导出
 * [POS]: Runtime Lab 的第一章，演示最基础的 LLM 对话模式，后续章节在此基础上扩展
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import path from 'node:path';
import dotenv from 'dotenv';

// 尝试加载根目录的 .env 文件
// 假设当前运行目录 (CWD) 是 packages/01-runtime-lab
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
import * as readline from 'node:readline';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// 初始化 OpenAI 客户端
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

// 维护对话历史 - 这是实现上下文记忆的关键
const messages: ChatCompletionMessageParam[] = [];

// 创建 readline 接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// 聊天函数
async function chat(userInput: string): Promise<string> {
  // 将用户输入添加到历史
  messages.push({ role: 'user', content: userInput });

  // 调用 OpenAI API
  const response = await openai.chat.completions.create({
    model: process.env.CHAT_MODEL || 'gpt-4o',
    messages: messages,
  });

  // 获取 AI 回复
  const assistantMessage = response.choices[0].message.content ?? '';

  // 将 AI 回复也添加到历史，以便下一轮对话
  messages.push({ role: 'assistant', content: assistantMessage });

  return assistantMessage;
}

// 提问函数
function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// 主循环
async function main() {
  console.log('='.repeat(50));
  console.log('  Chapter 1: Bare Metal Chat');
  console.log('  输入 "exit" 退出');
  console.log('='.repeat(50));
  console.log();

  while (true) {
    const userInput = await prompt('You: ');

    if (userInput.toLowerCase() === 'exit') {
      console.log('再见！');
      rl.close();
      break;
    }

    if (!userInput.trim()) {
      continue;
    }

    try {
      const reply = await chat(userInput);
      console.log(`AI: ${reply}`);
      console.log();
    } catch (error) {
      console.error('Error:', error);
    }
  }
}

main();

// 哥，这段代码实现控制台交互的核心能力主要基于 Node.js 的原生模块 readline。
//
// 从本质（侦探视角）来看，它构建了一个极其简却完整的 REPL (Read-Eval-Print Loop) 循环：
//
// 1. 交互接口 (readline)：
//    代码第 37-40 行使用 readline.createInterface 建立了连接用户输入 (process.stdin) 和
//    屏幕输出 (process.stdout) 的桥梁。这是控制台交互的物理层基础。
//
// 2. 输入处理 (Input)：
//    代码第 63-69 行封装了一个 prompt 函数。它利用 rl.question 方法，但巧妙地将其包裹在
//    Promise 中。这让原本基于回调（Callback）的古老 API 能够适配现代的 async/await 语法
//    （第 80 行 await prompt('You: ')），实现了“暂停等待用户输入”的同步编程体验，通过这种方式
//    消除了回调地狱。
//
// 3. 输出呈现 (Output)：
//    简单的 console.log 负责将系统信息和 AI 的回复打印到标准输出流。
//
// 哲学评价：
// 这是实用主义（Pragmatism）的典范。没有引入像 inquirer 或 commander 这样厚重的第三方 CLI 库，
// 而是用标准库中最原始的工具，寥寥几行就构建了人机对话的本质——只是单纯的字节流在标准输入输出
// 之间的彼岸往返。简单的代码往往最能洞察对话的真谛。

// readline 的主要功能 (Node.js 原生模块)：
//
// 1. 逐行读取 (Line-by-Line Reading)：
//    这是它的看家本领。它专门用于从可读流（如 process.stdin）中一次读取一行数据，
//    自动处理并剥离各种换行符（\n, \r\n）。
//
// 2. 交互接口 (Interface)：
//    通过 createInterface()，它在输入流和输出流之间建立了一个高层抽象。
//    - 它监听输入流的 data 事件并将其转换为 friendly 的 line 事件。
//    - 哪怕在这么简单的代码中，它也默默提供了基础的终端能力，比如处理光标控制字符。
//
// 3. 提问与响应 (Question - REPL 核心)：
//    rl.question(query, callback) 是本代码实现对话的关键。它原子性地完成了三件事：
//    a. 打印提示符 (query) 到 output。
//    b. 阻塞等待（异步意义上的）用户输入直到回车。
//    c. 将捕获的字符串传给回调函数。
//
// 4. 用户体验增强 (UX)：
//    虽然本例未深度定制，但 readline 原生支持：
//    - 命令历史记录（按上下箭头翻阅之前的输入）。
//    - Tab 键自动补全 (Completer)。
//    - 信号处理（如 Ctrl+C 触发 SIGINT）。


// readline 的主要功能是读取和输出命令行？ 

// 哥，你抓住了核心，但还可以理解得更“底层”一点。
//
// Readline 本质上是一个 “流的转换器”和“交互的中介”。
//
// 1. 它不仅仅是“读”和“写”：
//    “读”和“写”的苦力活其实是 process.stdin (标准输入流) 和 process.stdout (标准输出流) 干的。
//
// 2. 它的真正价值在于“整理”和“控制”：
//    - 整理（Parsing）：标准输入流进来的其实是一堆原始的字节（Bytes）。Readline 负责盯着这些
//      字节，一旦发现 \n (换行符)，它就大喊一声：“这一行结束了！”，把积攒的字符打包成一句话
//      返给你。没有它，你收到的是碎散的字节流。
//    - 控制（Interface）：当你调用 rl.question 时，它负责先把提示符（Prompt）画在屏幕上，
//      然后拦截输入流，直到用户敲回车，才把控制权交还给你。
//
// 打个比方：
// 如果 process.stdin 是麦克风（只管收音），process.stdout 是喇叭（只管发声），
// 那么 Readline 就是那个主持人。他负责拿着麦克风说：“请这位观众提问（打印 Prompt）”，
// 听完你说的一整句后（Line buffering），再转述给嘉宾（你的代码）。