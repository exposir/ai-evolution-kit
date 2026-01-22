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
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { ChatService } from './chat.service';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';

@Controller('chat')
@UseGuards(ThrottlerGuard)
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async chat(
    @Body(new ValidationPipe({ transform: true })) dto: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    return this.chatService.chat(dto);
  }

  @Post('stream')
  @HttpCode(HttpStatus.OK)
  async streamChat(
    @Body(new ValidationPipe({ transform: true })) dto: ChatRequestDto,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      for await (const chunk of this.chatService.streamChat(dto)) {
        if (chunk.type === 'sessionId') {
          res.write('data: ' + JSON.stringify({ sessionId: chunk.data }) + '\n\n');
        } else if (chunk.type === 'content') {
          res.write('data: ' + JSON.stringify({ content: chunk.data }) + '\n\n');
        }
      }
      res.write('data: 