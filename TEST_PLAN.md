# AI Evolution Kit - 测试验收计划

> 每个 Milestone 完成后的验证标准

---

## 测试策略

| 类型 | 适用场景 | 工具 |
|------|----------|------|
| 单元测试 | 纯函数逻辑（无外部依赖） | Vitest |
| 验收清单 | 交互式脚本、API 调用 | 手动验证 |

---

## Milestone 1: Runtime Lab ✅

### 单元测试 (建议)

```typescript
// packages/01-runtime-lab/src/__tests__/utils.test.ts
import { describe, it, expect } from 'vitest';

describe('cosineSimilarity', () => {
  it('相同向量相似度为 1', () => {
    const vec = [1, 2, 3];
    expect(cosineSimilarity(vec, vec)).toBeCloseTo(1);
  });

  it('正交向量相似度为 0', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });
});

describe('splitText', () => {
  it('按段落切分', () => {
    const text = 'Hello\n\nWorld';
    const chunks = splitText(text);
    expect(chunks).toHaveLength(2);
  });
});
```

### 验收清单

| 章节 | 验收标准 | 命令 |
|------|----------|------|
| Ch1 | AI 能记住上一轮对话内容 | `pnpm ch1` → 输入名字 → 问"我叫什么" |
| Ch2 | AI 请求调用 calculator 工具（不执行） | `pnpm ch2` → 输入"1+1等于几" |
| Ch3 | AI 调用工具并返回正确计算结果 | `pnpm ch3` → 输入"123+456" → 返回"579" |
| Ch4 | AI 能列出当前目录文件 | `pnpm ch4` → 输入"列出文件" |
| Ch5 | MapServer 返回模拟地理数据 | `pnpm ch5` → 查看工具列表输出 |
| Ch6 | Client 动态发现并调用 Server 工具 | `pnpm ch6` → 问"北京天气" |
| Ch7 | 成功生成 1536 维向量 | `pnpm ch7` → 查看向量维度输出 |
| Ch8 | 基于知识库回答问题 | `pnpm ch8` → 问"这个项目叫什么" |

---

## Milestone 2: Data Foundation

### 单元测试

```typescript
// packages/02-data-forge/src/__tests__/cleaner.test.ts
describe('DocCleaner', () => {
  it('移除多余空白', () => {
    expect(cleanText('hello   world')).toBe('hello world');
  });

  it('RecursiveSplitter 保留重叠区', () => {
    const chunks = split(longText, { chunkSize: 100, overlap: 20 });
    // 验证相邻 chunk 有重叠
  });
});
```

### 验收清单

| 章节 | 验收标准 | 验证方法 |
|------|----------|----------|
| Ch9 | PDF 文本正确提取并切分 | 运行脚本 → 检查 chunks 数量和内容 |
| Ch10 | 向量成功写入 Supabase | 登录 Supabase → 查看 documents 表 |
| Ch11 | 混合检索返回相关结果 | 搜索"AI"→ 返回语义相关内容 |

### 外部依赖检查

- [ ] Supabase 项目已创建
- [ ] `vector` 扩展已启用
- [ ] `match_documents` RPC 函数已创建
- [ ] `.env` 包含 `SUPABASE_URL` 和 `SUPABASE_KEY`

---

## Milestone 3: Agent Brain

### 单元测试

```typescript
// packages/03-agent-brain/src/__tests__/graph.test.ts
describe('StateGraph', () => {
  it('条件边正确路由', () => {
    const state = { messages: [{ content: 'Error: xxx' }] };
    expect(shouldContinue(state)).toBe('agent'); // 重试
  });

  it('重试次数超限后终止', () => {
    const state = { retryCount: 4 };
    expect(shouldContinue(state)).toBe('END');
  });
});
```

### 验收清单

| 章节 | 验收标准 | 验证方法 |
|------|----------|----------|
| Ch12 | Graph 可视化节点流转 | 打印 graph 结构或使用 LangGraph Studio |
| Ch13 | 工具报错后自动重试 | 触发模拟错误 → 观察重试日志 |
| Ch14 | 敏感操作前暂停等待确认 | 程序打印"等待确认" → 输入 yes 继续 |
| Ch15 | Supervisor 正确分发任务 | 问"研究并写博客" → 观察 Researcher→Writer 流转 |

---

## Milestone 4: Next Client

### 验收清单

| 章节 | 验收标准 | 验证方法 |
|------|----------|----------|
| Ch16 | useChat 管理对话状态 | 浏览器输入消息 → 自动追加到列表 |
| Ch17 | 打字机效果逐字显示 | 发送消息 → 观察流式输出 |
| Ch18 | AI 返回 React 组件 | 问"苹果股价" → 渲染 StockCard 组件 |
| Ch19 | useObject 实时填充表单 | 请求生成行程 → 观察 JSON 逐步填充 |

### 浏览器测试

```bash
cd packages/04-next-client
pnpm dev
# 打开 http://localhost:3000
```

- [ ] 消息发送后输入框清空
- [ ] isLoading 状态正确显示
- [ ] 流式内容无闪烁
- [ ] 组件渲染无报错

---

## Milestone 5: Server Core

### 验收清单

| 章节 | 验收标准 | 验证方法 |
|------|----------|----------|
| Ch20 | NestJS 接口返回流式响应 | `curl -N http://localhost:3000/chat` |
| Ch21 | Redis 保存对话历史 | 重启服务 → 历史仍在 |
| Ch22 | 限流生效 | 1分钟内发送11条 → 第11条返回 429 |

### API 测试

```bash
# 测试限流
for i in {1..15}; do
  curl -X POST http://localhost:3000/chat \
    -H "Content-Type: application/json" \
    -d '{"message":"hello"}'
  echo ""
done
# 第11条应返回 429 Too Many Requests

# 测试鉴权
curl http://localhost:3000/chat
# 应返回 401 Unauthorized
```

### 集成测试

```bash
# 前后端联调
# 1. 启动 NestJS (端口 3001)
cd packages/05-server-core && pnpm start:dev

# 2. 修改 Next.js 的 API 地址指向 NestJS
# 3. 启动 Next.js (端口 3000)
cd packages/04-next-client && pnpm dev

# 4. 浏览器测试完整流程
```

---

## 测试配置

### 安装 Vitest

```bash
# 在 monorepo 根目录
pnpm add -Dw vitest @vitest/ui

# package.json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

### Vitest 配置

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/src/__tests__/**/*.test.ts'],
  },
});
```

---

## 验收进度追踪

| Milestone | 单元测试 | 验收清单 | 状态 |
|-----------|----------|----------|------|
| M1 Runtime Lab | ✅ 11/11 | ✅ 8/8 | ✅ 全部通过 |
| M2 Data Foundation | ✅ 9/9 | 🔶 1/3 | ⏳ Ch10/Ch11 需 Supabase |
| M3 Agent Brain | ⬜ | ⬜ | ⏳ 待开发 |
| M4 Next Client | ⬜ | ⬜ | ⏳ 待开发 |
| M5 Server Core | ⬜ | ⬜ | ⏳ 待开发 |

---

## 验收记录

### 2025-01-10: Milestone 1 验收

**单元测试结果**: ✅ 全部通过
```
✓ cosineSimilarity (6 tests)
  - 相同向量相似度为 1
  - 正交向量相似度为 0
  - 相反向量相似度为 -1
  - 向量维度不匹配时抛出错误
  - 零向量返回 0
  - 高维向量计算正确

✓ splitText (5 tests)
  - 按段落切分
  - 空文本返回空数组
  - 单段落不切分
  - 长段落按 chunkSize 切分
  - 多个换行符视为段落分隔

Test Files: 1 passed
Tests: 11 passed
Duration: 632ms
```

**验收清单结果**:

| 章节 | 状态 | 说明 |
|------|------|------|
| Ch1 | ⏳ | 需要 OPENAI_API_KEY |
| Ch2 | ⏳ | 需要 OPENAI_API_KEY |
| Ch3 | ⏳ | 需要 OPENAI_API_KEY |
| Ch4 | ⏳ | 需要 OPENAI_API_KEY |
| Ch5 | ✅ | MCP Server 工具列表 + 调用正确 |
| Ch6 | ⏳ | 需要 OPENAI_API_KEY |
| Ch7 | ⏳ | 需要 OPENAI_API_KEY |
| Ch8 | ⏳ | 需要 OPENAI_API_KEY |

**阻塞项**: 缺少 `.env` 配置文件，需要配置 `OPENAI_API_KEY` 后完成剩余验收

---

### 2026-01-10: M1/M2 完整验收

**环境配置**:
```
OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4
CHAT_MODEL=glm-4.7
EMBEDDING_MODEL=embedding-3
```

**M1 单元测试**: ✅ 11/11 通过
```
✓ cosineSimilarity (6 tests)
✓ splitText (5 tests)
```

**M1 验收清单**: ✅ 8/8 通过

| 章节 | 状态 | 验证结果 |
|------|------|----------|
| Ch1 | ✅ | AI 记住"小明"名字 |
| Ch2 | ✅ | AI 请求调用 calculator，参数 {a:1, b:1, operation:"add"} |
| Ch3 | ✅ | 工具执行 123+456=579 |
| Ch4 | ✅ | AI 列出目录文件（package.json, src/, 等） |
| Ch5 | ✅ | MapServer 返回 3 个工具（getLocation, getWeather, getRoute） |
| Ch6 | ✅ | Client 调用 getWeather 返回北京天气 |
| Ch7 | ✅ | 生成向量成功（embedding-3，512 维） |
| Ch8 | ✅ | RAG 检索正确回答"项目叫 AI-Evolution-Kit" |

**M2 单元测试**: ✅ 9/9 通过
```
✓ cleanText (6 tests)
✓ RecursiveTextSplitter (3 tests)
```

**M2 验收清单**: 🔶 1/3 通过

| 章节 | 状态 | 说明 |
|------|------|------|
| Ch9 | ✅ | 文档清洗切分成功，生成 3 个 Chunks |
| Ch10 | ⏳ | 需要配置 SUPABASE_URL 和 SUPABASE_SERVICE_KEY |
| Ch11 | ⏳ | 需要配置 Supabase 后验收 |
