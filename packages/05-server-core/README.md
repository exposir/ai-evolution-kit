<!--
- [INPUT]: 依赖 NestJS 与后端架构设计
- [OUTPUT]: 本文档提供 Milestone 5 的生产级后端开发指南
- [POS]: 05-server-core 的 模块文档
- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
-->

# 05-server-core

> **Milestone 5: Server Core — NestJS 后端堡垒**

解决并发、安全、成本问题，构建生产级 AI 后端服务。

## 在 AI Agent 全景中的定位

```mermaid
flowchart LR
    subgraph "M1-4 应用层"
        A[Agent + 前端]
    end

    subgraph "M5 本模块 ✅"
        B[NestJS 架构]
        C[Redis 会话]
        D[限流 + 认证]
    end

    subgraph "生产环境"
        E[高并发 + 安全]
    end

    A --> B --> C --> D --> E

    style B fill:#e3f2fd
    style D fill:#fff3e0
```

| 问题    | 解决方案     | 章节 |
| ------- | ------------ | ---- |
| 🔒 安全 | API Key 认证 | Ch22 |
| ⚡ 并发 | 请求限流     | Ch22 |
| 💾 成本 | Redis 缓存   | Ch21 |
| 📦 架构 | 模块化 DI    | Ch20 |

## 快速开始

```bash
cd packages/05-server-core
pnpm install
pnpm dev    # http://localhost:3001
```

### 环境变量

```bash
# AI (必需)
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4
CHAT_MODEL=glm-4-airx

# Redis (可选)
REDIS_URL=redis://localhost:6379

# 认证 (可选)
API_KEY=your-secret-api-key
```

## API 端点

| Method | Path         | 说明     | 认证 |
| ------ | ------------ | -------- | :--: |
| POST   | /chat        | 同步对话 |  ✅  |
| POST   | /chat/stream | 流式对话 |  ✅  |
| GET    | /health      | 健康检查 |  ❌  |

### 请求示例

```bash
# 同步对话
curl -X POST http://localhost:3001/chat \
  -H "X-API-Key: your-secret-api-key" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"hello"}]}'

# 流式对话
curl -N -X POST http://localhost:3001/chat/stream \
  -H "X-API-Key: your-secret-api-key" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"count 1 to 5"}]}'
```

## 章节导航

### Ch20: NestJS 架构 — Controller/Service/Module

模块化 + 依赖注入，告别 Express 手工装配。

```mermaid
flowchart TB
    subgraph AppModule
        subgraph ChatModule
            CC[ChatController]
            CS[ChatService]
        end
        subgraph MemoryModule
            MS[MemoryService]
        end
    end

    CC --> CS
    CS --> MS

    style CS fill:#e3f2fd
```

### Ch21: Redis Memory — 会话持久化 + 缓存

解决"重启丢失"和"重复调用"问题。

```mermaid
flowchart LR
    A[请求] --> B{缓存命中?}
    B -->|是| C[返回缓存]
    B -->|否| D[调用 LLM]
    D --> E[写入缓存]
    E --> F[返回结果]

    style C fill:#c8e6c9
```

### Ch22: Guardrails — 限流 + 认证

保护 API 免受滥用，控制访问权限。

```mermaid
flowchart TB
    A[Client Request] --> B[ThrottlerGuard]
    B -->|超限| X[429 Too Many]
    B -->|通过| C[AuthGuard]
    C -->|无 Key| Y[401 Unauthorized]
    C -->|验证通过| D[ChatController]
    D --> E[ChatService]

    style B fill:#fff3e0
    style C fill:#fff3e0
```

**限流配置**：

- 1 秒 10 次
- 10 秒 100 次
- 60 秒 1000 次

## 请求处理链路

```mermaid
flowchart TB
    REQ[Client] --> THR[ThrottlerGuard]
    THR --> AUTH[AuthGuard]
    AUTH --> CACHE[CacheInterceptor]
    CACHE --> CTRL[ChatController]
    CTRL --> SVC[ChatService]
    SVC --> AI[智谱 AI]
    SVC --> REDIS[(Redis)]

    style THR fill:#ffecb3
    style AUTH fill:#ffecb3
    style CACHE fill:#e3f2fd
```

## 文件结构

```
src/
├── main.ts              # 入口
├── app.module.ts        # 根模块
├── chat/                # Ch20
│   ├── chat.controller.ts
│   ├── chat.service.ts
│   └── dto/chat.dto.ts
├── memory/              # Ch21
│   └── memory.service.ts
├── common/              # Ch22
│   ├── guards/auth.guard.ts
│   └── interceptors/cache.interceptor.ts
└── config/
    └── env.validation.ts
```

## 验收清单

| 章节 | 验收标准     | 验证方式     |
| ---- | ------------ | ------------ |
| Ch20 | 接口正常响应 | curl /chat   |
| Ch21 | 重启后历史在 | Redis 持久化 |
| Ch22 | 限流生效     | 超限返回 429 |

### 限流测试

```bash
for i in {1..15}; do
  curl -X POST http://localhost:3001/chat \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"hi"}]}'
done
# 第 11 条应返回 429
```

## 学完之后

你已掌握：

- **NestJS 模块化**：Controller/Service/Module/DI
- **Guard 机制**：请求拦截与权限验证
- **Interceptor**：请求/响应处理管道
- **Redis 集成**：会话持久化 + 响应缓存

🎉 **恭喜完成全部 22 章节！**

你已经掌握了从基础 Chat 到生产级 AI 后端的完整技术栈：

```mermaid
flowchart LR
    M1[Runtime Lab] --> M2[Data Forge]
    M2 --> M3[Agent Brain]
    M3 --> M4[Next Client]
    M4 --> M5[Server Core]

    style M1 fill:#e3f2fd
    style M5 fill:#c8e6c9
```
