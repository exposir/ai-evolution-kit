# 04-next-client/

> L2 | 父级: /CLAUDE.md

AI UX 工程模块 - 用 Vercel AI SDK 构建丝滑的 AI 交互体验

## 成员清单

```
src/
├── app/
│   ├── layout.tsx          : 全局布局，Tailwind CSS 配置
│   ├── page.tsx            : 首页导航，链接到各章节
│   ├── globals.css         : 全局样式
│   ├── ch16/page.tsx       : useChat Hook 演示
│   ├── ch17/page.tsx       : Streaming UI 打字机效果
│   ├── ch18/page.tsx       : GenUI 生成式 UI，工具调用渲染组件
│   ├── ch19/page.tsx       : Structured Output 结构化数据流
│   └── api/
│       ├── chat/route.ts   : 基础聊天 API (Ch16-17)
│       ├── gen-ui/route.ts : 工具调用 API (Ch18)
│       └── structured/route.ts : 结构化输出 API (Ch19)
├── lib/
│   ├── ai.ts               : AI 配置，智谱 AI 兼容层
│   └── schemas.ts          : Zod Schema 定义
└── components/             : [空] 可扩展组件库
```

## 依赖

- `next`: Next.js 15 App Router
- `ai`: Vercel AI SDK 核心
- `@ai-sdk/openai-compatible`: OpenAI 兼容层（支持智谱等）
- `zod`: Schema 定义
- `tailwindcss`: 样式

## 运行命令

```bash
pnpm dev      # 启动开发服务器 http://localhost:3000
pnpm build    # 生产构建
pnpm start    # 生产运行
```

## 核心概念

| 章节 | 核心概念        | 关键 API                         |
| ---- | --------------- | -------------------------------- |
| Ch16 | 状态管理        | `useChat()` - 自动管理消息状态   |
| Ch17 | 流式传输        | `streamText()` + SSE             |
| Ch18 | 工具调用 + 组件 | `tool()` + `toolInvocations`     |
| Ch19 | 结构化输出      | `streamObject()` + `useObject()` |

## 架构

```
┌─────────────────────────────────────────────────────┐
│                    Browser                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  useChat()  │  │ useObject() │  │ Components  │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
└─────────┼────────────────┼────────────────┼────────┘
          │ SSE            │ SSE            │
┌─────────▼────────────────▼────────────────▼────────┐
│                 Next.js API Routes                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ streamText  │  │streamObject │  │    tool()   │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
└─────────┼────────────────┼────────────────┼────────┘
          │                │                │
          ▼                ▼                ▼
       ┌─────────────────────────────────────┐
       │          智谱 AI (glm-4-flash)       │
       └─────────────────────────────────────┘
```

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
