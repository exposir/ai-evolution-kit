# 03-agent-brain/

> L2 | 父级: /CLAUDE.md

AI Agent 编排引擎 - 用 LangGraph 构建状态机驱动的复杂 Agent

## 成员清单

```
src/
├── 12-state-graph.ts     : StateGraph 入门，Node/Edge/State 基础，ReAct 循环
├── 13-self-correction.ts : 自我修复回路，错误检测 + 自动重试 + 最大次数限制
├── 14-human-loop.ts      : 人机协作，MemorySaver + interruptBefore + 审批流程
├── 15-team-work.ts       : 多 Agent 协作，Supervisor 模式，任务分发与汇总
└── __tests__/            : 单元测试
```

## 依赖

- `@langchain/langgraph`: 状态图引擎，Agent 编排核心
- `@langchain/core`: 基础消息类型与工具定义
- `@langchain/openai`: OpenAI 模型集成
- `zod`: Schema 定义
- `dotenv`: 环境变量

## 运行命令

```bash
pnpm ch12  # StateGraph 基础
pnpm ch13  # 自我修复回路
pnpm ch14  # 人机协作 (交互式)
pnpm ch15  # 多 Agent 团队
```

## 核心概念

| 章节 | 核心概念                 | 关键代码                                         |
| ---- | ------------------------ | ------------------------------------------------ |
| Ch12 | StateGraph 结构          | `new StateGraph().addNode().addEdge().compile()` |
| Ch13 | Conditional Edge + Retry | `addConditionalEdges()` + `retryCount` 状态      |
| Ch14 | Interrupt/Resume         | `MemorySaver` + `interruptBefore` + `updateState`|
| Ch15 | Supervisor 模式          | 主管路由 + Worker 节点 + 共享 workLog            |

## 架构演进

```
M1 (Runtime Lab)          M3 (Agent Brain)
┌─────────────────┐       ┌─────────────────┐
│  while (true)   │  →→→  │   StateGraph    │
│    if/else      │       │   Node/Edge     │
│    hardcode     │       │   Conditional   │
└─────────────────┘       └─────────────────┘
   手工循环                   图结构驱动
```

## 从 M1 到 M3 的跃迁

| 维度     | M1 (03-loop.ts)      | M3 (StateGraph)            |
| -------- | -------------------- | -------------------------- |
| 流程控制 | while + if/else      | 声明式图结构               |
| 状态管理 | 手工维护 messages    | Annotation + Reducer       |
| 重试逻辑 | 无                   | Conditional Edge + Counter |
| 人工介入 | 无                   | Interrupt/Resume           |
| 多 Agent | 无                   | Supervisor + Workers       |

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
