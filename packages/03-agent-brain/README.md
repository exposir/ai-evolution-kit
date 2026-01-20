<!--
- [INPUT]: 依赖 LangGraph 与 Agent 编排理论
- [OUTPUT]: 本文档提供 Milestone 3 的 Agent 构建指南
- [POS]: 03-agent-brain 的 模块文档
- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
-->

# 03-agent-brain

> Milestone 3: Agent Orchestration - 逻辑大脑

用 LangGraph 构建状态机驱动的复杂 Agent，从手工 while 循环进化到声明式图结构。

## 目录

- [快速开始](#快速开始)
- [章节概览](#章节概览)
- [技术栈](#技术栈)
- [核心概念](#核心概念)
- [架构演进](#架构演进)
- [文件结构](#文件结构)
- [验收清单](#验收清单)

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8

### 安装依赖

```bash
cd packages/03-agent-brain
pnpm install
```

### 配置环境变量

在项目根目录创建 `.env` 文件：

```bash
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4
CHAT_MODEL=glm-4-airx
```

### 运行章节

```bash
pnpm ch12  # Ch12: StateGraph 基础
pnpm ch13  # Ch13: 自我修复回路
pnpm ch14  # Ch14: 人机协作 (交互式)
pnpm ch15  # Ch15: 多 Agent 团队
```

## 章节概览

| 章节 | 主题            | 学习目标                           |
| ---- | --------------- | ---------------------------------- |
| Ch12 | StateGraph 入门 | 理解 Node/Edge/State 基础概念      |
| Ch13 | 自我修复回路    | 实现错误检测 + 自动重试 + 次数限制 |
| Ch14 | 人机协作        | 掌握 Interrupt/Resume 机制         |
| Ch15 | 多 Agent 协作   | 实现 Supervisor 模式任务分发       |

## 技术栈

| 依赖                   | 版本    | 用途                       |
| ---------------------- | ------- | -------------------------- |
| `@langchain/langgraph` | ^0.2.42 | 状态图引擎，Agent 编排核心 |
| `@langchain/core`      | ^0.3.27 | 基础消息类型与工具定义     |
| `@langchain/openai`    | ^0.3.17 | OpenAI 模型集成            |
| `zod`                  | ^3.24.1 | Schema 定义                |
| `dotenv`               | ^16.4.7 | 环境变量加载               |

## 核心概念

### Ch12: StateGraph 基础

```typescript
import { StateGraph, START, END, Annotation } from "@langchain/langgraph";

// 1. 定义状态
const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
});

// 2. 定义节点
async function agentNode(state: typeof AgentState.State) {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
}

async function toolNode(state: typeof AgentState.State) {
  const result = await executeTool(state.messages);
  return { messages: [result] };
}

// 3. 构建图
const graph = new StateGraph(AgentState)
  .addNode("agent", agentNode)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue, {
    continue: "tools",
    end: END,
  })
  .addEdge("tools", "agent")
  .compile();
```

### Ch13: 自我修复回路

```typescript
const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({ reducer: messagesReducer }),
  retryCount: Annotation<number>({ default: () => 0 }),
});

function shouldRetry(state: typeof AgentState.State) {
  const lastMessage = state.messages.at(-1);
  const hasError = lastMessage?.content.includes("Error");

  if (hasError && state.retryCount < 3) {
    return "retry";
  }
  return hasError ? "fail" : "success";
}

const graph = new StateGraph(AgentState)
  .addNode("agent", agentNode)
  .addNode("retry", async (state) => ({
    retryCount: state.retryCount + 1,
    messages: [new HumanMessage("请重试")],
  }))
  .addConditionalEdges("agent", shouldRetry, {
    retry: "retry",
    success: END,
    fail: END,
  })
  .addEdge("retry", "agent")
  .compile();
```

### Ch14: 人机协作

```typescript
import { MemorySaver } from '@langchain/langgraph';

const checkpointer = new MemorySaver();

const graph = new StateGraph(AgentState)
  .addNode('agent', agentNode)
  .addNode('sensitive_action', sensitiveActionNode)
  .addEdge(START, 'agent')
  .addConditionalEdges('agent', routeAction)
  .compile({
    checkpointer,
    interruptBefore: ['sensitive_action']  // 敏感操作前中断
  });

// 执行到中断点
const config = { configurable: { thread_id: 'user-123' } };
let state = await graph.invoke({ messages: [...] }, config);

// 等待人工审批后恢复
await graph.updateState(config, { approved: true });
state = await graph.invoke(null, config);  // 从中断点继续
```

### Ch15: Supervisor 模式

```typescript
const SupervisorState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({ reducer: messagesReducer }),
  workLog: Annotation<string[]>({
    reducer: (p, n) => [...p, ...n],
    default: () => [],
  }),
  next: Annotation<string>(),
});

async function supervisorNode(state: typeof SupervisorState.State) {
  // 决定下一步交给谁
  const decision = await supervisorModel.invoke([
    new SystemMessage("你是团队主管，决定任务分配"),
    ...state.messages,
  ]);
  return { next: decision.content }; // 'researcher' | 'writer' | 'END'
}

const graph = new StateGraph(SupervisorState)
  .addNode("supervisor", supervisorNode)
  .addNode("researcher", researcherNode)
  .addNode("writer", writerNode)
  .addConditionalEdges("supervisor", (s) => s.next, {
    researcher: "researcher",
    writer: "writer",
    END: END,
  })
  .addEdge("researcher", "supervisor")
  .addEdge("writer", "supervisor")
  .addEdge(START, "supervisor")
  .compile();
```

## 架构演进

```
┌─────────────────────────────────────────────────────────────┐
│                    M1 → M3 架构演进                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   M1 (Runtime Lab)              M3 (Agent Brain)            │
│   ┌─────────────────┐           ┌─────────────────┐         │
│   │  while (true)   │    →→→    │   StateGraph    │         │
│   │    if/else      │           │   Node/Edge     │         │
│   │    hardcode     │           │   Conditional   │         │
│   └─────────────────┘           └─────────────────┘         │
│      手工循环                      图结构驱动               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 能力对比

| 维度     | M1 (03-loop.ts)   | M3 (StateGraph)            |
| -------- | ----------------- | -------------------------- |
| 流程控制 | while + if/else   | 声明式图结构               |
| 状态管理 | 手工维护 messages | Annotation + Reducer       |
| 重试逻辑 | 无                | Conditional Edge + Counter |
| 人工介入 | 无                | Interrupt/Resume           |
| 多 Agent | 无                | Supervisor + Workers       |

## 文件结构

```
src/
├── 12-state-graph.ts     # StateGraph 入门，Node/Edge/State
├── 13-self-correction.ts # 自我修复回路，错误重试
├── 14-human-loop.ts      # 人机协作，Interrupt/Resume
├── 15-team-work.ts       # 多 Agent 协作，Supervisor 模式
└── __tests__/            # 单元测试
```

## 验收清单

| 章节 | 验收标准                | 验证方法                                       |
| ---- | ----------------------- | ---------------------------------------------- |
| Ch12 | Graph 正确执行节点流转  | 观察日志中的节点执行顺序                       |
| Ch13 | 工具报错后自动重试      | 触发模拟错误 → 观察重试日志                    |
| Ch14 | 敏感操作前暂停等待确认  | 程序打印"等待确认" → 输入 yes 继续             |
| Ch15 | Supervisor 正确分发任务 | 问"研究并写博客" → 观察 Researcher→Writer 流转 |

## 单元测试

```bash
pnpm test        # 运行测试
pnpm test:watch  # 监视模式
```

## LangGraph 核心概念速查

| 概念             | 说明               | 类比                  |
| ---------------- | ------------------ | --------------------- |
| StateGraph       | 状态图容器         | XState 的 Machine     |
| Node             | 处理状态的函数     | Redux Reducer         |
| Edge             | 节点间的连接       | 状态转移              |
| Conditional Edge | 条件路由           | Switch/Case           |
| Annotation       | 状态定义 + Reducer | Redux State + Reducer |
| Checkpointer     | 状态持久化         | 存档点                |
| Interrupt        | 执行中断           | 断点调试              |

## 学完之后

掌握了 M3 的内容，你已经理解了：

- LangGraph 状态图的设计哲学
- 声明式 Agent 编排的优势
- 错误处理与重试机制
- 人机协作的实现方式
- 多 Agent 系统的组织模式

下一步：进入 [04-next-client](../04-next-client) 学习流式 UI 交互。
