/**
 * Chapter 4: System Interface (赋予实权)
 * 目标：让 AI 突破沙盒，操作真实的文件系统。
 *
 * 核心要点：
 * 1. 定义 list_files 和 read_file 工具
 * 2. 使用 Node.js fs 模块读取真实文件
 * 3. 添加安全日志，让你知道 AI 正在操作什么
 *
 * @module 01-runtime-lab/04-system
 * [INPUT]: openai (ChatCompletion), node:fs + node:path (文件系统操作)
 * [OUTPUT]: 独立可执行脚本，无对外导出
 * [POS]: Runtime Lab 第四章，演示 AI 如何安全地操作真实系统资源
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import 'dotenv/config';
import * as readline from 'node:readline';
import * as fs from 'node:fs';
import * as path from 'node:path';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

// 定义文件系统工具
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: '列出指定目录下的所有文件和文件夹',
      parameters: {
        type: 'object',
        properties: {
          directory: {
            type: 'string',
            description: '目录路径，默认为当前目录',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: '读取文件内容',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: '文件路径',
          },
        },
        required: ['path'],
      },
    },
  },
];

/**
 * 执行文件系统工具
 * 安全警告：这些操作会读取你的真实文件！
 */
function runTool(name: string, args: Record<string, unknown>): string {
  // 安全日志 - 让你知道 AI 正在干什么
  console.log(`\n  ⚠️  [安全警告] AI 正在执行: ${name}`);
  console.log(`      参数: ${JSON.stringify(args)}`);

  try {
    if (name === 'list_files') {
      const dir = (args.directory as string) || process.cwd();
      const resolvedDir = path.resolve(dir);
      console.log(`      解析路径: ${resolvedDir}`);

      const files = fs.readdirSync(resolvedDir);
      const result = files.map((file) => {
        const filePath = path.join(resolvedDir, file);
        const stat = fs.statSync(filePath);
        return {
          name: file,
          type: stat.isDirectory() ? 'directory' : 'file',
          size: stat.size,
        };
      });

      return JSON.stringify(result, null, 2);
    }

    if (name === 'read_file') {
      const filePath = args.path as string;
      const resolvedPath = path.resolve(filePath);
      console.log(`      解析路径: ${resolvedPath}`);

      // 安全检查：限制文件大小
      const stat = fs.statSync(resolvedPath);
      if (stat.size > 1024 * 100) {
        return 'Error: 文件太大（超过 100KB），拒绝读取';
      }

      const content = fs.readFileSync(resolvedPath, 'utf-8');
      return content;
    }

    return `Error: 未知工具 ${name}`;
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

const messages: ChatCompletionMessageParam[] = [
  {
    role: 'system',
    content: `你是一个文件系统助手。你可以帮用户查看目录和读取文件。
当用户询问文件相关的问题时，使用提供的工具来获取信息。
当前工作目录是: ${process.cwd()}`,
  },
];

async function chat(userInput: string): Promise<string> {
  messages.push({ role: 'user', content: userInput });

  while (true) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      tools: tools,
    });

    const choice = response.choices[0];
    const message = choice.message;
    messages.push(message);

    if (choice.finish_reason === 'tool_calls' && message.tool_calls) {
      console.log('\n[AI 请求访问文件系统]');

      for (const toolCall of message.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        const toolResult = runTool(toolName, toolArgs);

        const toolMessage: ChatCompletionMessageParam = {
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolResult,
        };
        messages.push(toolMessage);
      }

      console.log('\n[继续处理...]\n');
      continue;
    }

    if (choice.finish_reason === 'stop') {
      return message.content ?? '';
    }

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
  console.log('  Chapter 4: System Interface');
  console.log('  AI 现在可以读取你的文件了！');
  console.log('  尝试: "列出当前目录的文件" 或 "读取 package.json"');
  console.log('  输入 "exit" 退出');
  console.log('='.repeat(50));
  console.log(`\n当前目录: ${process.cwd()}\n`);

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
      console.log(`\nAI: ${reply}\n`);
    } catch (error) {
      console.error('Error:', error);
    }
  }
}

main();
