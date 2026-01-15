/**
 * [INPUT]: 依赖 chat.controller, chat.service
 * [OUTPUT]: ChatModule 类
 * [POS]: chat 模块的组装器, 声明 Controller/Service 关系
 * [PROTOCOL]: 变更时更新此头部, 然后检查 CLAUDE.md
 */

import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

/* ═══════════════════════════════════════════════════════════════════════════
 * ChatModule
 * - NestJS 的 Module: DI 容器的边界
 * - controllers: 注册 HTTP 入口
 * - providers: 注册可注入的服务
 * - exports: 暴露给其他模块的服务
 * ═══════════════════════════════════════════════════════════════════════════ */

@Module({
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
