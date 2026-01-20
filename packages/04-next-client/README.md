<!--
- [INPUT]: 依赖 Next.js 与 Vercel AI SDK 前端集成
- [OUTPUT]: 本文档提供 Milestone 4 的全栈应用前端指南
- [POS]: 04-next-client 的 模块文档
- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
-->

# 04-next-client

> Milestone 4: AI UX Engineering - 交互界面

用 Vercel AI SDK 构建丝滑的 AI 交互体验，让 AI 输出 UI，实现流式交互。

## 目录

- [快速开始](#快速开始)
- [章节概览](#章节概览)
- [技术栈](#技术栈)
- [核心概念](#核心概念)
- [架构设计](#架构设计)
- [文件结构](#文件结构)
- [验收清单](#验收清单)

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8

### 安装依赖

```bash
cd packages/04-next-client
pnpm install
```

### 配置环境变量

在项目根目录创建 `.env` 文件：

```bash
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4
CHAT_MODEL=glm-4-flash
```

### 启动开发服务器

```bash
pnpm dev    # http://localhost:3000
```

### 访问章节

| 章节 | URL                        | 功能               |
| ---- | -------------------------- | ------------------ |
| Ch16 | http://localhost:3000/ch16 | useChat 基础对话   |
| Ch17 | http://localhost:3000/ch17 | 流式 UI 打字机效果 |
| Ch18 | http://localhost:3000/ch18 | 生成式 UI 工具调用 |
| Ch19 | http://localhost:3000/ch19 | 结构化数据输出     |

## 章节概览

| 章节 | 主题              | 学习目标                    |
| ---- | ----------------- | --------------------------- |
| Ch16 | useChat Hook      | 理解 Vercel AI SDK 状态管理 |
| Ch17 | Streaming UI      | 实现 Token 级别的流式传输   |
| Ch18 | Generative UI     | 让 AI 通过工具调用渲染组件  |
| Ch19 | Structured Output | 实时填充结构化 JSON 数据    |

## 技术栈

| 依赖                        | 版本    | 用途                    |
| --------------------------- | ------- | ----------------------- |
| `next`                      | ^15.2.4 | Next.js 15 App Router   |
| `react`                     | ^19.0.0 | React 19                |
| `ai`                        | ^4.3.10 | Vercel AI SDK 核心      |
| `@ai-sdk/openai-compatible` | ^0.2.0  | OpenAI 兼容层（智谱等） |
| `zod`                       | ^3.24.1 | Schema 定义             |
| `tailwindcss`               | ^4.1.4  | 样式框架                |

## 核心概念

### Ch16: useChat Hook

```tsx
"use client";
import { useChat } from "ai/react";

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/chat",
    });

  return (
    <div>
      {messages.map((m) => (
        <div
          key={m.id}
          className={m.role === "user" ? "text-blue-500" : "text-green-500"}
        >
          {m.content}
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="输入消息..."
          disabled={isLoading}
        />
      </form>
    </div>
  );
}
```

### Ch17: 流式传输

```typescript
// app/api/chat/route.ts
import { streamText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const model = createOpenAICompatible({
  baseURL: process.env.OPENAI_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY,
  name: "zhipu",
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: model(process.env.CHAT_MODEL || "glm-4-flash"),
    messages,
  });

  return result.toDataStreamResponse();
}
```

### Ch18: 生成式 UI (GenUI)

```typescript
// app/api/gen-ui/route.ts
import { streamText, tool } from "ai";
import { z } from "zod";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: model("glm-4-flash"),
    messages,
    tools: {
      getStockPrice: tool({
        description: "获取股票价格",
        parameters: z.object({
          symbol: z.string().describe("股票代码"),
        }),
        execute: async ({ symbol }) => {
          return { symbol, price: 150.25, change: "+2.5%" };
        },
      }),
    },
  });

  return result.toDataStreamResponse();
}
```

```tsx
// app/ch18/page.tsx
"use client";
import { useChat } from "ai/react";

export default function GenUIPage() {
  const { messages } = useChat({ api: "/api/gen-ui" });

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id}>
          {m.content}

          {/* 渲染工具调用结果 */}
          {m.toolInvocations?.map((tool) => (
            <StockCard key={tool.toolCallId} data={tool.result} />
          ))}
        </div>
      ))}
    </div>
  );
}

function StockCard({ data }) {
  return (
    <div className="border rounded p-4">
      <h3>{data.symbol}</h3>
      <p className="text-2xl">${data.price}</p>
      <p className="text-green-500">{data.change}</p>
    </div>
  );
}
```

### Ch19: 结构化输出

```typescript
// app/api/structured/route.ts
import { streamObject } from "ai";
import { z } from "zod";

const TravelPlanSchema = z.object({
  destination: z.string(),
  days: z.number(),
  activities: z.array(
    z.object({
      day: z.number(),
      morning: z.string(),
      afternoon: z.string(),
      evening: z.string(),
    }),
  ),
});

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const result = streamObject({
    model: model("glm-4-flash"),
    schema: TravelPlanSchema,
    prompt,
  });

  return result.toTextStreamResponse();
}
```

```tsx
// app/ch19/page.tsx
"use client";
import { experimental_useObject as useObject } from "ai/react";

export default function StructuredPage() {
  const { object, submit, isLoading } = useObject({
    api: "/api/structured",
    schema: TravelPlanSchema,
  });

  return (
    <div>
      <button onClick={() => submit({ prompt: "规划一个 3 天的东京旅行" })}>
        生成行程
      </button>

      {/* 实时显示填充中的数据 */}
      {object && (
        <div>
          <h2>{object.destination}</h2>
          {object.activities?.map((day, i) => (
            <div key={i}>
              <h3>Day {day.day}</h3>
              <p>上午: {day.morning}</p>
              <p>下午: {day.afternoon}</p>
              <p>晚上: {day.evening}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  useChat()  │  │ useObject() │  │ Components  │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
└─────────┼────────────────┼────────────────┼─────────────────┘
          │ SSE            │ SSE            │
┌─────────▼────────────────▼────────────────▼─────────────────┐
│                 Next.js API Routes                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ streamText  │  │streamObject │  │    tool()   │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
└─────────┼────────────────┼────────────────┼─────────────────┘
          │                │                │
          ▼                ▼                ▼
       ┌─────────────────────────────────────────┐
       │          智谱 AI (glm-4-flash)           │
       └─────────────────────────────────────────┘
```

## 文件结构

```
src/
├── app/
│   ├── layout.tsx          # 全局布局，Tailwind 配置
│   ├── page.tsx            # 首页导航
│   ├── globals.css         # 全局样式
│   ├── ch16/page.tsx       # useChat 演示
│   ├── ch17/page.tsx       # Streaming UI
│   ├── ch18/page.tsx       # GenUI 生成式 UI
│   ├── ch19/page.tsx       # Structured Output
│   └── api/
│       ├── chat/route.ts       # 基础聊天 API
│       ├── gen-ui/route.ts     # 工具调用 API
│       └── structured/route.ts # 结构化输出 API
├── lib/
│   ├── ai.ts               # AI 配置，智谱兼容层
│   └── schemas.ts          # Zod Schema 定义
└── components/             # 可扩展组件库
```

## 验收清单

| 章节 | 验收标准             | 验证方法                      |
| ---- | -------------------- | ----------------------------- |
| Ch16 | useChat 管理对话状态 | 发送消息 → 自动追加到列表     |
| Ch17 | 打字机效果逐字显示   | 发送消息 → 观察流式输出       |
| Ch18 | AI 返回 React 组件   | 问"苹果股价" → 渲染 StockCard |
| Ch19 | useObject 实时填充   | 请求行程 → 观察 JSON 逐步填充 |

### 浏览器测试检查项

- [ ] 消息发送后输入框清空
- [ ] isLoading 状态正确显示
- [ ] 流式内容无闪烁
- [ ] 组件渲染无报错
- [ ] 工具调用结果正确显示

## 构建与部署

```bash
pnpm build   # 生产构建
pnpm start   # 生产运行
```

## 亮点说明

**Ch18 (GenUI) 是 v0.dev 的原理**

v0.dev 能够让 AI 直接生成 React 组件的核心机制：

1. AI 通过 `tool()` 定义返回结构化数据
2. 前端根据 `toolInvocations` 动态渲染对应组件
3. 实现了"AI 出组件"的效果

## 学完之后

掌握了 M4 的内容，你已经理解了：

- Vercel AI SDK 的核心 API
- 流式传输的实现原理
- 生成式 UI 的工作机制
- 结构化输出的应用场景

下一步：进入 [05-server-core](../05-server-core) 学习 NestJS 后端服务。
