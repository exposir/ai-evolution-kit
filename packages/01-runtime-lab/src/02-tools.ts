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

import 'dotenv/config';
import * as readline from 'node:readline';
import OpenAI from 'openai';
import { z } from 'zod';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

// 使用 Zod 定义计算器工具的参数 Schema
const CalculatorSchema = z.object({
  a: z.number().describe('第一个数字'),
  b: z.number().describe('第二个数字'),
  operation: z.enum(['add', 'subtract', 'multiply', 'divide']).describe('运算操作'),
});

// 将 Zod Schema 转换为 OpenAI 兼容的 JSON Schema
// 注意：这里手动转换，也可以使用 zod-to-json-schema 库
const calculatorJsonSchema = {
  type: 'object' as const,
  properties: {
    a: { type: 'number', description: '第一个数字' },
    b: { type: 'number', description: '第二个数字' },
    operation: {
      type: 'string',
      enum: ['add', 'subtract', 'multiply', 'divide'],
      description: '运算操作',
    },
  },
  required: ['a', 'b', 'operation'],
};

// 定义工具列表
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'calculator',
      description: '执行基本的数学运算：加减乘除',
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
  messages.push({ role: 'user', content: userInput });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: messages,
    tools: tools, // 传入工具定义
  });

  const choice = response.choices[0];
  const message = choice.message;

  // 检查 AI 是否想要调用工具
  if (message.tool_calls && message.tool_calls.length > 0) {
    console.log('\n[AI 想要调用工具]');
    for (const toolCall of message.tool_calls) {
      console.log(`  工具名称: ${toolCall.function.name}`);
      console.log(`  参数: ${toolCall.function.arguments}`);

      // 使用 Zod 验证参数
      const args = JSON.parse(toolCall.function.arguments);
      const parsed = CalculatorSchema.safeParse(args);
      if (parsed.success) {
        console.log(`  Zod 验证: 通过 ✓`);
        console.log(`  解析结果: a=${parsed.data.a}, b=${parsed.data.b}, op=${parsed.data.operation}`);
      } else {
        console.log(`  Zod 验证: 失败 ✗`);
        console.log(`  错误: ${parsed.error.message}`);
      }
    }
    console.log('\n[注意] AI 只是 "请求" 调用工具，实际执行需要我们在代码中实现。');
    console.log('[注意] 这就是下一章 (Chapter 3: The Loop) 要解决的问题。\n');
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
  console.log('='.repeat(50));
  console.log('  Chapter 2: Tool Definition');
  console.log('  尝试问: "1 加 1 等于几" 或 "帮我计算 100 除以 5"');
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

    if (!userInput.trim()) continue;

    try {
      await chat(userInput);
    } catch (error) {
      console.error('Error:', error);
    }
  }
}

main();
