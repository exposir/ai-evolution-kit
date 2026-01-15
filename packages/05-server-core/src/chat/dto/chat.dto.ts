/**
 * [INPUT]: 依赖 class-validator, class-transformer
 * [OUTPUT]: ChatRequestDto, ChatResponseDto
 * [POS]: chat 模块的数据传输对象, 定义请求/响应契约
 * [PROTOCOL]: 变更时更新此头部, 然后检查 CLAUDE.md
 */

import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

/* ═══════════════════════════════════════════════════════════════════════════
 * Message DTO
 * ═══════════════════════════════════════════════════════════════════════════ */

export class MessageDto {
  @IsString()
  @IsNotEmpty()
  role: 'user' | 'assistant' | 'system';

  @IsString()
  @IsNotEmpty()
  content: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Chat Request DTO
 * - messages: 对话历史
 * - sessionId: 会话标识, 用于状态持久化
 * ═══════════════════════════════════════════════════════════════════════════ */

export class ChatRequestDto {
  @IsArray()
  @Type(() => MessageDto)
  messages: MessageDto[];

  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsString()
  @IsOptional()
  model?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Chat Response DTO
 * ═══════════════════════════════════════════════════════════════════════════ */

export class ChatResponseDto {
  content: string;
  sessionId: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
