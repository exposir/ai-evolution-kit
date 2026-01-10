# 01-runtime-lab/

> L2 | 父级: /CLAUDE.md

AI 运行时基础实验室 - 从裸金属 Chat 到 RAG 检索的 8 章渐进式教程

## 成员清单

```
src/
├── 01-chat.ts        : 裸金属对话，OpenAI API + readline + 上下文记忆
├── 01-chat-stream.ts : 裸金属对话 (Stream版)，stream: true + process.stdout.write
├── 02-tools.ts       : Tool 定义，Zod Schema → JSON Schema 转换
├── 03-loop.ts        : ReAct 循环，while 闭环执行工具调用
├── 04-system.ts      : 文件系统交互，list_files + read_file 实权授予
├── 05-mcp-server.ts  : MCP Server，工具声明与调用解耦，JSON-RPC 风格
├── 06-mcp-client.ts  : MCP Client，动态发现并调用 Server 能力
├── 07-embedding.ts   : 向量生成，文本切分 + OpenAI Embedding API
├── 08-search.ts      : 向量检索，cosineSimilarity + Context Injection
└── __tests__/
    └── utils.test.ts : 单元测试，cosineSimilarity + splitText
```

## 依赖

- `openai`: OpenAI SDK
- `zod`: Schema 定义与验证
- `dotenv`: 环境变量加载

## 运行命令

```bash
pnpm ch1  # 基础 Chat
pnpm ch2  # Tool 定义
pnpm ch3  # ReAct 循环
pnpm ch4  # 文件系统
pnpm ch5  # MCP Server
pnpm ch6  # MCP Client
pnpm ch7  # Embedding
pnpm ch8  # 向量搜索
```

## 核心概念

| 章节 | 核心概念                | 关键代码                           |
| ---- | ----------------------- | ---------------------------------- |
| Ch1  | messages 数组维持上下文 | `messages.push({ role, content })` |
| Ch2  | Zod → JSON Schema       | `z.object().describe()`            |
| Ch3  | ReAct 循环              | `while (response.tool_calls)`      |
| Ch4  | 安全边界                | `fs.readdirSync()` + 日志          |
| Ch5  | 能力声明解耦            | `listTools()` / `call()`           |
| Ch6  | 动态发现                | `client.connect(server)`           |
| Ch7  | 向量化                  | `embeddings.create()`              |
| Ch8  | 余弦相似度              | `cosineSimilarity(a, b)`           |

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
