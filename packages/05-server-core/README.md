<!--
- [INPUT]: 依赖 NestJS 与后端架构设计
- [OUTPUT]: 本文档提供 Milestone 5 的生产级后端开发指南
- [POS]: 05-server-core 的 模块文档
- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
-->

# 05-server-core

> Milestone 5: Server Core - NestJS 后端堡垒

解决并发、安全、成本问题，构建生产级 AI 后端服务。

## 目录

- [快速开始](#快速开始)
- [章节概览](#章节概览)
- [技术栈](#技术栈)
- [API 端点](#api-端点)
- [核心概念](#核心概念)
- [架构设计](#架构设计)
- [文件结构](#文件结构)
- [验收清单](#验收清单)

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8
- Redis（Ch21 需要，可选）

### 安装依赖

```bash
cd packages/05-server-core
pnpm install
```

### 配置环境变量

在项目根目录创建 `.env` 文件：

```bash
# OpenAI / 智谱 AI (必需)
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4
CHAT_MODEL=glm-4-airx

# Redis (Ch21 需要，可选)
REDIS_URL=redis://localhost:6379

# API 认证 (Ch22，可选)
API_KEY=your-secret-api-key
```

### 启动服务

```bash
pnpm dev          # 开发模式 http://localhost:3001
pnpm start:prod   # 生产模式
```

## 章节概览

| 章节 | 主题         | 学习目标                          |
| ---- | ------------ | --------------------------------- |
| Ch20 | NestJS 架构  | 掌握 Controller/Service/Module/DI |
| Ch21 | Redis Memory | 实现会话持久化与缓存              |
| Ch22 | Guardrails   | 配置限流与 API Key 认证           |

## 技术栈

| 依赖                | 版本    | 用途          |
| ------------------- | ------- | ------------- |
| `@nestjs/common`    | ^11.0.1 | NestJS 核心   |
| `@nestjs/config`    | ^4.0.2  | 配置管理      |
| `@nestjs/throttler` | ^6.5.0  | 请求限流      |
| `ai`                | ^4.0.0  | Vercel AI SDK |
| `@ai-sdk/openai`    | ^1.0.0  | OpenAI 兼容层 |
| `ioredis`           | ^5.9.1  | Redis 客户端  |
| `class-validator`   | ^0.14.3 | 请求验证      |
| `zod`               | ^3.24.1 | Schema 定义   |

## API 端点

| Method | Path           | 说明                   | 认证   |
| ------ | -------------- | ---------------------- | ------ |
| POST   | `/chat`        | 同步对话，返回完整响应 | 需要   |
| POST   | `/chat/stream` | 流式对话，SSE 逐 token | 需要   |
| GET    | `/health`      | 健康检查               | 不需要 |

### 请求示例

```bash
# 健康检查
curl http://localhost:3001/health

# 同步对话
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-api-key" \
  -d '{"messages":[{"role":"user","content":"hello"}]}'

# 流式对话
curl -N -X POST http://localhost:3001/chat/stream \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-api-key" \
  -d '{"messages":[{"role":"user","content":"count 1 to 5"}]}'
```

### 请求格式

```typescript
// ChatRequestDto
{
  messages: [
    { role: 'user' | 'assistant' | 'system', content: string }
  ],
  sessionId?: string  // 可选，用于会话持久化
}

// ChatResponseDto
{
  content: string,
  role: 'assistant',
  sessionId?: string
}
```

## 核心概念

### Ch20: NestJS 模块化架构

```typescript
// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot([
      { ttl: 1000, limit: 10 }, // 1秒10次
      { ttl: 10000, limit: 100 }, // 10秒100次
      { ttl: 60000, limit: 1000 }, // 60秒1000次
    ]),
    MemoryModule,
    ChatModule,
  ],
})
export class AppModule {}
```

```typescript
// chat/chat.controller.ts
@Controller('chat')
@UseGuards(ThrottlerGuard, AuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async chat(@Body() dto: ChatRequestDto) {
    return this.chatService.generateText(dto.messages);
  }

  @Post('stream')
  async stream(@Body() dto: ChatRequestDto, @Res() res: Response) {
    const stream = await this.chatService.streamText(dto.messages);
    // SSE 响应处理...
  }
}
```

### Ch21: Redis 会话管理

```typescript
// memory/memory.service.ts
@Injectable()
export class MemoryService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;

  async onModuleInit() {
    this.redis = new Redis(this.configService.get('REDIS_URL'));
  }

  async saveSession(sessionId: string, messages: Message[]) {
    await this.redis.set(
      `session:${sessionId}`,
      JSON.stringify(messages),
      'EX',
      3600,
    );
  }

  async getSession(sessionId: string): Promise<Message[] | null> {
    const data = await this.redis.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  async cacheResponse(key: string, value: string, ttl: number = 300) {
    await this.redis.set(`cache:${key}`, value, 'EX', ttl);
  }
}
```

### Ch22: 认证与限流

```typescript
// common/guards/auth.guard.ts
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // 检查是否标记为公开
    const isPublic = this.reflector.get<boolean>(
      'isPublic',
      context.getHandler(),
    );
    if (isPublic) return true;

    // 验证 API Key
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    const validKey = this.configService.get('API_KEY');

    if (!validKey) return true; // 未配置则跳过
    return apiKey === validKey;
  }
}

// 公开路由装饰器
export const Public = () => SetMetadata('isPublic', true);
```

```typescript
// common/interceptors/cache.interceptor.ts
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private memoryService: MemoryService) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const cacheKey = this.generateKey(request.body);

    // 尝试从缓存获取
    const cached = await this.memoryService.getCache(cacheKey);
    if (cached) return of(JSON.parse(cached));

    // 执行并缓存
    return next
      .handle()
      .pipe(
        tap((response) =>
          this.memoryService.cacheResponse(cacheKey, JSON.stringify(response)),
        ),
      );
  }
}
```

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Request                          │
└─────────────────────────────┬───────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      ThrottlerGuard                          │
│              (1s/10次, 10s/100次, 60s/1000次)                │
└─────────────────────────────┬───────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        AuthGuard                             │
│                  (X-API-Key 验证)                            │
└─────────────────────────────┬───────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     CacheInterceptor                         │
│              (基于请求体 hash 缓存)                          │
└─────────────────────────────┬───────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      ChatController                          │
│              POST /chat    POST /chat/stream                 │
└─────────────────────────────┬───────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       ChatService                            │
│           generateText()    streamText()                     │
└─────────────────────────────┬───────────────────────────────┘
                              ▼
┌──────────────────┬──────────────────────────────────────────┐
│   AI SDK v4      │            MemoryService                  │
│  (智谱 AI)       │              (Redis)                      │
└──────────────────┴──────────────────────────────────────────┘
```

## 文件结构

```
src/
├── main.ts                     # 应用入口，全局配置
├── app.module.ts               # 根模块
│
├── chat/                       # Ch20: Chat 模块
│   ├── chat.module.ts          # 模块声明
│   ├── chat.controller.ts      # HTTP 路由
│   ├── chat.service.ts         # AI 对话逻辑
│   └── dto/
│       └── chat.dto.ts         # 请求/响应契约
│
├── memory/                     # Ch21: Memory 模块
│   ├── memory.module.ts        # 全局模块声明
│   └── memory.service.ts       # Redis 连接 + 会话持久化
│
├── common/                     # Ch22: 通用模块
│   ├── guards/
│   │   └── auth.guard.ts       # API Key 认证
│   ├── interceptors/
│   │   └── cache.interceptor.ts # Redis 缓存
│   └── health.controller.ts    # 健康检查
│
└── config/
    └── env.validation.ts       # 环境变量校验
```

## 验收清单

| 章节 | 验收标准            | 验证方法                          |
| ---- | ------------------- | --------------------------------- |
| Ch20 | NestJS 接口正常响应 | `curl http://localhost:3001/chat` |
| Ch21 | Redis 保存对话历史  | 重启服务 → 历史仍在               |
| Ch22 | 限流生效            | 1分钟内发送超限请求 → 返回 429    |

### 限流测试

```bash
# 测试限流 (1秒超过10次)
for i in {1..15}; do
  curl -X POST http://localhost:3001/chat \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"hello"}]}'
  echo ""
done
# 第11条应返回 429 Too Many Requests
```

### 认证测试

```bash
# 无 API Key (应返回 401)
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"hello"}]}'

# 有 API Key (应正常响应)
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-api-key" \
  -d '{"messages":[{"role":"user","content":"hello"}]}'
```

## 兼容性说明

使用 AI SDK 4 (`ai@^4.0.0`) 而非 AI SDK 5/6，因为：

- AI SDK 5/6 使用新的 `/responses` API 端点
- 智谱 AI 等 OpenAI 兼容服务只支持 `/chat/completions`
- `@ai-sdk/openai` 的 `compatibility: 'compatible'` 选项在 v4 中有效

```typescript
// chat.service.ts
const openai = createOpenAI({
  baseURL: this.configService.get('OPENAI_BASE_URL'),
  apiKey: this.configService.get('OPENAI_API_KEY'),
  compatibility: 'compatible', // 关键配置
});
```

## 环境变量

| 变量              | 必需 | 说明                              |
| ----------------- | ---- | --------------------------------- |
| `OPENAI_API_KEY`  | ✅   | OpenAI/智谱 API Key               |
| `OPENAI_BASE_URL` | ❌   | 自定义 API 端点                   |
| `CHAT_MODEL`      | ❌   | 模型名（默认 gpt-4o-mini）        |
| `REDIS_URL`       | ❌   | Redis 连接（默认 localhost:6379） |
| `API_KEY`         | ❌   | 接口认证密钥                      |

## 测试

```bash
pnpm test        # 单元测试
pnpm test:cov    # 覆盖率报告
pnpm test:e2e    # 端到端测试
```

## 学完之后

掌握了 M5 的内容，你已经理解了：

- NestJS 模块化架构设计
- Guard 和 Interceptor 的使用
- Redis 会话管理与缓存
- 生产级 API 的安全防护

🎉 **恭喜完成全部 22 章节！**

你已经掌握了从基础 Chat 到生产级 AI 后端的完整技术栈。
