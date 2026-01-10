/**
 * Chapter 11: Smart Search (混合检索机制)
 * 目标：实现"向量相似度"与"关键词匹配"的混合检索策略。
 *
 * 核心要点：
 * 1. 向量检索: 调用 match_documents RPC 函数
 * 2. 关键词检索: 使用 PostgreSQL ilike 模糊匹配
 * 3. Hybrid Search: 结合两种策略
 * 4. Rerank: 简易版分数阈值过滤
 */

import 'dotenv/config';
import * as readline from 'node:readline';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// ============================================
// 环境变量
// ============================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ============================================
// 类型定义
// ============================================

export interface SearchResult {
  id: number;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
  source: 'vector' | 'keyword' | 'hybrid';
}

export interface SearchOptions {
  threshold: number;      // 相似度阈值 (0-1)
  limit: number;          // 返回数量
  useHybrid: boolean;     // 是否启用混合检索
}

// ============================================
// SmartSearch 类
// ============================================

export class SmartSearch {
  private supabase: SupabaseClient;
  private openai: OpenAI;

  constructor() {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('缺少 SUPABASE_URL 或 SUPABASE_KEY');
    }
    if (!OPENAI_API_KEY) {
      throw new Error('缺少 OPENAI_API_KEY');
    }

    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    this.openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    console.log('[SmartSearch] 初始化完成');
  }

  /**
   * 生成查询向量
   */
  private async getQueryEmbedding(query: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });
    return response.data[0].embedding;
  }

  /**
   * 向量检索 (语义搜索)
   * 调用 Supabase RPC 函数 match_documents
   */
  async vectorSearch(
    query: string,
    options: Partial<SearchOptions> = {}
  ): Promise<SearchResult[]> {
    const { threshold = 0.7, limit = 5 } = options;

    console.log(`\n[向量检索] Query: "${query}"`);

    // 1. 生成查询向量
    const queryEmbedding = await this.getQueryEmbedding(query);

    // 2. 调用 RPC 函数
    const { data, error } = await this.supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
    });

    if (error) {
      console.error('[向量检索] 错误:', error.message);
      throw error;
    }

    const results: SearchResult[] = (data || []).map((row: any) => ({
      id: row.id,
      content: row.content,
      metadata: row.metadata,
      similarity: row.similarity,
      source: 'vector' as const,
    }));

    console.log(`[向量检索] 找到 ${results.length} 条结果`);
    return results;
  }

  /**
   * 关键词检索 (模糊匹配)
   * 当向量检索结果不足时的备选方案
   */
  async keywordSearch(
    query: string,
    limit = 5
  ): Promise<SearchResult[]> {
    console.log(`\n[关键词检索] Query: "${query}"`);

    // 分词 (简单按空格切分)
    const keywords = query.split(/\s+/).filter((k) => k.length > 1);

    if (keywords.length === 0) {
      return [];
    }

    // 构建 ilike 查询
    let queryBuilder = this.supabase
      .from('documents')
      .select('id, content, metadata');

    // OR 条件: 任意关键词匹配
    const orConditions = keywords.map((k) => `content.ilike.%${k}%`).join(',');
    queryBuilder = queryBuilder.or(orConditions);

    const { data, error } = await queryBuilder.limit(limit);

    if (error) {
      console.error('[关键词检索] 错误:', error.message);
      throw error;
    }

    const results: SearchResult[] = (data || []).map((row: any) => ({
      id: row.id,
      content: row.content,
      metadata: row.metadata,
      similarity: 0.5, // 关键词匹配给一个固定分数
      source: 'keyword' as const,
    }));

    console.log(`[关键词检索] 找到 ${results.length} 条结果`);
    return results;
  }

  /**
   * 混合检索
   * 策略: 优先向量检索，结果不足时补充关键词检索
   */
  async hybridSearch(
    query: string,
    options: Partial<SearchOptions> = {}
  ): Promise<SearchResult[]> {
    const { threshold = 0.7, limit = 5 } = options;

    console.log('\n' + '='.repeat(40));
    console.log('[混合检索] 开始');
    console.log('='.repeat(40));

    // 1. 向量检索
    const vectorResults = await this.vectorSearch(query, { threshold, limit });

    // 2. 如果向量结果充足，直接返回
    if (vectorResults.length >= limit) {
      console.log('[混合检索] 向量结果充足，跳过关键词检索');
      return vectorResults;
    }

    // 3. 补充关键词检索
    const remaining = limit - vectorResults.length;
    const keywordResults = await this.keywordSearch(query, remaining);

    // 4. 去重合并
    const seenIds = new Set(vectorResults.map((r) => r.id));
    const uniqueKeywordResults = keywordResults.filter((r) => !seenIds.has(r.id));

    const combined = [...vectorResults, ...uniqueKeywordResults];

    // 5. 标记混合来源
    combined.forEach((r) => {
      if (r.source === 'vector' && vectorResults.length < limit) {
        r.source = 'hybrid';
      }
    });

    console.log(`[混合检索] 最终结果: ${combined.length} 条`);
    return combined;
  }

  /**
   * Rerank: 重新排序和过滤
   * 简易版: 按相似度降序，过滤低分结果
   */
  rerank(results: SearchResult[], threshold = 0.5): SearchResult[] {
    return results
      .filter((r) => r.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity);
  }
}

// ============================================
// 交互式演示
// ============================================

async function main() {
  console.log('='.repeat(50));
  console.log('  Chapter 11: Smart Search');
  console.log('='.repeat(50));
  console.log();

  // 检查环境变量
  if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_API_KEY) {
    console.log('[错误] 请在 .env 中配置:');
    console.log('  SUPABASE_URL');
    console.log('  SUPABASE_SERVICE_KEY');
    console.log('  OPENAI_API_KEY');
    console.log('\n[提示] 请先运行 Chapter 10 插入数据');
    return;
  }

  const search = new SmartSearch();

  // 交互式搜索
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = (question: string): Promise<string> =>
    new Promise((resolve) => rl.question(question, resolve));

  console.log('输入搜索词进行混合检索');
  console.log('输入 "exit" 退出\n');

  while (true) {
    const query = await prompt('Search: ');

    if (query.toLowerCase() === 'exit') {
      console.log('再见！');
      rl.close();
      break;
    }

    if (!query.trim()) continue;

    try {
      // 执行混合检索
      const results = await search.hybridSearch(query, {
        threshold: 0.6,
        limit: 3,
      });

      // Rerank
      const reranked = search.rerank(results, 0.5);

      // 输出结果
      console.log('\n[检索结果]');
      if (reranked.length === 0) {
        console.log('  未找到相关内容');
      } else {
        reranked.forEach((r, i) => {
          console.log(`\n  [${i + 1}] 相似度: ${(r.similarity * 100).toFixed(1)}% (${r.source})`);
          console.log(`      ${r.content.slice(0, 100)}...`);
        });
      }
      console.log();
    } catch (error) {
      console.error('[错误]', error);
    }
  }
}

// 运行
main().catch(console.error);
