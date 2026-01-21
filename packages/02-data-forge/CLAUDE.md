# 02-data-forge/

> L2 | 父级: /CLAUDE.md

数据基础设施 - 解决"脏数据"与"失忆"问题的 3 章生产级数据处理教程

## 成员清单

`README.md`: 数据管道构建指南

```
src/
├── 09-doc-cleaner.ts   : 文档清洗，Extract → Clean → Split 三阶段管道
├── 10-vector-db.ts     : 向量数据库，Supabase + pgvector 持久化存储
├── 11-smart-search.ts  : 混合检索，Vector + Keyword + Rerank 策略
├── setup-db.ts         : 数据库初始化脚本（打印建表 SQL）
├── test-insert.ts      : 测试脚本（绕过 Embedding 直接插入）
└── __tests__/
    └── (待补充)
```

## 依赖

- `openai`: Embedding API（兼容 OpenAI 协议的服务均可）
- `@supabase/supabase-js`: Supabase 客户端
- `pdf-parse`: PDF 文本提取
- `dotenv`: 环境变量加载

## 环境变量

从项目根目录 `/.env` 加载，无需在子目录配置：

```bash
# Embedding 配置（当前使用智谱）
OPENAI_API_KEY=xxx
OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4
EMBEDDING_MODEL=embedding-3  # 512 维

# Supabase 配置
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

| 章节 | 核心概念       | 关键代码                           |
| ---- | -------------- | ---------------------------------- |
| Ch9  | 递归切分       | `RecursiveSplitter` + chunkOverlap |
| Ch10 | 批量 Embedding | Rate Limit 控制 + 批量入库         |
| Ch11 | 混合检索       | `match_documents` RPC + ilike      |

## 数据流

```
PDF/Markdown → Extract → Clean → Split → Embed → Supabase
                                              ↓
Query → Embed → Vector Search ──┬── Hybrid → Rerank → Results
                                └── Keyword ─┘
```

## Supabase 配置

向量维度 **2048**（适配智谱 embedding-3），执行以下 SQL：

```sql
-- 启用 pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 创建文档表 (2048 维，无索引避免维度限制)
CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding VECTOR(2048),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建检索函数
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding VECTOR(2048),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
) RETURNS TABLE (
  id BIGINT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
```

## 向量维度参考

| 模型                        | 维度 |
| --------------------------- | ---- |
| 智谱 embedding-3            | 2048 |
| OpenAI text-embedding-3-small | 1536 |
| OpenAI text-embedding-ada-002 | 1536 |

> **注意**：pgvector 索引限制 2000 维，2048 维需无索引运行。数据量大时需换用 ≤2000 维的模型。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
