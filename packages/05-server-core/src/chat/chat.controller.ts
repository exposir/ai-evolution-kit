/**
 * [INPUT]: 依赖 chat.service, chat.dto, @nestjs/throttler
 * [OUTPUT]: ChatController 类 (POST /chat, POST /chat/stream)
 * [POS]: chat 模块的 HTTP 入口, 路由到 Service, 带限流保护
 * [PROTOCOL]: 变更时更新此头部, 然后检查 CLAUDE.md
 */

import {
  Body,
  Controller,
  Post,
  Res,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard, SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ChatService } from './chat.service';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';

/* ═══════════════════════════════════════════════════════════════════════════
 * ChatController
 * - NestJS 的 Controller 层: HTTP 请求的门面
 * - 职责: 参数校验、路由分发、响应格式化
 * - 业务逻辑委托给 Service
 * - ThrottlerGuard: 多级限流保护 (Ch22)
 * ═══════════════════════════════════════════════════════════════════════════ */

@Controller('chat')
@UseGuards(ThrottlerGuard)
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  /* ─────────────────────────────────────────────────────────────────────────
   * POST /chat - 同步对话
   * - ValidationPipe: 自动校验 DTO, 失败返回 400
   * ───────────────────────────────────────────────────────────────────────── */
  @Post()
  @HttpCode(HttpStatus.OK)
  async chat(
    @Body(new ValidationPipe({ transform: true })) dto: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    this.logger.log(`Received chat request with ${dto.messages.length} messages`);
    return this.chatService.chat(dto);
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * POST /chat/stream - 流式对话 (SSE)
   * - 手动控制 Response, 实现 Server-Sent Events
   * - Content-Type: text/event-stream
   * ───────────────────────────────────────────────────────────────────────── */
  @Post('stream')
  @HttpCode(HttpStatus.OK)
  async streamChat(
    @Body(new ValidationPipe({ transform: true })) dto: ChatRequestDto,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`Received stream request with ${dto.messages.length} messages`);

    // SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // 禁用 Nginx 缓冲

    try {
      for await (const chunk of this.chatService.streamChat(dto)) {
        // SSE 格式: data: {content}\n\n
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
      // 流结束标记
      res.write(`data: [DONE]\n\n`);
    } catch (error) {
      this.logger.error(`Stream error: ${error.message}`);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    } finally {
      res.end();
    }
  }
}
