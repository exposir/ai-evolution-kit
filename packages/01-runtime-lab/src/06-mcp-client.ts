/**
 * Chapter 6: MCP Client (通用协议模拟 - 客户端)
 * 目标：实现通用的 Client 连接器，动态发现并调用 Server 能力。
 *
 * 核心要点：
 * 1. Client 不知道对面是什么服务（地图、天气、日历...）
 * 2. 通过"握手"获取 Server 信息
 * 3. 通过 listTools() 动态获取工具列表
 * 4. 代码中没有硬编码的 if (tool === 'map')
 *
 * @module 01-runtime-lab/06-mcp-client
 * [INPUT]: openai (ChatCompletion), ./05-mcp-server (MapServer 类)
 * [OUTPUT]: 独立可执行脚本，无对外导出
 * [POS]: Runtime Lab 第六章，MCP 协议客户端，演示动态发现与调用 Server 能力
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import 'dotenv/config';
import * as readline from 'node:readline';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { MapServer } from './05-mcp-server.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================
// MCP Client 实现
// ============================================

class MCPClient {
  // 存储已连接的 Server（可以连接多个）
  private servers: Map<string, { server: MapServer; tools: OpenAI.Chat.Completions.ChatCompletionTool[] }> = new Map();

  /**
   * 连接到一个 MCP Server
   * 这里模拟连接过程，实际 MCP 会通过 Stdio/HTTP 通信
   */
  connect(server: MapServer) {
    const info = server.getServerInfo();
    console.log(`[MCP] 正在连接服务器: ${info.name} v${info.version}`);

    // 动态获取 Server 的工具列表
    const serverTools = server.listTools();
    console.log(`[MCP] 发现 ${serverTools.length} 个工具:`);
    serverTools.forEach((t) => console.log(`      - ${t.name}: ${t.description}`));

    // 转换为 OpenAI 格式的工具定义
    const openaiTools: OpenAI.Chat.Completions.ChatCompletionTool[] = serverTools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: `${info.name}__${tool.name}`, // 添加前缀避免命名冲突
        description: `[${info.name}] ${tool.description}`,
        parameters: tool.parameters,
      },
    }));

    this.servers.set(info.name, { server, tools: openaiTools });
    console.log(`[MCP] 连接成功!\n`);
  }

  /**
   * 获取所有已连接 Server 的工具
   */
  getAllTools(): OpenAI.Chat.Completions.ChatCompletionTool[] {
    const allTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [];
    for (const { tools } of this.servers.values()) {
      allTools.push(...tools);
    }
    return allTools;
  }

  /**
   * 调用工具
   * 自动路由到正确的 Server
   */
  callTool(fullName: string, args: Record<string, unknown>): string {
    // 解析工具名称: "amap-server__getLocation" -> ["amap-server", "getLocation"]
    const [serverName, methodName] = fullName.split('__');

    const serverEntry = this.servers.get(serverName);
    if (!serverEntry) {
      return JSON.stringify({ error: `Server not found: ${serverName}` });
    }

    console.log(`  [MCP] 路由到 ${serverName}.${methodName}`);

    // 调用 Server
    const response = serverEntry.server.call({
      method: methodName,
      params: args,
    });

    return JSON.stringify(response.result ?? response.error);
  }
}

// ============================================
// 与 OpenAI 集成的 Agent
// ============================================

const client = new MCPClient();
const messages: ChatCompletionMessageParam[] = [
  {
    role: 'system',
    content: `你是一个智能助手，可以帮用户查询地理位置、天气和路线信息。
使用提供的工具来回答用户问题。`,
  },
];

async function chat(userInput: string): Promise<string> {
  messages.push({ role: 'user', content: userInput });

  const tools = client.getAllTools();

  while (true) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      tools: tools.length > 0 ? tools : undefined,
    });

    const choice = response.choices[0];
    const message = choice.message;
    messages.push(message);

    if (choice.finish_reason === 'tool_calls' && message.tool_calls) {
      console.log('\n[AI 请求调用 MCP 工具]');

      for (const toolCall of message.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        console.log(`  工具: ${toolName}`);
        console.log(`  参数: ${JSON.stringify(toolArgs)}`);

        // 通过 MCP Client 路由到正确的 Server
        const result = client.callTool(toolName, toolArgs);
        console.log(`  结果: ${result}`);

        const toolMessage: ChatCompletionMessageParam = {
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result,
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

// ============================================
// 主程序
// ============================================

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
  console.log('  Chapter 6: MCP Client');
  console.log('  演示 Client 如何动态发现和调用 Server 能力');
  console.log('='.repeat(50));
  console.log();

  // 连接 MCP Server
  const mapServer = new MapServer();
  client.connect(mapServer);

  console.log('尝试: "北京天安门的坐标" 或 "上海今天天气怎么样"');
  console.log('输入 "exit" 退出\n');

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
