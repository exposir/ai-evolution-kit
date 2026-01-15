<!--
- [INPUT]: 无
- [OUTPUT]: 项目入口文档，提供快速开始、项目进度、技术栈信息
- [POS]: 根目录的 L3 文档
- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
-->

# AI Evolution Kit

> 从 Script Boy 进化为 AI Architect 的 22 章节学习计划

一个系统化的 AI 应用开发学习项目，涵盖从基础 Chat 到生产级 Agent 系统的完整技术栈。

## 项目进度

| Milestone | 名称            | 章节     | 状态      | 目录                      |
| --------- | --------------- | -------- | --------- | ------------------------- |
| M1        | Runtime Lab     | Ch 1-8   | ✅ 已完成 | `packages/01-runtime-lab` |
| M2        | Data Foundation | Ch 9-11  | ✅ 已完成 | `packages/02-data-forge`  |
| M3        | Agent Brain     | Ch 12-15 | ✅ 已完成 | `packages/03-agent-brain` |
| M4        | Next Client     | Ch 16-19 | ✅ 已完成 | `packages/04-next-client` |
| M5        | Server Core     | Ch 20-22 | ✅ 已完成 | `packages/05-server-core` |

**总进度: 22/22 章节完成 (100%) 🎉**

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8

### 安装依赖

```bash
pnpm install
```

### 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入你的 API Keys
```

需要的环境变量:

- `OPENAI_API_KEY` - OpenAI API 密钥（或智谱 AI 密钥）
- `OPENAI_BASE_URL` - API 基础 URL（智谱: `https://open.bigmodel.cn/api/paas/v4`）
- `SUPABASE_URL` - Supabase 项目 URL (M2 需要)
- `SUPABASE_SERVICE_KEY` - Supabase Service Role Key (M2 需要)

### 运行示例

```bash
# Milestone 1: Runtime Lab
cd packages/01-runtime-lab
pnpm ch1  # 基础 Chat
pnpm ch2  # Tool 定义
pnpm ch3  # ReAct 循环
pnpm ch4  # 文件系统交互
pnpm ch5  # MCP Server
pnpm ch6  # MCP Client
pnpm ch7  # Embedding
pnpm ch8  # 向量搜索

# Milestone 2: Data Foundation
cd packages/02-data-forge
pnpm ch9   # 文档加载器
pnpm ch10  # 向量数据库
pnpm ch11  # 混合检索

# Milestone 3: Agent Brain
cd packages/03-agent-brain
pnpm ch12  # StateGraph 基础
pnpm ch13  # 自我修复回路
pnpm ch14  # 人机协作 (交互式)
pnpm ch15  # 多 Agent 协作

# Milestone 4: Next Client
cd packages/04-next-client
pnpm dev   # 启动 http://localhost:3000

# Milestone 5: Server Core
cd packages/05-server-core
pnpm dev   # 启动 http://localhost:3001
```

### 运行测试

```bash
pnpm test
```

## 技术栈

| 类别       | 技术                                 |
| ---------- | ------------------------------------ |
| 语言       | TypeScript                           |
| 运行时     | Node.js                              |
| AI         | OpenAI API, Vercel AI SDK, 智谱 AI   |
| 向量数据库 | Supabase (pgvector)                  |
| 编排       | LangGraph                            |
| 前端       | Next.js 15, React 19, Tailwind CSS 4 |
| 后端       | NestJS                               |
| 缓存       | Redis                                |
| 协议       | MCP (Model Context Protocol)         |

## 项目结构

```
ai-evolution-kit/
├── packages/
│   ├── 01-runtime-lab/     # M1: 基础运行时 ✅
│   │   └── src/
│   │       ├── 01-chat.ts       # 基础对话
│   │       ├── 02-tools.ts      # Tool 定义
│   │       ├── 03-loop.ts       # ReAct 循环
│   │       ├── 04-system.ts     # 系统交互
│   │       ├── 05-mcp-server.ts # MCP 服务端
│   │       ├── 06-mcp-client.ts # MCP 客户端
│   │       ├── 07-embedding.ts  # 向量嵌入
│   │       └── 08-search.ts     # 向量搜索
│   │
│   ├── 02-data-forge/      # M2: 数据处理 ✅
│   │   └── src/
│   │       ├── 09-doc-cleaner.ts   # 文档清洗
│   │       ├── 10-vector-db.ts     # 向量数据库
│   │       └── 11-smart-search.ts  # 智能检索
│   │
│   ├── 03-agent-brain/     # M3: Agent 编排 ✅
│   │   └── src/
│   │       ├── 12-state-graph.ts     # StateGraph 基础
│   │       ├── 13-self-correction.ts # 自我修复回路
│   │       ├── 14-human-loop.ts      # 人机协作
│   │       └── 15-team-work.ts       # 多 Agent 协作
│   │
│   ├── 04-next-client/     # M4: 前端交互 ✅
│   │   └── src/
│   │       ├── app/
│   │       │   ├── ch16/    # useChat Hook
│   │       │   ├── ch17/    # Streaming UI
│   │       │   ├── ch18/    # GenUI (工具调用)
│   │       │   ├── ch19/    # Structured Output
│   │       │   └── api/     # API Routes
│   │       └── lib/
│   │           ├── ai.ts       # AI 配置
│   │           └── schemas.ts  # Zod Schemas
│   │
│   └── 05-server-core/     # M5: 后端服务 ✅
│       └── src/
│           ├── main.ts            # 应用入口
│           ├── app.module.ts      # 根模块
│           ├── chat/              # Chat API (Controller/Service)
│           ├── memory/            # Redis 会话管理
│           └── common/            # Guards/Interceptors
│
├── doc/                    # 学习文档
├── ROADMAP.md             # 开发路线图
├── TEST_PLAN.md           # 测试计划
└── package.json
```

## 学习路线

### Milestone 1: Runtime Lab ✅

学会给 AI 装上"手"（Tools）和"眼"（RAG）

- **Ch1-2**: 理解 Chat Completion API 和 Tool 定义
- **Ch3-4**: 实现 ReAct 循环，让 AI 能执行操作
- **Ch5-6**: 掌握 MCP 协议，实现 Server/Client 架构
- **Ch7-8**: 理解 Embedding 和向量搜索原理

### Milestone 2: Data Foundation ✅

解决"脏数据"和"失忆"问题

- **Ch9**: 复杂文档加载（PDF、Markdown）
- **Ch10**: 向量数据库（Supabase + pgvector）
- **Ch11**: 高级检索（Hybrid Search + Rerank）

### Milestone 3: Agent Brain ✅

用 LangGraph 构建可控的复杂系统

- **Ch12**: StateGraph 入门 - Node/Edge/State
- **Ch13**: 自我修正机制 - 错误重试回路
- **Ch14**: 人机协作 - Interrupt/Resume
- **Ch15**: 多 Agent 协作 - Supervisor 模式

### Milestone 4: Next Client ✅

让 AI 输出 UI，实现流式交互

- **Ch16**: Vercel AI SDK - useChat Hook
- **Ch17**: 流式传输 - Token 级别 SSE
- **Ch18**: 生成式 UI - AI 返回组件（v0.dev 原理）
- **Ch19**: 结构化输出 - 实时填充 JSON

### Milestone 5: Server Core ✅

构建健壮的后端服务

- **Ch20**: NestJS 架构 - Controller/Service/Module/DI
- **Ch21**: Redis Memory - 会话持久化 (Checkpointer)
- **Ch22**: Guardrails - 限流 (@nestjs/throttler) + 认证 (API Key Guard)

## 文档

- [开发路线图](./ROADMAP.md) - 详细的章节规划
- [测试计划](./TEST_PLAN.md) - 验收标准和测试方法

## License

MIT
