/**
 * Chapter 3: The Loop (Agent 原型)
 * 目标：实现"模型思考 -> 调用本地函数 -> 结果回传 -> 模型回答"的闭环。
 *
 * 核心要点：
 * 1. 实现 runTool(name, args) 函数执行真正的计算
 * 2. 实现 while 循环，直到 AI 完成回答
 * 3. 构造 role: 'tool' 消息将结果回传给 AI
 *
 * @module 01-runtime-lab/03-loop
 * [INPUT]: openai (ChatCompletion + tool_calls), zod (参数验证)
 * [OUTPUT]: 独立可执行脚本，无对外导出
 * [POS]: Runtime Lab 第三章，实现 ReAct 循环，是 Agent 的核心范式
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import 'dotenv/config';
import * as readline from 'node:readline';
import OpenAI from 'openai';
import { z } from 'zod';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 定义工具参数 Schema
const CalculatorSchema = z.object({
  a: z.number(),
  b: z.number(),
  operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
});

// 定义工具
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'calculator',
      description: '执行基本的数学运算：加减乘除',
      parameters: {
        type: 'object',
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
      },
    },
  },
];

/**
 * 执行工具的真正逻辑
 * 这就是 AI 的 "手" - 把 AI 的意图变成真正的操作
 */
function runTool(name: string, args: unknown): string {
  if (name === 'calculator') {
    const parsed = CalculatorSchema.parse(args);
    const { a, b, operation } = parsed;

    let result: number;
    switch (operation) {
      case 'add':
        result = a + b;
        break;
      case 'subtract':
        result = a - b;
        break;
      case 'multiply':
        result = a * b;
        break;
      case 'divide':
        if (b === 0) return 'Error: 除数不能为零';
        result = a / b;
        break;
    }

    console.log(`  [工具执行] calculator(${a}, ${b}, ${operation}) = ${result}`);
    return result.toString();
  }

  return `Error: 未知工具 ${name}`;
}

const messages: ChatCompletionMessageParam[] = [];

/**
 * 核心循环：ReAct Pattern
 * 不断循环直到 AI 完成回答（finish_reason === 'stop'）
 */
async function chat(userInput: string): Promise<string> {
  messages.push({ role: 'user', content: userInput });

  // 进入 Agent 循环
  while (true) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      tools: tools,
    });

    const choice = response.choices[0];
    const message = choice.message;

    // 将 AI 的消息添加到历史
    messages.push(message);

    // 检查是否需要调用工具
    if (choice.finish_reason === 'tool_calls' && message.tool_calls) {
      console.log('\n[AI 请求调用工具]');

      // 处理每个工具调用
      for (const toolCall of message.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        console.log(`  工具: ${toolName}`);
        console.log(`  参数: ${JSON.stringify(toolArgs)}`);

        // 执行工具
        const toolResult = runTool(toolName, toolArgs);

        // 构造 tool 消息，将结果回传给 AI
        // 注意：必须包含 tool_call_id，这是 OpenAI API 的要求
        const toolMessage: ChatCompletionMessageParam = {
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolResult,
        };

        messages.push(toolMessage);
      }

      // 继续循环，让 AI 处理工具结果
      console.log('[继续调用 AI...]\n');
      continue;
    }

    // finish_reason === 'stop'，AI 完成回答
    if (choice.finish_reason === 'stop') {
      return message.content ?? '';
    }

    // 其他情况（不应该发生）
    return message.content ?? '';
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function main() {
  console.log('='.repeat(50));
  console.log('  Chapter 3: The Loop (Agent 原型)');
  console.log('  现在 AI 可以真正 "执行" 计算了！');
  console.log('  尝试: "计算 123 + 456" 或 "100 除以 7 等于多少"');
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
      const reply = await chat(userInput);
      console.log(`AI: ${reply}\n`);
    } catch (error) {
      console.error('Error:', error);
    }
  }
}

main();
