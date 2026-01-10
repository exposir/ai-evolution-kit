/**
 * M2 单元测试: Doc Cleaner
 *
 * @module 02-data-forge/__tests__/cleaner.test
 * [INPUT]: ../09-doc-cleaner (cleanText, RecursiveTextSplitter)
 * [OUTPUT]: 测试结果
 * [POS]: Data Forge 单元测试，验证文本清洗和切分逻辑
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, it, expect } from 'vitest';
import { cleanText, RecursiveTextSplitter } from '../09-doc-cleaner.js';

describe('cleanText', () => {
  it('移除多余空格', () => {
    expect(cleanText('hello   world')).toBe('hello world');
  });

  it('规范化 Windows 换行符', () => {
    expect(cleanText('hello\r\nworld')).toBe('hello\nworld');
  });

  it('移除连续空行', () => {
    expect(cleanText('hello\n\n\n\nworld')).toBe('hello\n\nworld');
  });

  it('移除行首尾空白', () => {
    expect(cleanText('  hello  \n  world  ')).toBe('hello\nworld');
  });

  it('移除不可见字符', () => {
    expect(cleanText('hello\x00\x08world')).toBe('helloworld');
  });

  it('空文本返回空字符串', () => {
    expect(cleanText('')).toBe('');
  });
});

describe('RecursiveTextSplitter', () => {
  it('切分短文本', () => {
    const splitter = new RecursiveTextSplitter({ chunkSize: 500 });
    const text = 'Hello World';
    const chunks = splitter.split(text, 'test');

    expect(chunks.length).toBe(1);
    expect(chunks[0].content).toBe('Hello World');
  });

  it('Chunk 包含正确的 metadata', () => {
    const splitter = new RecursiveTextSplitter({ chunkSize: 500 });
    const text = 'Test content';
    const chunks = splitter.split(text, 'source.md');

    expect(chunks[0].metadata.source).toBe('source.md');
    expect(chunks[0].metadata.chunkIndex).toBe(0);
    expect(typeof chunks[0].metadata.charStart).toBe('number');
  });

  it('空文本返回空数组', () => {
    const splitter = new RecursiveTextSplitter();
    const chunks = splitter.split('', 'test');

    expect(chunks).toEqual([]);
  });
});
