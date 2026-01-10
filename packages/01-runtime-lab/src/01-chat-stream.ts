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

import path from 'node:path';
import dotenv from 'dotenv';

// 尝试加载根目录的 .env 文件
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
import * as readline from 'node:readline';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

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
  messages.push({ role: 'user', content: userInput });

  // 2. 调用 OpenAI API (开启 stream 模式)
  const stream = await openai.chat.completions.create({
    model: process.env.CHAT_MODEL || 'gpt-4o',
    messages: messages,
    stream: true, // <--- 关键点
  });

  let fullResponse = '';
  process.stdout.write('AI: '); // 先打印前缀

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
    if (finishReason === 'content_filter') {
      console.log('\n[Warning]: Response cut off by content filter.');
    }
  }

  process.stdout.write('\n'); // 换行

  // 4. 空响应处理与历史记录
  if (!fullResponse.trim()) {
    console.log('[Info] AI 返回了空内容 (可能是思考时间过长或被过滤)');
  }
  
  messages.push({ role: 'assistant', content: fullResponse });

  return fullResponse;
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
  console.log('  Chapter 1: Bare Metal Chat (Stream Mode)');
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
      // 在 chatStream 内部已经处理了 console 输出
      await chatStream(userInput);
      console.log(); // 额外的空行分隔
    } catch (error) {
      console.error('Error:', error);
    }
  }
}

main();
