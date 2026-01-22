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
        B[API Route Handler]
        C[next.config.ts]
    end

    subgraph "M5 NestJS :3001"
        D[ThrottlerGuard]
        E[ChatController]
        F[ChatService]
        G[MemoryService]
    end

    subgraph "外部服务"
        H[LLM API]
        I[(Upstash Redis)]
    end

    A -->|fetch /api/chat| C
    A -->|fetch /api/chat/stream| B
    B -->|SSE Proxy| E
    C -->|rewrite| D
    D --> E
    E --> F
    F --> H
    F --> G
    G --> I

    style A fill:#e3f2fd
    style B fill:#c8e6c9
    style D fill:#fff3e0
    style I fill:#c8e6c9
```

**关键技术点**：

- **API Route Handler** (`api/chat/stream/route.ts`): 专用 SSE 流式端点，绕过 Next.js rewrite 缓冲问题
- **API Rewrite**: Next.js 将 `/api/chat` 等请求代理到 M5 后端，避免 CORS
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

### 方式 1: 一键启动（推荐）

```bash
# 从根目录运行
pnpm m6
# 同时启动 M5 (:3001) + M6 (:3002)
```

### 方式 2: 分别启动

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

### 打开浏览器

访问 http://localhost:3002

## 功能标签页

### 📊 Dashboard - 服务状态总览

- **实时监控**: M5 健康状态、Redis 连接、会话信息
- **服务统计**: 运行时长、请求计数、缓存命中率
- **架构图示**: ASCII 艺术风格的系统架构可视化

### 💬 Chat - 对话测试（Ch20）

| 测试项 | 操作 | 预期结果 |
| ------ | ---- | -------- |
| 流式对话 | 发送 "count 1 to 5" | 看到逐字打字机效果 |
| 会话持久化 | 说 "我叫小明"，再问 "我叫什么？" | AI 记住上下文 |
| 模式切换 | 切换「同步」/「流式」 | 响应方式改变 |

**特性**:
- **模式切换**: 同步模式（一次性返回） vs 流式模式（逐字显示）
- **流式指示**: 实时显示"流式传输中"状态和光标动画
- **快捷建议**: 预置常用问题，一键发送

### 🧠 Memory - 会话持久化（Ch21）

**3 步验证流程**:

1. **设置记忆**: 说 "我叫小明，请记住我的名字"
2. **追加信息**: 说 "我喜欢编程和喝咖啡"
3. **验证记忆**: 问 "我叫什么名字？我有什么爱好？"

**自由对话区**:
- 完成验证步骤后，可在此自由对话
- 测试 AI 是否记住之前的所有信息
- 支持流式传输，实时响应

**会话卡片**:
- 显示当前 sessionId
- 实时更新会话状态（活跃/新建）
- Redis 连接状态指示

### ⚡ Throttle - 限流测试（Ch22）

| 测试项 | 操作 | 预期结果 |
| ------ | ---- | -------- |
| 并发请求 | 选择 "10 个并发请求" | 部分请求返回 429 |
| 限流恢复 | 等待几秒后重试 | 请求恢复正常 |

**功能**:
- 并发请求数选择器（5/10/20/50）
- 实时统计：成功/失败/429 错误数量
- 详细结果网格：每个请求的状态和响应时间

## 技术实现

### SSE 流式端点（新架构）

为解决 Next.js rewrite 缓冲 SSE 响应的问题，我们创建了专用的 Route Handler：

```typescript
// src/app/api/chat/stream/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json();

  const response = await fetch(`${M5_URL}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  // 透传 SSE 流，不缓冲
  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

**为什么需要专用 Route Handler？**

- Next.js `rewrites` 会缓冲整个响应，破坏 SSE 流式特性
- Route Handler 直接透传 `response.body`，保持流式传输
- 前端体验：真正的逐字显示，而非等待完整响应

### API 代理配置

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/chat/stream",
        destination: "/api/chat/stream", // 使用 Route Handler
        has: [{ type: "header", key: "x-skip-rewrite" }], // 跳过此规则
      },
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/:path*", // 代理到 M5
      },
    ];
  },
};
```

### 前端流式响应处理

```typescript
// page.tsx - SSE 流式读取
const reader = res.body?.getReader();
const decoder = new TextDecoder();
let fullContent = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  for (const line of chunk.split("\n")) {
    if (line.startsWith("data: ")) {
      const data = line.slice(6);
      if (data.includes("DONE")) continue;

      try {
        const parsed = JSON.parse(data);

        // 处理 sessionId
        if (parsed.sessionId) {
          setSessionId(parsed.sessionId);
        }

        // 处理流式内容
        if (parsed.content) {
          fullContent += parsed.content;
          setStreamContent(fullContent); // 实时更新 UI
        }
      } catch {
        // 忽略解析错误
      }
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
├── next.config.ts         # API rewrite 配置
├── postcss.config.mjs     # Tailwind CSS 4 配置
├── tsconfig.json          # TypeScript 配置
└── src/app/
    ├── layout.tsx         # 根布局，Tailwind 配置
    ├── page.tsx           # 主页面，4 个标签页逻辑
    ├── globals.css        # Tailwind 样式入口
    └── api/chat/stream/
        └── route.ts       # SSE 流式端点 Route Handler
```

## 验证清单

### Ch20: NestJS 架构

| 测试项 | 操作 | 预期结果 |
| ------ | ---- | -------- |
| 流式对话 | Chat Tab，发送 "count 1 to 5" | 看到打字机效果 |
| 健康检查 | Dashboard Tab | 显示「M5: 正常」 |

### Ch21: Redis Memory

| 测试项 | 操作 | 预期结果 |
| ------ | ---- | -------- |
| 会话创建 | Memory Tab，发送第一条消息 | 顶部显示 Session ID |
| 上下文记忆 | 完成 3 步验证流程 | AI 准确回答所有信息 |
| 自由对话 | 使用「💬 自由对话」区块 | AI 保持上下文记忆 |
| Redis 状态 | Dashboard Tab | 显示「Redis: 已连接」 |

### Ch22: Guardrails

| 测试项 | 操作 | 预期结果 |
| ------ | ---- | -------- |
| 限流触发 | Throttle Tab，发送 10+ 并发请求 | 部分请求返回 429 |
| 限流恢复 | 等待几秒后重试 | 请求恢复正常 |

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
2. 检查 Memory Tab 顶部是否显示 sessionId
3. 尝试重新完成 3 步验证流程

### 流式模式没有逐字显示

1. 确认选择了「流式模式」
2. 检查浏览器开发者工具 Network 标签，确认 `Content-Type: text/event-stream`
3. 可能是网络问题，尝试刷新页面

## 相关模块

- [05-server-core](../05-server-core/README.md) - M5 NestJS 后端
- [04-next-client](../04-next-client/README.md) - M4 AI UX 组件库

## 学完之后

通过 M6 验证，你已掌握：

- **前后端协作**: Next.js + NestJS 全栈开发模式
- **API 代理**: Next.js rewrite 解决跨域问题
- **SSE 流式**: 浏览器端处理 Server-Sent Events
- **Route Handler**: 绕过 rewrite 缓冲实现真正的流式传输
- **会话管理**: 基于 sessionId 的多轮对话状态

🎉 **恭喜完成全部 6 个 Milestone！**
