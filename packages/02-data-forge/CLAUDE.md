# 02-data-forge/

> L2 | 父级: /CLAUDE.md

数据基础设施 - 解决"脏数据"与"失忆"问题的 3 章生产级数据处理教程

## 成员清单

```
src/
├── 09-doc-cleaner.ts   : 文档清洗，Extract → Clean → Split 三阶段管道
├── 10-vector-db.ts     : 向量数据库，Supabase + pgvector 持久化存储
├── 11-smart-search.ts  : 混合检索，Vector + Keyword + Rerank 策略
└── __tests__/
    └── (待补充)
```

## 依赖

- `openai`: OpenAI Embedding API
- `@supabase/supabase-js`: Supabase 客户端
- `pdf-parse`: PDF 文本提取
- `dotenv`: 环境变量加载

## 环境变量

```bash
OPENAI_API_KEY=sk-xxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxx
```

## 运行命令

```bash
pnpm ch9   # 文档清洗
pnpm ch10  # 向量入库
pnpm ch11  # 混合检索
```

## 核心概念

| 章节 | 核心概念 | 关键代码 |
|------|----------|----------|
| Ch9 | 递归切分 | `RecursiveSplitter` + chunkOverlap |
| Ch10 | 批量 Embedding | Rate Limit 控制 + 批量入库 |
| Ch11 | 混合检索 | `match_documents` RPC + ilike |

## 数据流

```
PDF/Markdown → Extract → Clean → Split → Embed → Supabase
                                              ↓
Query → Embed → Vector Search ──┬── Hybrid → Rerank → Results
                                └── Keyword ─┘
```

## Supabase 配置

执行以下 SQL 启用向量扩展：

```sql
-- 启用 pgvector
create extension if not exists vector;

-- 创建文档表
create table documents (
  id bigserial primary key,
  content text,
  metadata jsonb,
  embedding vector(1536)
);

-- 创建向量索引
create index on documents using ivfflat (embedding vector_cosine_ops);

-- 创建检索函数
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
  select id, content, metadata,
    1 - (embedding <=> query_embedding) as similarity
  from documents
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
```

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
