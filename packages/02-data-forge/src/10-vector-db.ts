/**
 * Chapter 10: Vector DB (构建记忆库)
 * 目标：配置 Supabase (PostgreSQL + pgvector)，实现向量持久化存储。
 *
 * 核心要点：
 * 1. Supabase 配置与连接
 * 2. 批量生成 Embedding (注意 Rate Limit)
 * 3. 向量数据入库
 *
 * 前置条件：
 * 1. 注册 Supabase 账号
 * 2. 创建项目获取 URL 和 Key
 * 3. 执行 SQL 启用 vector 扩展
 */

import 'dotenv/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { Chunk, processDocument } from './09-doc-cleaner.js';

// ============================================
// 环境变量检查
// ============================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ============================================
// 类型定义
// ============================================

export interface DocumentRow {
  id?: number;
  content: string;
  metadata: Record<string, unknown>;
  embedding: number[];
}

// ============================================
// Supabase 建表 SQL (需要在 Supabase 后台执行)
// ============================================

export const SETUP_SQL = `
-- 1. 启用 vector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. 创建文档表
CREATE TABLE IF NOT EXISTS documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 创建向量索引 (提升检索性能)
CREATE INDEX IF NOT EXISTS documents_embedding_idx
ON documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 4. 创建检索函数
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id BIGINT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
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
`;

// ============================================
// VectorDB 类
// ============================================

export class VectorDB {
  private supabase: SupabaseClient;
  private openai: OpenAI;

  constructor() {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('缺少 SUPABASE_URL 或 SUPABASE_KEY 环境变量');
    }
    if (!OPENAI_API_KEY) {
      throw new Error('缺少 OPENAI_API_KEY 环境变量');
    }

    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    this.openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    console.log('[VectorDB] 初始化完成');
    console.log(`[VectorDB] Supabase URL: ${SUPABASE_URL}`);
  }

  /**
   * 生成单个文本的 Embedding
   */
  async getEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }

  /**
   * 批量生成 Embedding (带 Rate Limit 控制)
   */
  async batchGetEmbeddings(
    texts: string[],
    batchSize = 20,
    delayMs = 500
  ): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      console.log(`[Embedding] 处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`);

      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch,
      });

      embeddings.push(...response.data.map((d) => d.embedding));

      // Rate Limit 保护
      if (i + batchSize < texts.length) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return embeddings;
  }

  /**
   * 将 Chunks 存入数据库
   */
  async insertChunks(chunks: Chunk[]): Promise<void> {
    console.log(`\n[Insert] 准备插入 ${chunks.length} 条记录`);

    // 1. 批量生成 Embedding
    const texts = chunks.map((c) => c.content);
    const embeddings = await this.batchGetEmbeddings(texts);

    // 2. 构建插入数据
    const rows: DocumentRow[] = chunks.map((chunk, i) => ({
      content: chunk.content,
      metadata: chunk.metadata,
      embedding: embeddings[i],
    }));

    // 3. 批量插入 (Supabase 单次最多 1000 条)
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);

      const { error } = await this.supabase
        .from('documents')
        .insert(batch);

      if (error) {
        console.error(`[Insert] 批次 ${i / batchSize + 1} 失败:`, error.message);
        throw error;
      }

      console.log(`[Insert] 批次 ${Math.floor(i / batchSize) + 1} 完成`);
    }

    console.log(`[Insert] 全部插入完成!`);
  }

  /**
   * 清空文档表
   */
  async clearDocuments(): Promise<void> {
    const { error } = await this.supabase
      .from('documents')
      .delete()
      .neq('id', 0); // 删除所有记录

    if (error) {
      throw new Error(`清空失败: ${error.message}`);
    }
    console.log('[VectorDB] 文档表已清空');
  }

  /**
   * 获取文档数量
   */
  async getDocumentCount(): Promise<number> {
    const { count, error } = await this.supabase
      .from('documents')
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw new Error(`查询失败: ${error.message}`);
    }
    return count ?? 0;
  }
}

// ============================================
// 主程序演示
// ============================================

async function main() {
  console.log('='.repeat(50));
  console.log('  Chapter 10: Vector DB');
  console.log('='.repeat(50));
  console.log();

  // 检查环境变量
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('[错误] 请在 .env 中配置以下环境变量:');
    console.log('  SUPABASE_URL=https://xxx.supabase.co');
    console.log('  SUPABASE_SERVICE_KEY=eyJxxx...');
    console.log('\n[提示] 请先在 Supabase 后台执行以下 SQL:');
    console.log(SETUP_SQL);
    return;
  }

  if (!OPENAI_API_KEY) {
    console.log('[错误] 请在 .env 中配置 OPENAI_API_KEY');
    return;
  }

  try {
    // 1. 处理文档
    const chunks = await processDocument('../sample.md', {
      chunkSize: 300,
      chunkOverlap: 50,
    });

    // 2. 初始化 VectorDB
    const db = new VectorDB();

    // 3. 查询当前文档数
    const countBefore = await db.getDocumentCount();
    console.log(`\n[状态] 当前文档数: ${countBefore}`);

    // 4. 插入新文档
    await db.insertChunks(chunks);

    // 5. 验证插入结果
    const countAfter = await db.getDocumentCount();
    console.log(`\n[状态] 插入后文档数: ${countAfter}`);
    console.log(`[状态] 新增: ${countAfter - countBefore} 条`);

    console.log('\n[完成] 向量数据已持久化到 Supabase');
    console.log('[提示] 运行 Chapter 11 测试检索功能');
  } catch (error) {
    console.error('[错误]', error);
  }
}

// 运行
main().catch(console.error);
