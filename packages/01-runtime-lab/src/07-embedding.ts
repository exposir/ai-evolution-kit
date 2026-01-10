/**
 * Chapter 7: RAG - Embedding (向量生成)
 * 目标：将文本转换为向量，存入内存数据库。
 *
 * 核心要点：
 * 1. 读取 txt 文件
 * 2. 将文本切分为 chunks
 * 3. 调用 OpenAI Embedding API 生成向量
 * 4. 存入内存 Database
 *
 * @module 01-runtime-lab/07-embedding
 * [INPUT]: openai (Embedding API), node:fs (文件读取)
 * [OUTPUT]: export { VectorDatabase, db, getEmbedding, splitText } - 向量数据库类与工具函数
 * [POS]: Runtime Lab 第七章，RAG 基础设施，为 08-search 提供向量数据
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================
// 内存向量数据库
// ============================================

interface Document {
  id: string;
  content: string;
  embedding: number[];
}

export class VectorDatabase {
  private documents: Document[] = [];

  /**
   * 添加文档到数据库
   */
  add(doc: Document) {
    this.documents.push(doc);
  }

  /**
   * 获取所有文档
   */
  getAll(): Document[] {
    return this.documents;
  }

  /**
   * 获取文档数量
   */
  size(): number {
    return this.documents.length;
  }
}

// 全局数据库实例
export const db = new VectorDatabase();

// ============================================
// 文本处理工具
// ============================================

/**
 * 简单的文本切分器
 * 按段落或固定长度切分
 */
function splitText(text: string, chunkSize = 200, overlap = 50): string[] {
  const chunks: string[] = [];

  // 首先按段落切分
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim());

  for (const para of paragraphs) {
    if (para.length <= chunkSize) {
      chunks.push(para.trim());
    } else {
      // 段落太长，按固定长度切分
      let start = 0;
      while (start < para.length) {
        const end = Math.min(start + chunkSize, para.length);
        chunks.push(para.slice(start, end).trim());
        start += chunkSize - overlap;
      }
    }
  }

  return chunks.filter((c) => c.length > 0);
}

/**
 * 调用 OpenAI Embedding API
 */
async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  return response.data[0].embedding;
}

// ============================================
// 主程序：构建知识库
// ============================================

async function buildKnowledgeBase() {
  console.log('='.repeat(50));
  console.log('  Chapter 7: RAG - Embedding');
  console.log('  构建向量知识库');
  console.log('='.repeat(50));
  console.log();

  // 读取知识文件
  const knowledgePath = path.join(import.meta.dirname, '..', 'knowledge.txt');
  console.log(`[1] 读取知识文件: ${knowledgePath}`);

  const text = fs.readFileSync(knowledgePath, 'utf-8');
  console.log(`    文件大小: ${text.length} 字符\n`);

  // 切分文本
  console.log('[2] 切分文本为 chunks...');
  const chunks = splitText(text);
  console.log(`    生成 ${chunks.length} 个 chunks:\n`);

  chunks.forEach((chunk, i) => {
    console.log(`    [Chunk ${i + 1}] ${chunk.slice(0, 50)}...`);
  });
  console.log();

  // 生成向量
  console.log('[3] 生成向量嵌入...');
  console.log('    使用模型: text-embedding-3-small');
  console.log('    向量维度: 1536\n');

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`    处理 Chunk ${i + 1}/${chunks.length}...`);

    const embedding = await getEmbedding(chunk);

    db.add({
      id: `doc_${i + 1}`,
      content: chunk,
      embedding: embedding,
    });
  }

  console.log(`\n[4] 知识库构建完成!`);
  console.log(`    文档数量: ${db.size()}`);
  console.log(`    向量维度: ${db.getAll()[0]?.embedding.length || 0}`);

  // 展示一个向量的前几个维度
  const sample = db.getAll()[0];
  if (sample) {
    console.log(`\n[示例] 第一个文档的向量前 5 维:`);
    console.log(`    [${sample.embedding.slice(0, 5).map((v) => v.toFixed(4)).join(', ')}, ...]`);
  }

  console.log('\n[提示] 运行 Chapter 8 (08-search.ts) 来测试向量检索');
}

// 导出供 Chapter 8 使用
export { getEmbedding, splitText };

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  buildKnowledgeBase().catch(console.error);
}
