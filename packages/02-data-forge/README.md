<!--
- [INPUT]: 依赖 基础数据处理与 RAG 知识
- [OUTPUT]: 本文档提供 Milestone 2 的数据管道构建指南
- [POS]: 02-data-forge 的 模块文档
- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
-->

# 02-data-forge

> Milestone 2: Data Foundation - 记忆宫殿

解决"脏数据"与"失忆"问题的 3 章生产级数据处理教程，从 Demo 走向生产级数据管道。

## 目录

- [快速开始](#快速开始)
- [章节概览](#章节概览)
- [技术栈](#技术栈)
- [核心概念](#核心概念)
- [数据流](#数据流)
- [Supabase 配置](#supabase-配置)
- [文件结构](#文件结构)
- [验收清单](#验收清单)

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8
- Supabase 账号（Ch10-11 需要）

### 安装依赖

```bash
cd packages/02-data-forge
pnpm install
```

### 配置环境变量

在项目根目录创建 `.env` 文件：

```bash
# OpenAI / 智谱 AI
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4
EMBEDDING_MODEL=embedding-3

# Supabase (Ch10-11 需要)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxx
```

### 运行章节

```bash
pnpm ch9   # Ch9: 文档清洗
pnpm ch10  # Ch10: 向量入库
pnpm ch11  # Ch11: 混合检索
```

## 章节概览

| 章节 | 主题       | 学习目标                            |
| ---- | ---------- | ----------------------------------- |
| Ch9  | 文档清洗   | 掌握 Extract → Clean → Split 管道   |
| Ch10 | 向量数据库 | 理解 Supabase + pgvector 持久化存储 |
| Ch11 | 混合检索   | 实现 Vector + Keyword + Rerank 策略 |

## 技术栈

| 依赖                    | 版本     | 用途            |
| ----------------------- | -------- | --------------- |
| `openai`                | ^4.77.0  | Embedding API   |
| `@supabase/supabase-js` | ^2.47.12 | Supabase 客户端 |
| `pdf-parse`             | ^1.1.1   | PDF 文本提取    |
| `dotenv`                | ^16.4.7  | 环境变量加载    |

## 核心概念

### Ch9: 递归文本切分

```typescript
class RecursiveTextSplitter {
  constructor(
    private chunkSize: number = 500,
    private chunkOverlap: number = 50,
  ) {}

  split(text: string): string[] {
    // 优先使用段落分隔
    if (text.includes("\n\n")) {
      return this.splitByDelimiter(text, "\n\n");
    }
    // 回退到句子分隔
    if (text.includes("。")) {
      return this.splitByDelimiter(text, "。");
    }
    // 最后按字符切分
    return this.splitBySize(text);
  }
}
```

### Ch10: 批量向量化

```typescript
async function batchGetEmbeddings(texts: string[]): Promise<number[][]> {
  const BATCH_SIZE = 20;
  const DELAY_MS = 1000;
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await openai.embeddings.create({ input: batch });
    results.push(...response.data.map((d) => d.embedding));

    // Rate Limit 控制
    if (i + BATCH_SIZE < texts.length) {
      await sleep(DELAY_MS);
    }
  }
  return results;
}
```

### Ch11: 混合检索

```typescript
async function hybridSearch(query: string, limit: number = 5) {
  // 1. 向量检索
  const vectorResults = await vectorSearch(query, limit);

  // 2. 关键词检索 (补充)
  const keywordResults = await keywordSearch(query, limit);

  // 3. 合并去重
  const merged = [...vectorResults];
  for (const kr of keywordResults) {
    if (!merged.find((vr) => vr.id === kr.id)) {
      merged.push(kr);
    }
  }

  // 4. 重排序
  return rerank(merged, query).slice(0, limit);
}
```

## 数据流

```
┌─────────────────────────────────────────────────────────────┐
│                        数据入库流程                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   PDF/Markdown ──▶ Extract ──▶ Clean ──▶ Split ──▶ Chunks  │
│                                                     │       │
│                                                     ▼       │
│                                              Embedding API  │
│                                                     │       │
│                                                     ▼       │
│                                              Supabase DB    │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        检索流程                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Query ──▶ Embed ──▶ Vector Search ──┬──▶ Merge ──▶ Rerank│
│                                       │                     │
│   Query ──────────▶ Keyword Search ───┘                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Supabase 配置

在 Supabase SQL Editor 中执行以下脚本：

```sql
-- 1. 启用 pgvector 扩展
create extension if not exists vector;

-- 2. 创建文档表
create table documents (
  id bigserial primary key,
  content text,
  metadata jsonb,
  embedding vector(1536)  -- OpenAI: 1536, 智谱: 512
);

-- 3. 创建向量索引 (加速检索)
create index on documents using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- 4. 创建检索函数
create or replace function match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
) returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
) language sql stable as $$
  select
    id,
    content,
    metadata,
    1 - (embedding <=> query_embedding) as similarity
  from documents
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
```

> **注意**: 如果使用智谱 AI 的 `embedding-3` 模型，向量维度为 512，需要将 `vector(1536)` 改为 `vector(512)`。

## 文件结构

```
src/
├── 09-doc-cleaner.ts   # 文档清洗，Extract → Clean → Split
├── 10-vector-db.ts     # 向量数据库，Supabase + pgvector
├── 11-smart-search.ts  # 混合检索，Vector + Keyword + Rerank
└── __tests__/          # 单元测试 (待补充)
```

## 验收清单

| 章节 | 验收标准               | 验证方法                          |
| ---- | ---------------------- | --------------------------------- |
| Ch9  | PDF 文本正确提取并切分 | 运行脚本 → 检查 chunks 数量       |
| Ch10 | 向量成功写入 Supabase  | 登录 Supabase → 查看 documents 表 |
| Ch11 | 混合检索返回相关结果   | 搜索"AI" → 返回语义相关内容       |

### 外部依赖检查

- [ ] Supabase 项目已创建
- [ ] `vector` 扩展已启用
- [ ] `match_documents` RPC 函数已创建
- [ ] `.env` 包含 `SUPABASE_URL` 和 `SUPABASE_SERVICE_KEY`

## 单元测试

```bash
# 在项目根目录运行
pnpm test
```

测试覆盖：

- `cleanText`: 多余空白移除、不可见字符清理
- `RecursiveTextSplitter`: 段落切分、重叠区保留

## 学完之后

掌握了 M2 的内容，你已经理解了：

- 文档预处理的 ETL 管道
- 向量数据库的存储与检索
- 混合检索策略的实现
- Rate Limit 的处理方式

下一步：进入 [03-agent-brain](../03-agent-brain) 学习 LangGraph 状态机编排。
