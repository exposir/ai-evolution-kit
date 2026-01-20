<!--
- [INPUT]: 依赖 Node.js 环境与 AI SDK 基础
- [OUTPUT]: 本文档提供 Milestone 1 的学习指南与实验说明
- [POS]: 01-runtime-lab 的 模块文档
- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
-->

# 01-runtime-lab

> Milestone 1: The Runtime - AI 的手与眼

从裸金属 Chat 到 RAG 检索的 8 章渐进式教程，学会给 AI 装上"手"（Tools）和"眼"（RAG）。

## 目录

- [快速开始](#快速开始)
- [章节概览](#章节概览)
- [技术栈](#技术栈)
- [核心概念](#核心概念)
- [文件结构](#文件结构)
- [验收清单](#验收清单)

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8

### 安装依赖

```bash
cd packages/01-runtime-lab
pnpm install
```

### 配置环境变量

在项目根目录创建 `.env` 文件：

```bash
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4  # 智谱 AI
CHAT_MODEL=glm-4-airx
EMBEDDING_MODEL=embedding-3
```

### 运行章节

```bash
pnpm ch1        # Ch1: 基础 Chat
pnpm ch1:stream # Ch1: 流式 Chat
pnpm ch2        # Ch2: Tool 定义
pnpm ch3        # Ch3: ReAct 循环
pnpm ch4        # Ch4: 文件系统交互
pnpm ch5        # Ch5: MCP Server
pnpm ch6        # Ch6: MCP Client
pnpm ch7        # Ch7: Embedding
pnpm ch8        # Ch8: 向量搜索
```

## 章节概览

| 章节 | 主题         | 学习目标                                 |
| ---- | ------------ | ---------------------------------------- |
| Ch1  | 裸金属对话   | 理解 Chat Completion API，实现上下文记忆 |
| Ch2  | Tool 定义    | 掌握 Zod Schema 到 JSON Schema 的转换    |
| Ch3  | ReAct 循环   | 实现 AI 的决策-执行-反馈闭环             |
| Ch4  | 文件系统交互 | 赋予 AI 读写文件的"实权"                 |
| Ch5  | MCP Server   | 理解工具声明与调用的解耦                 |
| Ch6  | MCP Client   | 实现动态发现并调用 Server 能力           |
| Ch7  | Embedding    | 理解文本向量化原理                       |
| Ch8  | 向量搜索     | 实现 RAG 的核心检索逻辑                  |

## 技术栈

| 依赖     | 版本    | 用途                    |
| -------- | ------- | ----------------------- |
| `openai` | ^4.77.0 | OpenAI SDK，AI 交互核心 |
| `zod`    | ^3.24.1 | Schema 定义与运行时验证 |
| `dotenv` | ^16.4.7 | 环境变量加载            |
| `tsx`    | ^4.19.2 | TypeScript 直接运行     |

## 核心概念

### Ch1: 上下文记忆

```typescript
const messages: ChatCompletionMessageParam[] = [];

// 每轮对话追加消息
messages.push({ role: "user", content: userInput });
const response = await openai.chat.completions.create({ messages });
messages.push(response.choices[0].message);
```

### Ch2: Zod → JSON Schema

```typescript
const CalculatorSchema = z.object({
  a: z.number().describe("第一个数字"),
  b: z.number().describe("第二个数字"),
  operation: z.enum(["add", "subtract", "multiply", "divide"]),
});

// 转换为 OpenAI 工具定义
const tools = [
  {
    type: "function",
    function: {
      name: "calculator",
      parameters: zodToJsonSchema(CalculatorSchema),
    },
  },
];
```

### Ch3: ReAct 循环

```typescript
while (true) {
  const response = await openai.chat.completions.create({ messages, tools });
  const message = response.choices[0].message;

  if (!message.tool_calls) break; // 无工具调用，结束循环

  // 执行工具并追加结果
  for (const toolCall of message.tool_calls) {
    const result = await executeTool(toolCall);
    messages.push({ role: "tool", tool_call_id: toolCall.id, content: result });
  }
}
```

### Ch7-8: RAG 核心

```typescript
// 1. 文本切分
const chunks = splitText(document, { chunkSize: 500, overlap: 50 });

// 2. 向量化
const embeddings = await openai.embeddings.create({ input: chunks });

// 3. 检索
const queryVector = await embed(query);
const results = chunks
  .map((chunk, i) => ({
    chunk,
    similarity: cosineSimilarity(queryVector, embeddings[i]),
  }))
  .sort((a, b) => b.similarity - a.similarity)
  .slice(0, 3);

// 4. 上下文注入
const prompt = `基于以下信息回答问题：\n${results.map((r) => r.chunk).join("\n")}\n\n问题：${query}`;
```

## 文件结构

```
src/
├── 01-chat.ts        # 裸金属对话，readline + 上下文记忆
├── 01-chat-stream.ts # 流式对话，stream: true + stdout.write
├── 02-tools.ts       # Tool 定义，Zod Schema 转换
├── 03-loop.ts        # ReAct 循环，while 闭环执行
├── 04-system.ts      # 文件系统交互，list_files + read_file
├── 05-mcp-server.ts  # MCP Server，JSON-RPC 风格工具声明
├── 06-mcp-client.ts  # MCP Client，动态发现 Server 能力
├── 07-embedding.ts   # 向量生成，文本切分 + Embedding API
├── 08-search.ts      # 向量检索，cosineSimilarity + 上下文注入
└── __tests__/
    └── utils.test.ts # 单元测试，cosineSimilarity + splitText
```

## 验收清单

| 章节 | 验收标准                    | 验证方法                          |
| ---- | --------------------------- | --------------------------------- |
| Ch1  | AI 能记住上一轮对话内容     | 输入名字 → 问"我叫什么"           |
| Ch2  | AI 请求调用 calculator 工具 | 输入"1+1等于几" → 查看 tool_calls |
| Ch3  | AI 调用工具并返回正确结果   | 输入"123+456" → 返回"579"         |
| Ch4  | AI 能列出当前目录文件       | 输入"列出文件" → 显示文件列表     |
| Ch5  | MCP Server 返回工具列表     | 运行后查看 listTools 输出         |
| Ch6  | Client 动态调用 Server 工具 | 问"北京天气" → 返回模拟数据       |
| Ch7  | 成功生成向量                | 查看向量维度输出 (512/1536)       |
| Ch8  | 基于知识库回答问题          | 问"这个项目叫什么" → 正确回答     |

## 单元测试

```bash
# 在项目根目录运行
pnpm test
```

测试覆盖：

- `cosineSimilarity`: 相同向量、正交向量、相反向量、零向量、维度不匹配
- `splitText`: 段落切分、空文本、单段落、长段落、多换行符

## 学完之后

掌握了 M1 的内容，你已经理解了：

- Chat Completion API 的本质
- Tool Calling 的工作原理
- ReAct Agent 的核心循环
- MCP 协议的设计思想
- RAG 检索的基本流程

下一步：进入 [02-data-forge](../02-data-forge) 学习生产级数据处理。
