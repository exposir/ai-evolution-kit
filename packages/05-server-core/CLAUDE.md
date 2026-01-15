# 05-server-core/

> L2 | 父级: /CLAUDE.md

Milestone 5: Server Core - NestJS 后端堡垒

## 验收状态

| 章节 | 功能 | 状态 |
|------|------|------|
| Ch20 | NestJS 架构 (Controller/Service/Module) | ✅ |
| Ch21 | Redis Memory (需配置 REDIS_URL) | ⏳ |
| Ch22 | Guardrails (限流/认证) | ✅ |

## 架构概览

```
src/
├── main.ts                  # 应用入口, 全局配置
├── app.module.ts            # 根模块, 汇聚所有子模块
│
├── chat/                    # Ch20: Chat 模块
│   ├── chat.module.ts       # 模块声明
│   ├── chat.controller.ts   # HTTP 路由 (POST /chat, /chat/stream)
│   ├── chat.service.ts      # AI 对话业务逻辑
│   └── dto/
│       └── chat.dto.ts      # 请求/响应数据契约
│
├── memory/                  # Ch21: Memory 模块
│   ├── memory.module.ts     # 全局模块声明
│   └── memory.service.ts    # Redis 连接 + 会话持久化
│
├── common/                  # Ch22: 通用模块
│   ├── guards/
│   │   └── auth.guard.ts    # API Key 认证守卫
│   ├── interceptors/
│   │   └── cache.interceptor.ts  # Redis 缓存拦截器
│   └── health.controller.ts # 健康检查端点
│
└── config/
    └── env.validation.ts    # 环境变量校验
```

## 成员清单

### 核心文件

`main.ts`: 应用启动器, 配置全局 ValidationPipe/CORS
`app.module.ts`: 根模块, 组装 Config/Throttler/Memory/Chat

### Chat 模块 (Ch20)

`chat/chat.module.ts`: 模块声明, 导出 ChatService
`chat/chat.controller.ts`: POST /chat (同步), POST /chat/stream (SSE), 带 ThrottlerGuard
`chat/chat.service.ts`: AI SDK 4 封装, generateText/streamText, compatibility 模式
`chat/dto/chat.dto.ts`: MessageDto, ChatRequestDto, ChatResponseDto

### Memory 模块 (Ch21)

`memory/memory.module.ts`: @Global 全局模块
`memory/memory.service.ts`: Redis 连接管理, 会话 Checkpointer, 通用缓存

### Common 模块 (Ch22)

`common/guards/auth.guard.ts`: ApiKeyGuard, @Public() 装饰器
`common/interceptors/cache.interceptor.ts`: 基于请求体 hash 的缓存拦截器
`common/health.controller.ts`: GET /health, 返回服务状态

### Config

`config/env.validation.ts`: class-validator 校验环境变量

## API 端点

| Method | Path | 说明 |
|--------|------|------|
| POST | /chat | 同步对话, 返回完整响应 |
| POST | /chat/stream | 流式对话, SSE 逐 token 返回 |
| GET | /health | 健康检查, 返回 Redis 状态 |

## 技术栈

- **框架**: NestJS 11
- **AI**: Vercel AI SDK 4 + @ai-sdk/openai (compatibility 模式)
- **缓存**: ioredis
- **校验**: class-validator + class-transformer
- **限流**: @nestjs/throttler (3 级限流: 1s/10s/60s)

## 兼容性说明

使用 AI SDK 4 (`ai@^4.0.0`) 而非 AI SDK 5/6，因为：
- AI SDK 5/6 使用新的 `/responses` API 端点
- 智谱 AI 等 OpenAI 兼容服务只支持 `/chat/completions`
- `@ai-sdk/openai` 的 `compatibility: 'compatible'` 选项在 v4 中有效

## 运行

```bash
cd packages/05-server-core
pnpm dev  # 启动 http://localhost:3001
```

## 测试请求

```bash
# 健康检查
curl http://localhost:3001/health

# 同步对话
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"hello"}]}'

# 流式对话
curl -N -X POST http://localhost:3001/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"count 1 to 5"}]}'
```

## 环境变量

| 变量 | 必需 | 说明 |
|------|------|------|
| OPENAI_API_KEY | ✅ | OpenAI/智谱 API Key |
| OPENAI_BASE_URL | ❌ | 自定义 API 端点 (智谱: `https://open.bigmodel.cn/api/paas/v4`) |
| CHAT_MODEL | ❌ | 模型名 (智谱: `glm-4-airx`, OpenAI: `gpt-4o-mini`) |
| REDIS_URL | ❌ | Redis 连接 (默认 `redis://localhost:6379`) |
| API_KEY | ❌ | 接口认证密钥 (启用 ApiKeyGuard) |

[PROTOCOL]: 变更时更新此头部, 然后检查 CLAUDE.md
