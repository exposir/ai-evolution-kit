/**
 * Milestone 1 单元测试
 * 测试核心纯函数逻辑（不依赖 OpenAI API）
 */

import { describe, it, expect } from 'vitest';

// ============================================
// cosineSimilarity 函数（复制自 08-search.ts）
// ============================================

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('向量维度不匹配');
  }

  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }

  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (normA * normB);
}

// ============================================
// splitText 函数（复制自 07-embedding.ts）
// ============================================

function splitText(text: string, chunkSize = 200, overlap = 50): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim());

  for (const para of paragraphs) {
    if (para.length <= chunkSize) {
      chunks.push(para.trim());
    } else {
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

// ============================================
// 测试用例
// ============================================

describe('cosineSimilarity', () => {
  it('相同向量相似度为 1', () => {
    const vec = [1, 2, 3];
    expect(cosineSimilarity(vec, vec)).toBeCloseTo(1);
  });

  it('正交向量相似度为 0', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('相反向量相似度为 -1', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  it('向量维度不匹配时抛出错误', () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow('向量维度不匹配');
  });

  it('零向量返回 0', () => {
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
  });

  it('高维向量计算正确', () => {
    const vec1 = [0.1, 0.2, 0.3, 0.4, 0.5];
    const vec2 = [0.5, 0.4, 0.3, 0.2, 0.1];
    // 点积: 0.05 + 0.08 + 0.09 + 0.08 + 0.05 = 0.35
    // |A| = sqrt(0.01+0.04+0.09+0.16+0.25) = sqrt(0.55)
    // |B| = sqrt(0.25+0.16+0.09+0.04+0.01) = sqrt(0.55)
    // cos = 0.35 / 0.55 ≈ 0.636
    expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(0.636, 2);
  });
});

describe('splitText', () => {
  it('按段落切分', () => {
    const text = 'Hello World\n\nThis is a test';
    const chunks = splitText(text);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toBe('Hello World');
    expect(chunks[1]).toBe('This is a test');
  });

  it('空文本返回空数组', () => {
    expect(splitText('')).toHaveLength(0);
  });

  it('单段落不切分', () => {
    const text = 'Short text';
    const chunks = splitText(text);
    expect(chunks).toHaveLength(1);
  });

  it('长段落按 chunkSize 切分', () => {
    const longText = 'A'.repeat(500);
    const chunks = splitText(longText, 200, 50);
    expect(chunks.length).toBeGreaterThan(1);
    // 每个 chunk 不超过 chunkSize
    chunks.forEach((chunk) => {
      expect(chunk.length).toBeLessThanOrEqual(200);
    });
  });

  it('多个换行符视为段落分隔', () => {
    const text = 'Para1\n\n\n\nPara2';
    const chunks = splitText(text);
    expect(chunks).toHaveLength(2);
  });
});
