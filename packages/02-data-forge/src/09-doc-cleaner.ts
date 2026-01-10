/**
 * Chapter 9: Doc Cleaner (脏数据清洗工)
 * 目标：解决 "Garbage In, Garbage Out" 问题。
 * 将复杂的 PDF 或 Markdown 转换为 AI 易读的纯文本块。
 *
 * 核心要点：
 * 1. Extract: 提取文档内容 (PDF/Markdown/TXT)
 * 2. Clean: 清洗脏数据 (空白符、不可见字符)
 * 3. Split: 递归切分成 Chunks (保留重叠区)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ============================================
// 类型定义
// ============================================

export interface Chunk {
  id: string;
  content: string;
  metadata: {
    source: string;
    chunkIndex: number;
    charStart: number;
    charEnd: number;
  };
}

export interface SplitterOptions {
  chunkSize: number;
  chunkOverlap: number;
  separators: string[];
}

// ============================================
// 1. Extract: 文档内容提取
// ============================================

/**
 * 提取 Markdown/TXT 文件内容
 */
export function extractText(filePath: string): string {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`文件不存在: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, 'utf-8');
  console.log(`[Extract] 读取文件: ${absolutePath}`);
  console.log(`[Extract] 原始长度: ${content.length} 字符`);

  return content;
}

/**
 * 提取 PDF 文件内容
 * 注意：pdf-parse 是 CommonJS 模块，需要动态导入
 */
export async function extractPDF(filePath: string): Promise<string> {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`文件不存在: ${absolutePath}`);
  }

  // 动态导入 pdf-parse
  const pdfParse = (await import('pdf-parse')).default;
  const dataBuffer = fs.readFileSync(absolutePath);
  const data = await pdfParse(dataBuffer);

  console.log(`[Extract] 读取 PDF: ${absolutePath}`);
  console.log(`[Extract] 页数: ${data.numpages}`);
  console.log(`[Extract] 原始长度: ${data.text.length} 字符`);

  return data.text;
}

// ============================================
// 2. Clean: 文本清洗
// ============================================

/**
 * 清洗文本内容
 * - 移除多余空白符
 * - 移除不可见字符
 * - 规范化换行符
 */
export function cleanText(text: string): string {
  let cleaned = text;

  // 移除不可见字符 (保留换行和空格)
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 规范化换行符 (Windows -> Unix)
  cleaned = cleaned.replace(/\r\n/g, '\n');
  cleaned = cleaned.replace(/\r/g, '\n');

  // 移除行首尾空白
  cleaned = cleaned
    .split('\n')
    .map((line) => line.trim())
    .join('\n');

  // 移除连续空行 (保留最多两个换行)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // 移除连续空格
  cleaned = cleaned.replace(/[ \t]+/g, ' ');

  console.log(`[Clean] 清洗后长度: ${cleaned.length} 字符`);

  return cleaned.trim();
}

// ============================================
// 3. Split: 递归文本切分器
// ============================================

/**
 * RecursiveCharacterTextSplitter
 * 策略：优先在段落切分，其次句子，最后强制字符切分
 */
export class RecursiveTextSplitter {
  private chunkSize: number;
  private chunkOverlap: number;
  private separators: string[];

  constructor(options: Partial<SplitterOptions> = {}) {
    this.chunkSize = options.chunkSize ?? 500;
    this.chunkOverlap = options.chunkOverlap ?? 50;
    this.separators = options.separators ?? ['\n\n', '\n', '。', '.', ' ', ''];
  }

  /**
   * 切分文本为 Chunks
   */
  split(text: string, source = 'unknown'): Chunk[] {
    const chunks: Chunk[] = [];
    const splits = this.splitText(text, this.separators);

    let charOffset = 0;
    splits.forEach((content, index) => {
      if (content.trim()) {
        chunks.push({
          id: `chunk_${index + 1}`,
          content: content.trim(),
          metadata: {
            source,
            chunkIndex: index,
            charStart: charOffset,
            charEnd: charOffset + content.length,
          },
        });
      }
      charOffset += content.length;
    });

    console.log(`[Split] 生成 ${chunks.length} 个 Chunks`);
    return chunks;
  }

  /**
   * 递归切分逻辑
   */
  private splitText(text: string, separators: string[]): string[] {
    const finalChunks: string[] = [];

    // 获取当前分隔符
    const separator = separators[0];
    const remainingSeparators = separators.slice(1);

    // 按分隔符拆分
    let splits: string[];
    if (separator === '') {
      // 最后手段：按字符切分
      splits = this.splitByChar(text);
    } else {
      splits = text.split(separator);
    }

    // 合并小块，确保不超过 chunkSize
    let currentChunk = '';

    for (const split of splits) {
      const piece = split + (separator !== '' ? separator : '');

      if (currentChunk.length + piece.length <= this.chunkSize) {
        currentChunk += piece;
      } else {
        // 当前块已满
        if (currentChunk) {
          finalChunks.push(currentChunk);
        }

        // 如果单个 split 仍然太大，递归处理
        if (piece.length > this.chunkSize && remainingSeparators.length > 0) {
          const subChunks = this.splitText(piece, remainingSeparators);
          finalChunks.push(...subChunks);
          currentChunk = '';
        } else {
          // 保留重叠部分
          currentChunk = this.getOverlap(currentChunk) + piece;
        }
      }
    }

    // 不要忘记最后一块
    if (currentChunk) {
      finalChunks.push(currentChunk);
    }

    return finalChunks;
  }

  /**
   * 按字符强制切分
   */
  private splitByChar(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + this.chunkSize, text.length);
      chunks.push(text.slice(start, end));
      start = end - this.chunkOverlap;
      if (start < 0) start = end;
    }

    return chunks;
  }

  /**
   * 获取重叠部分
   */
  private getOverlap(text: string): string {
    if (text.length <= this.chunkOverlap) {
      return text;
    }
    return text.slice(-this.chunkOverlap);
  }
}

// ============================================
// 导出工厂函数
// ============================================

/**
 * 处理文档的完整流程
 */
export async function processDocument(
  filePath: string,
  options: Partial<SplitterOptions> = {}
): Promise<Chunk[]> {
  console.log('='.repeat(50));
  console.log('  Chapter 9: Doc Cleaner');
  console.log('='.repeat(50));
  console.log();

  // 1. Extract
  const ext = path.extname(filePath).toLowerCase();
  let rawText: string;

  if (ext === '.pdf') {
    rawText = await extractPDF(filePath);
  } else {
    rawText = extractText(filePath);
  }

  // 2. Clean
  const cleanedText = cleanText(rawText);

  // 3. Split
  const splitter = new RecursiveTextSplitter(options);
  const chunks = splitter.split(cleanedText, path.basename(filePath));

  // 输出预览
  console.log('\n[预览] 前 3 个 Chunks:');
  chunks.slice(0, 3).forEach((chunk, i) => {
    console.log(`\n  [Chunk ${i + 1}] (${chunk.content.length} 字符)`);
    console.log(`  ${chunk.content.slice(0, 100)}...`);
  });

  return chunks;
}

// ============================================
// 主程序演示
// ============================================

async function main() {
  // 创建示例文档
  const sampleDocPath = path.join(import.meta.dirname, '..', 'sample.md');

  if (!fs.existsSync(sampleDocPath)) {
    const sampleContent = `# AI Evolution Kit 项目介绍

这是一个面向 2025 年 AI 前端工程师的进阶学习项目。

## 项目目标

帮助前端开发者从 Script Boy 进化为 AI Architect。我们将深入学习：

- LLM API 调用与 Tool 定义
- RAG (检索增强生成) 原理
- MCP (Model Context Protocol) 协议
- LangGraph 状态编排
- Vercel AI SDK 与生成式 UI

## 技术栈

本项目使用以下技术：

1. TypeScript - 类型安全的 JavaScript
2. Node.js - 服务端运行时
3. OpenAI API - 大语言模型接口
4. Supabase - PostgreSQL + pgvector
5. Next.js - React 全栈框架
6. NestJS - 企业级后端框架

## 学习路线

项目分为 5 个 Milestone，共 22 个章节。每个章节都有详细的 User Story 和代码示例。

完成所有章节后，你将拥有一套工业级的 AI 基础设施。
`;
    fs.writeFileSync(sampleDocPath, sampleContent);
    console.log(`[Demo] 创建示例文档: ${sampleDocPath}\n`);
  }

  // 处理文档
  const chunks = await processDocument(sampleDocPath, {
    chunkSize: 300,
    chunkOverlap: 50,
  });

  console.log(`\n[完成] 共生成 ${chunks.length} 个 Chunks`);
  console.log('[提示] 这些 Chunks 将在 Chapter 10 中存入向量数据库');
}

// 运行
main().catch(console.error);
