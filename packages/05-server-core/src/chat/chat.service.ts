/**
 * [INPUT]: 依赖 @nestjs/config, ai, @ai-sdk/openai
 * [OUTPUT]: ChatService 类 (chat, streamChat 方法)
 * [POS]: chat 模块的业务逻辑层, 封装 AI 调用
 * [PROTOCOL]: 变更时更新此头部, 然后检查 CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText, streamText } from 'ai';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';
import { randomUUID } from 'crypto';

/* ═══════════════════════════════════════════════════════════════════════════
 * ChatService
 * - NestJS 的 Service 层: 业务逻辑的归宿
 * - 通过 DI 注入 ConfigService, 获取环境变量
 * ═══════════════════════════════════════════════════════════════════════════ */

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly openai;
  private readonly model: string;

  /* ─────────────────────────────────────────────────────────────────────────
   * Constructor - 依赖注入的入口
   * - ConfigService 由 NestJS DI 容器自动注入
   * ───────────────────────────────────────────────────────────────────────── */
  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY')!;
    const baseURL = this.configService.get<string>('OPENAI_BASE_URL') || 'https://api.openai.com/v1';

    this.openai = createOpenAI({
      apiKey,
      baseURL,
      compatibility: 'compatible', // 使用 /chat/completions API
    });

    this.model = this.configService.get<string>('CHAT_MODEL') || this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o-mini';
    this.logger.log(`ChatService initialized with model: ${this.model}`);
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * chat - 同步对话 (一次性返回完整响应)
   * ───────────────────────────────────────────────────────────────────────── */
  async chat(dto: ChatRequestDto): Promise<ChatResponseDto> {
    const sessionId = dto.sessionId || randomUUID();
    const model = dto.model || this.model;

    this.logger.debug(`Processing chat request for session: ${sessionId}`);

    const messages = dto.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const result = await generateText({
      model: this.openai(model),
      messages,
    });

    return {
      content: result.text,
      sessionId,
      usage: {
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        totalTokens: result.usage.totalTokens,
      },
    };
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * streamChat - 流式对话 (SSE 逐 token 返回)
   * - 返回 AsyncIterable, 供 Controller 流式响应
   * ───────────────────────────────────────────────────────────────────────── */
  async *streamChat(dto: ChatRequestDto): AsyncIterable<string> {
    const model = dto.model || this.model;

    const messages = dto.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const result = streamText({
      model: this.openai(model),
      messages,
    });

    for await (const chunk of result.textStream) {
      yield chunk;
    }
  }
}
