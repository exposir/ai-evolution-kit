<!--
- [INPUT]: 依赖 M5 NestJS 后端
- [OUTPUT]: 本文档提供 M6 全栈验证使用指南
- [POS]: 06-fullstack-demo 的模块文档
- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
-->

# 06-fullstack-demo

> **Milestone 6: Fullstack Demo — M5 可视化验证**

通过图形界面验证 M5 NestJS 后端的全部功能，体验完整的前后端协作流程。

## 在全栈架构中的定位

```mermaid
flowchart TB
    subgraph "前端层"
        M4[M4: Next.js Client]
        M6[M6: Fullstack Demo]
    end

    subgraph "后端层"
        M5[M5: NestJS Server]
    end

    subgraph "基础设施"
        LLM[LLM Provider]
        Redis[(Redis)]
    end

    M4 --> M5
    M6 --> M5
    M5 --> LLM
    M5 --> Redis

    style M6 fill:#e3f2fd
    style M5 fill:#fff3e0
```

| 模块 | 职责 | 技术栈 |
| ---- | ---- | ------ |
| M4 | AI UX 组件库 | Next.js + Vercel AI SDK |
| M5 | 生产级后端 | NestJS + Redis |
| **M6** | **全栈验证** | **Next.js → NestJS** |

## 架构详解

```mermaid
flowchart LR
    subgraph "M6 Next.js :3002"
        A[React UI]
        B[next.config.ts]
    end

    subgraph "M5 NestJS :3001"
        C[ThrottlerGuard]
        D[ChatController]
        E[ChatService]
        F[MemoryService]
    end

    subgraph "外部服务"
        G[LLM API]
        H[(Upstash Redis)]
    end

    A -->|fetch /api/*| B
    B -->|rewrite| C
    C --> D
    D --> E
    E --> G
    E --> F
    F --> H

    style A fill:#e3f2fd
    style C fill:#fff3e0
    style H fill:#c8e6c9
```

**关键技术点**：
- **API Rewrite**: Next.js 将 `/api/*` 请求代理到 M5 后端，避免 CORS 问题
- **ThrottlerGuard**: M5 的限流守卫保护 API 不被滥用
- **MemoryService**: Redis 实现会话持久化，支持多轮对话上下文

## 快速开始

### 前置条件

确保根目录 `.env` 已配置：

```bash
# LLM 配置
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://api.example.com/v1
CHAT_MODEL=your-model-name

# Redis 配置 (可选，用于会话持久化)
REDIS_URL=rediss://default:xxx@xxx.upstash.io:6379
```

### 方式 1: 分别启动

```bash
# 终端 1: 启动 M5 后端
cd packages/05-server-core
pnpm dev
# 运行在 http://localhost:3001

# 终端 2: 启动 M6 前端
cd packages/06-fullstack-demo
pnpm install
pnpm dev
# 运行在 http://localhost:3002
```

### 方式 2: 一键启动

```bash
cd packages/06-fullstack-demo
pnpm demo  # 同时启动 M5 + M6
```

### 打开浏览器

访问 http://localhost:3002

## 验证清单

### Ch20: NestJS 架构

| 测试项 | 操作 | 预期结果 |
| ------ | ---- | -------- |
| 同步对话 | 切换到「同步模式」，发送 "hello" | 收到完整 AI 响应 |
| 流式对话 | 切换到「流式模式」，发送 "count 1 to 5" | 看到打字机效果 |
| 健康检查 | 观察顶部状态栏 | 显示「M5: 正常」 |

### Ch21: Redis Memory

| 测试项 | 操作 | 预期结果 |
| ------ | ---- | -------- |
| 会话创建 | 发送第一条消息 | 顶部显示 Session ID |
| 上下文记忆 | 说 "我叫小明"，再问 "我叫什么？" | AI 回答 "小明" |
| 会话重置 | 点击「重置会话」 | Session ID 消失，历史清空 |
| Redis 状态 | 观察顶部状态栏 | 显示「Redis: 已连接」 |

### Ch22: Guardrails

| 测试项 | 操作 | 预期结果 |
| ------ | ---- | -------- |
| 限流触发 | 1 秒内快速点击发送 5+ 次 | 部分请求显示错误（429） |
| 限流恢复 | 等待几秒后重试 | 请求恢复正常 |

## 功能特性

### 实时健康监控

```
┌──────────────────────────────────────┐
│ [M5: 正常] [Redis: 已连接] [Session] │
└──────────────────────────────────────┘
```

- **M5 状态**: 每 10 秒自动检查后端健康
- **Redis 状态**: 显示会话持久化是否可用
- **Session ID**: 当前会话标识，用于多轮对话

### 对话模式切换

| 模式 | API | 特点 |
| ---- | --- | ---- |
| 同步模式 | POST /chat | 等待完整响应后显示 |
| 流式模式 | POST /chat/stream | SSE 逐字显示，打字机效果 |

### 会话管理

- **自动创建**: 首次对话自动生成 sessionId
- **持久化**: 使用相同 sessionId 保持上下文（需 Redis）
- **手动重置**: 点击「重置会话」开始新对话

## 界面预览

```
┌─────────────────────────────────────────────────────────┐
│  M6: Fullstack Demo                                     │
│  验证 M5 NestJS 后端 (Next.js 前端 + NestJS 后端)        │
├─────────────────────────────────────────────────────────┤
│  [M5: 正常] [Redis: 已连接] [Session: a1b2c3d4...]      │
│                                                         │
│  [同步模式] [流式模式] [重置会话]                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                             你  │   │
│  │  我叫小明，请记住我的名字                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  AI                                             │   │
│  │  好的，我记住了！你叫小明。有什么可以帮你的？    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                             你  │   │
│  │  我叫什么名字？                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  AI                                             │   │
│  │  你叫小明！我刚才记住的。😊                      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [输入消息...]                              [发送]      │
└─────────────────────────────────────────────────────────┘
```

## 技术实现

### API 代理配置

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/:path*",
      },
    ];
  },
};
```

### 流式响应处理

```typescript
// page.tsx - SSE 流式读取
const reader = res.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  // 解析 SSE data: 格式
  for (const line of chunk.split("\n")) {
    if (line.startsWith("data: ")) {
      const parsed = JSON.parse(line.slice(6));
      // 逐字更新 UI
    }
  }
}
```

## 文件结构

```
06-fullstack-demo/
├── CLAUDE.md              # 架构文档 (L2)
├── README.md              # 使用指南 (本文件)
├── package.json           # 依赖配置
├── next.config.ts         # API rewrite → M5
├── tsconfig.json          # TypeScript 配置
└── src/app/
    ├── layout.tsx         # 根布局，Tailwind 配置
    ├── page.tsx           # 验证页面，核心逻辑
    └── globals.css        # Tailwind 样式入口
```

## 常见问题

### M5 状态显示「离线」

1. 确认 M5 后端正在运行：`curl http://localhost:3001/health`
2. 检查端口是否被占用：`lsof -i :3001`

### Redis 状态显示「未知」

1. 确认 `.env` 中配置了 `REDIS_URL`
2. 检查 Redis 连接是否有效
3. 无 Redis 时功能可用，但会话持久化失效

### 会话记忆不生效

1. 确认 Redis 已连接
2. 检查是否使用了相同的 sessionId
3. 尝试点击「重置会话」后重新测试

### 限流测试不触发 429

1. 需要真正的并发请求（快速连续点击）
2. M5 限流配置：1 秒 3 次
3. 单次点击间隔可能超过限流窗口

## 相关模块

- [05-server-core](../05-server-core/README.md) - M5 NestJS 后端
- [04-next-client](../04-next-client/README.md) - M4 AI UX 组件库

## 学完之后

通过 M6 验证，你已掌握：

- **前后端协作**: Next.js + NestJS 全栈开发模式
- **API 代理**: Next.js rewrite 解决跨域问题
- **SSE 流式**: 浏览器端处理 Server-Sent Events
- **会话管理**: 基于 sessionId 的多轮对话状态

🎉 **恭喜完成全部 6 个 Milestone！**
