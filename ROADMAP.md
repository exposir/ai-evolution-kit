<!--
- [INPUT]: 无
- [OUTPUT]: 提供详细的开发路线图和章节规划
- [POS]: 根目录的 L3 文档
- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
-->

# AI Evolution Kit - 完整开发路线图

> 从 Script Boy 进化为 AI Architect 的 22 章节学习计划

## 进度概览

| Milestone | 名称            | 章节     | 状态      | 目录                      |
| --------- | --------------- | -------- | --------- | ------------------------- |
| M1        | Runtime Lab     | Ch 1-8   | ✅ 已完成 | `packages/01-runtime-lab` |
| M2        | Data Foundation | Ch 9-11  | ✅ 已完成 | `packages/02-data-forge`  |
| M3        | Agent Brain     | Ch 12-15 | ✅ 已完成 | `packages/03-agent-brain` |
| M4        | Next Client     | Ch 16-19 | ✅ 已完成 | `packages/04-next-client` |
| M5        | Server Core     | Ch 20-22 | 🔶 21/22  | `packages/05-server-core` |

> **当前进度**: 21/22 章节验收通过，Ch21 需配置 Redis

---

## Milestone 1: Runtime Lab ✅

**目标**: 懂得如何给 AI 装上"手"（Tools）和"眼"（RAG）

| 章节 | 主题                       | 文件               | 代码 | 验收 |
| ---- | -------------------------- | ------------------ | ---- | ---- |
| 01   | 架构总览 - Bare Metal Chat | `01-chat.ts`       | ✅   | ✅   |
| 02   | Tool 定义 - Zod Schema     | `02-tools.ts`      | ✅   | ✅   |
| 03   | ReAct 循环 - Agent 原型    | `03-loop.ts`       | ✅   | ✅   |
| 04   | 环境交互 - 文件系统        | `04-system.ts`     | ✅   | ✅   |
| 05   | MCP 协议 - Server          | `05-mcp-server.ts` | ✅   | ✅   |
| 06   | MCP 实战 - Client          | `06-mcp-client.ts` | ✅   | ✅   |
| 07   | RAG 原理 - Embedding       | `07-embedding.ts`  | ✅   | ✅   |
| 08   | 基础 ETL - Search          | `08-search.ts`     | ✅   | ✅   |

**单元测试**: ✅ 11/11 通过 (cosineSimilarity, splitText)
**验收状态**: ✅ 全部通过 (2026-01-16)

---

## Milestone 2: Data Foundation ✅

**目标**: 解决"脏数据"和"失忆"问题，从 Demo 走向生产级数据处理

| 章节 | 主题         | 关键技术                            | 文件                 | 代码 | 验收 |
| ---- | ------------ | ----------------------------------- | -------------------- | ---- | ---- |
| 09   | 复杂文档加载 | PDF 解析, Markdown 清洗, 递归切分   | `09-doc-cleaner.ts`  | ✅   | ✅   |
| 10   | 向量数据库   | Supabase (pgvector), 批量 Embedding | `10-vector-db.ts`    | ✅   | ✅   |
| 11   | 高级检索     | Hybrid Search, Rerank 重排序        | `11-smart-search.ts` | ✅   | ✅   |

**验收状态**: ✅ 全部通过 (2026-01-21)

**环境配置**:
- 智谱 embedding-3（2048 维，使用 fetch 绕过 SDK 解析问题）
- Supabase + pgvector（无索引，因 2048 维超过索引限制）

---

## Milestone 3: Agent Brain ✅

**目标**: 用 LangGraph 替换简陋的 while 循环，构建可控的、带状态的复杂系统

| 章节 | 主题           | 关键技术                            | 文件                    | 代码 | 验收 |
| ---- | -------------- | ----------------------------------- | ----------------------- | ---- | ---- |
| 12   | LangGraph 入门 | StateGraph, Nodes, Edges            | `12-state-graph.ts`     | ✅   | ✅   |
| 13   | 自我修正       | Conditional Edges, 循环重试         | `13-self-correction.ts` | ✅   | ✅   |
| 14   | 人机协作       | Human-in-the-loop, Interrupt/Resume | `14-human-loop.ts`      | ✅   | ✅   |
| 15   | 多 Agent 协作  | Supervisor 模式, 任务分发           | `15-team-work.ts`       | ✅   | ✅   |

**验收状态**: ✅ 全部通过 (2026-01-16)

**核心概念**:

- StateGraph = AI 版的 XState 状态机
- Node = Reducer (处理状态)
- Edge = Action (路由逻辑)
- Annotation = 状态定义 + Reducer 模式

---

## Milestone 4: Next Client ✅

**目标**: 让 AI 输出 UI，实现流式交互，做别人做不出来的体验

| 章节 | 主题        | 关键技术                | 文件            | 代码 | 验收 |
| ---- | ----------- | ----------------------- | --------------- | ---- | ---- |
| 16   | AI SDK 标准 | Vercel AI SDK, useChat  | `ch16/page.tsx` | ✅   | ✅   |
| 17   | 流式传输    | streamText, SSE         | `ch17/page.tsx` | ✅   | ✅   |
| 18   | 生成式 UI   | tool(), toolInvocations | `ch18/page.tsx` | ✅   | ✅   |
| 19   | 结构化输出  | streamObject, useObject | `ch19/page.tsx` | ✅   | ✅   |

**验收状态**: ✅ 全部通过 | `pnpm dev` 启动成功，构建通过

**核心亮点**:

- Chapter 18 (GenUI) 是 v0.dev 的原理
- AI 直接返回结构化数据，前端渲染组件

---

## Milestone 5: Server Core 🔶

**目标**: 解决并发、安全、成本问题，构建健壮的后端服务

| 章节 | 主题                       | 关键技术                       | 文件               | 代码 | 验收 |
| ---- | -------------------------- | ------------------------------ | ------------------ | ---- | ---- |
| 20   | The Fortress (NestJS 架构) | Controller, Service, Guard, DI | `chat/*.ts`        | ✅   | ✅   |
| 21   | Redis Memory & Caching     | Redis Checkpointer, 缓存拦截器 | `memory/*.ts`      | ✅   | ⏳   |
| 22   | Guardrails (卫兵与限流)    | @nestjs/throttler, Auth Guard  | `common/guards/*`  | ✅   | ✅   |

**验收状态**: 🔶 Ch20/22 通过 | Ch21 需配置 `REDIS_URL`

**API 端点**:

| Method | Path           | 说明                    |
| ------ | -------------- | ----------------------- |
| POST   | /chat          | 同步对话, 返回完整响应  |
| POST   | /chat/stream   | 流式对话, SSE 逐 token  |
| GET    | /health        | 健康检查, 返回服务状态  |

**架构设计**:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Next.js    │────▶│   NestJS    │────▶│   Redis     │
│  Frontend   │     │   Backend   │     │   + PG      │
└─────────────┘     └─────────────┘     └─────────────┘
```

**运行**:

```bash
cd packages/05-server-core
pnpm dev  # 启动 http://localhost:3001
```

**测试请求**:

```bash
# 健康检查
curl http://localhost:3001/health

# 同步对话 (智谱 AI)
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"hello"}]}'

# 流式对话
curl -N -X POST http://localhost:3001/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"count 1 to 5"}]}'
```

**兼容性说明**:

使用 AI SDK 4 (`ai@^4.0.0`) + `compatibility: 'compatible'` 模式，兼容智谱等 OpenAI 兼容 API。

---

## 项目进度

🔶 **21/22 章节验收通过**

从 Script Boy 到 AI Architect 的进化之路已接近完成。项目涵盖：

- **M1**: AI 基础能力 (Tools + RAG) ✅
- **M2**: 生产级数据处理 (向量数据库 + 混合检索) ✅
- **M3**: 复杂系统编排 (LangGraph 状态机) ✅
- **M4**: 流式交互前端 (Next.js + AI SDK) ✅
- **M5**: 健壮后端服务 (NestJS + Redis + 限流) 🔶 Ch21 待验收

**待完成**：Ch21 Redis Memory & Caching（需配置 `REDIS_URL`）

---

## 测试验收

详见 [TEST_PLAN.md](./TEST_PLAN.md)

| 类型     | 说明                                                  |
| -------- | ----------------------------------------------------- |
| 单元测试 | 核心函数 (cosineSimilarity, splitText 等) 使用 Vitest |
| 验收清单 | 每个章节的手动验证标准                                |

---

## 技术栈总览

| 类别   | 技术                          |
| ------ | ----------------------------- |
| 语言   | TypeScript                    |
| 运行时 | Node.js, Bun (可选)           |
| AI     | OpenAI API, Vercel AI SDK     |
| 向量   | Supabase (pgvector), Pinecone |
| 编排   | LangGraph                     |
| 前端   | Next.js 14, React, Tailwind   |
| 后端   | NestJS                        |
| 缓存   | Redis                         |
| 协议   | MCP (Model Context Protocol)  |
