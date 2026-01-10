# AI Evolution Kit - 完整开发路线图

> 从 Script Boy 进化为 AI Architect 的 22 章节学习计划

## 进度概览

| Milestone | 名称 | 章节 | 状态 | 目录 |
|-----------|------|------|------|------|
| M1 | Runtime Lab | Ch 1-8 | ✅ 已完成 | `packages/01-runtime-lab` |
| M2 | Data Foundation | Ch 9-11 | ⏳ 待开发 | `packages/02-data-forge` |
| M3 | Agent Brain | Ch 12-15 | ⏳ 待开发 | `packages/03-agent-brain` |
| M4 | Next Client | Ch 16-19 | ⏳ 待开发 | `packages/04-next-client` |
| M5 | Server Core | Ch 20-22 | ⏳ 待开发 | `packages/05-server-core` |

---

## Milestone 1: Runtime Lab ✅

**目标**: 懂得如何给 AI 装上"手"（Tools）和"眼"（RAG）

| 章节 | 主题 | 文件 | 状态 |
|------|------|------|------|
| 01 | 架构总览 - Bare Metal Chat | `01-chat.ts` | ✅ |
| 02 | Tool 定义 - Zod Schema | `02-tools.ts` | ✅ |
| 03 | ReAct 循环 - Agent 原型 | `03-loop.ts` | ✅ |
| 04 | 环境交互 - 文件系统 | `04-system.ts` | ✅ |
| 05 | MCP 协议 - Server | `05-mcp-server.ts` | ✅ |
| 06 | MCP 实战 - Client | `06-mcp-client.ts` | ✅ |
| 07 | RAG 原理 - Embedding | `07-embedding.ts` | ✅ |
| 08 | 基础 ETL - Search | `08-search.ts` | ✅ |

---

## Milestone 2: Data Foundation ⏳

**目标**: 解决"脏数据"和"失忆"问题，从 Demo 走向生产级数据处理

| 章节 | 主题 | 关键技术 | 文件 |
|------|------|----------|------|
| 09 | 复杂文档加载 | PDF 解析, Markdown 清洗, 表格还原 | `09-doc-cleaner.ts` |
| 10 | 向量数据库 | Supabase (pgvector), 持久化存储 | `10-vector-db.ts` |
| 11 | 高级检索 | Hybrid Search, Rerank 重排序 | `11-smart-search.ts` |

**依赖安装**:
```bash
cd packages/02-data-forge
pnpm add @supabase/supabase-js pdf-parse openai dotenv
```

**准备工作**:
- [ ] 注册 Supabase 账号
- [ ] 创建项目获取 Project URL 和 Service Role Key
- [ ] 执行 SQL 启用 vector 扩展

---

## Milestone 3: Agent Brain ⏳

**目标**: 用 LangGraph 替换简陋的 while 循环，构建可控的、带状态的复杂系统

| 章节 | 主题 | 关键技术 | 文件 |
|------|------|----------|------|
| 12 | LangGraph 入门 | StateGraph, Nodes, Edges | `12-state-graph.ts` |
| 13 | 自我修正 | Conditional Edges, 循环重试 | `13-self-correction.ts` |
| 14 | 人机协作 | Human-in-the-loop, Interrupt/Resume | `14-human-loop.ts` |
| 15 | 多 Agent 协作 | Supervisor 模式, 任务分发 | `15-team-work.ts` |

**依赖安装**:
```bash
cd packages/03-agent-brain
pnpm add @langchain/langgraph @langchain/core @langchain/openai zod dotenv
```

**核心概念**:
- StateGraph = AI 版的 XState 状态机
- Node = Reducer (处理状态)
- Edge = Action (路由逻辑)

---

## Milestone 4: Next Client ⏳

**目标**: 让 AI 输出 UI，实现流式交互，做别人做不出来的体验

| 章节 | 主题 | 关键技术 | 组件/路由 |
|------|------|----------|-----------|
| 16 | AI SDK 标准 | Vercel AI SDK, useChat | `app/api/chat/route.ts` |
| 17 | 流式传输 | streamText, SSE | `components/ChatStream.tsx` |
| 18 | 生成式 UI | streamUI, Component Streaming | `components/GenUI.tsx` |
| 19 | 结构化输出 | useObject, Zod Stream | `components/FormGenerator.tsx` |

**项目初始化**:
```bash
cd packages
npx create-next-app@latest 04-next-client --typescript --tailwind
cd 04-next-client
pnpm add ai @ai-sdk/openai zod
```

**核心亮点**:
- Chapter 18 (GenUI) 是 v0.dev 的原理
- AI 直接返回 React 组件而不是文本

---

## Milestone 5: Server Core ⏳

**目标**: 解决并发、安全、成本问题，构建健壮的后端服务

| 章节 | 主题 | 关键技术 | 模块 |
|------|------|----------|------|
| 20 | The Fortress (NestJS 架构) | Controller, Service, Guard, DI | `chat.module.ts` |
| 21 | Redis Memory & Caching | Redis Checkpointer, 缓存拦截器 | `memory.service.ts` |
| 22 | Guardrails (卫兵与限流) | @nestjs/throttler, Auth Guard | `auth.guard.ts` |

**项目初始化**:
```bash
cd packages
npm i -g @nestjs/cli
nest new 05-server-core
cd 05-server-core
pnpm add @nestjs/config @nestjs/throttler ioredis @supabase/supabase-js class-validator class-transformer
```

**架构设计**:
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Next.js    │────▶│   NestJS    │────▶│   Redis     │
│  Frontend   │     │   Backend   │     │   + PG      │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## 快速开始下一个 Milestone

当你准备开始下一个阶段时，告诉我：

```
开始 Milestone 2
```

我会帮你：
1. 创建 `packages/02-data-forge` 目录
2. 配置依赖和 TypeScript
3. 实现 Chapter 9-11 的代码

---

## 测试验收

详见 [TEST_PLAN.md](./TEST_PLAN.md)

| 类型 | 说明 |
|------|------|
| 单元测试 | 核心函数 (cosineSimilarity, splitText 等) 使用 Vitest |
| 验收清单 | 每个章节的手动验证标准 |

---

## 技术栈总览

| 类别 | 技术 |
|------|------|
| 语言 | TypeScript |
| 运行时 | Node.js, Bun (可选) |
| AI | OpenAI API, Vercel AI SDK |
| 向量 | Supabase (pgvector), Pinecone |
| 编排 | LangGraph |
| 前端 | Next.js 14, React, Tailwind |
| 后端 | NestJS |
| 缓存 | Redis |
| 协议 | MCP (Model Context Protocol) |
