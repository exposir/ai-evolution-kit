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
