/**
 * Chapter 8: RAG - Search & Chat (向量检索与对话)
 * 目标：手动实现向量检索，并将检索结果注入 Prompt。
 *
 * 核心要点：
 * 1. 手写 cosineSimilarity 余弦相似度函数
 * 2. 检索最相关的文档
 * 3. 构造 Context Injection Prompt
 * 4. 让 LLM 基于检索到的知识回答问题
 *
 * @module 01-runtime-lab/08-search
 * [INPUT]: openai (Embedding + ChatCompletion), node:fs (知识库文件)
 * [OUTPUT]: 独立可执行脚本，内部实现 cosineSimilarity 算法
 * [POS]: Runtime Lab 第八章，RAG 完整流程演示，是 M1 的收官之作
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import 'dotenv/config';
import * as readline from 'node:readline';
import * as fs from 'node:fs';
import * as path from 'node:path';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

// ============================================
// 向量数学工具
// ============================================

/**
 * 计算余弦相似度
 * 公式: cos(θ) = (A · B) / (||A|| × ||B||)
 *
 * 这是向量检索的核心算法！
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('向量维度不匹配');
  }

  // 计算点积 (A · B)
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }

  // 计算向量模长 ||A|| 和 ||B||
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  // 避免除以零
  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (normA * normB);
}

// ============================================
// 内存向量数据库 (简化版)
// ============================================

interface Document {
  id: string;
  content: string;
  embedding: number[];
}

const documents: Document[] = [];

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

/**
 * 向量检索：找出最相似的文档
 */
function search(queryEmbedding: number[], topK = 3): Array<{ doc: Document; similarity: number }> {
  const results = documents.map((doc) => ({
    doc,
    similarity: cosineSimilarity(queryEmbedding, doc.embedding),
  }));

  // 按相似度降序排序
  results.sort((a, b) => b.similarity - a.similarity);

  return results.slice(0, topK);
}

// ============================================
// 构建知识库
// ============================================

async function buildKnowledgeBase() {
  console.log('[构建知识库]');

  const knowledgePath = path.join(import.meta.dirname, '..', 'knowledge.txt');
  const text = fs.readFileSync(knowledgePath, 'utf-8');

  // 按段落切分
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim());

  console.log(`  读取 ${paragraphs.length} 个段落`);

  for (let i = 0; i < paragraphs.length; i++) {
    const content = paragraphs[i].trim();
    if (!content) continue;

    process.stdout.write(`  向量化 ${i + 1}/${paragraphs.length}...`);
    const embedding = await getEmbedding(content);

    documents.push({
      id: `doc_${i + 1}`,
      content,
      embedding,
    });

    console.log(' 完成');
  }

  console.log(`\n[知识库就绪] 共 ${documents.length} 个文档\n`);
}

// ============================================
// RAG 增强对话
// ============================================

const messages: ChatCompletionMessageParam[] = [];

async function chat(userInput: string): Promise<string> {
  console.log('\n[RAG 检索]');

  // 1. 将用户问题转为向量
  console.log('  将问题向量化...');
  const queryEmbedding = await getEmbedding(userInput);

  // 2. 检索相关文档
  console.log('  搜索相关文档...');
  const results = search(queryEmbedding, 2);

  console.log('\n  检索结果:');
  results.forEach(({ doc, similarity }, i) => {
    console.log(`  [${i + 1}] 相似度: ${(similarity * 100).toFixed(1)}%`);
    console.log(`      内容: ${doc.content.slice(0, 60)}...`);
  });

  // 3. 构造 Context Injection Prompt
  const context = results.map((r) => r.doc.content).join('\n\n');

  const systemPrompt = `你是一个 AI 助手。请根据以下知识库内容回答用户问题。
如果知识库中没有相关信息，请诚实地说"我不知道"。

知识库内容：
---
${context}
---`;

  // 使用 RAG 上下文
  const ragMessages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages,
    { role: 'user', content: userInput },
  ];

  console.log('\n[调用 LLM]');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: ragMessages,
  });

  const reply = response.choices[0].message.content ?? '';

  // 保存对话历史
  messages.push({ role: 'user', content: userInput });
  messages.push({ role: 'assistant', content: reply });

  return reply;
}

// ============================================
// 主程序
// ============================================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function main() {
  console.log('='.repeat(50));
  console.log('  Chapter 8: RAG - Search & Chat');
  console.log('  基于向量检索的知识增强对话');
  console.log('='.repeat(50));
  console.log();

  // 构建知识库
  await buildKnowledgeBase();

  console.log('尝试问: "这个项目叫什么" 或 "MCP 是什么"');
  console.log('输入 "exit" 退出\n');

  while (true) {
    const userInput = await prompt('You: ');

    if (userInput.toLowerCase() === 'exit') {
      console.log('再见！');
      rl.close();
      break;
    }

    if (!userInput.trim()) continue;

    try {
      const reply = await chat(userInput);
      console.log(`\nAI: ${reply}\n`);
    } catch (error) {
      console.error('Error:', error);
    }
  }
}

main();
