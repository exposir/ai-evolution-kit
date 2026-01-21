# 06-fullstack-demo/

> L2 | 父级: /CLAUDE.md

Milestone 6: Fullstack Demo - M5 后端可视化验证

## 验收状态

| 功能 | 说明 | 状态 |
| ---- | ---- | ---- |
| 健康检查 | 实时显示 M5 状态和 Redis 连接 | ✅ |
| 同步对话 | /api/chat 代理到 M5 | ✅ |
| 流式对话 | /api/chat/stream SSE 流式渲染 | ✅ |
| 会话持久化 | sessionId 跨请求保持上下文 | ✅ |

## 架构概览

```
┌─────────────────────────────────────────────────────┐
│              M6: Next.js (port 3002)                │
│  ┌─────────────────────────────────────────────┐   │
│  │              React Frontend                  │   │
│  │  - 健康状态显示                              │   │
│  │  - 同步/流式模式切换                         │   │
│  │  - 会话管理 (sessionId)                     │   │
│  └─────────────────────────────────────────────┘   │
│                        │ rewrite                    │
│                        ▼                            │
│              /api/* → localhost:3001/*              │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              M5: NestJS (port 3001)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ Ch20     │  │ Ch21     │  │ Ch22     │         │
│  │ /chat    │  │ Redis    │  │ 限流     │         │
│  └──────────┘  └──────────┘  └──────────┘         │
└─────────────────────────────────────────────────────┘
```

## 成员清单

`README.md`: 使用指南
`package.json`: 依赖配置
`next.config.ts`: API 代理配置 (rewrite to M5)
`tsconfig.json`: TypeScript 配置

```
src/app/
├── layout.tsx    : 根布局
├── page.tsx      : 验证页面 (健康检查/对话/会话管理)
└── globals.css   : Tailwind 样式
```

## 运行命令

```bash
# 方式 1: 分别启动
cd packages/05-server-core && pnpm dev  # 先启动 M5 (port 3001)
cd packages/06-fullstack-demo && pnpm dev  # 再启动 M6 (port 3002)

# 方式 2: 并行启动 (需要 concurrently)
cd packages/06-fullstack-demo && pnpm demo
```

## 验证流程

1. **Ch20 验证**: 发送任意消息，观察响应
2. **Ch21 验证**: 说 "我叫小明"，然后问 "我叫什么？"
3. **Ch22 验证**: 快速连续发送多条消息，观察 429 限流

## 技术栈

- Next.js 15 (App Router)
- React 19
- Tailwind CSS 4
- API Rewrite 代理

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
