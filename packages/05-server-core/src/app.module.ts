/**
 * [INPUT]: 依赖 @nestjs/config, @nestjs/throttler, chat.module, memory.module
 * [OUTPUT]: AppModule 根模块
 * [POS]: 应用的组装中心, 所有模块在此汇聚
 * [PROTOCOL]: 变更时更新此头部, 然后检查 CLAUDE.md
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ChatModule } from './chat/chat.module';
import { MemoryModule } from './memory/memory.module';
import { HealthController } from './common/health.controller';
import { validate } from './config/env.validation';

/* ═══════════════════════════════════════════════════════════════════════════
 * AppModule - 根模块
 * - ConfigModule: 环境变量管理, 全局单例
 * - ThrottlerModule: 限流配置 (Ch22)
 * - ChatModule: AI 对话服务 (Ch20)
 * ═══════════════════════════════════════════════════════════════════════════ */

@Module({
  imports: [
    /* ─────────────────────────────────────────────────────────────────────────
     * Config Module - 环境变量
     * - isGlobal: 全局可用, 无需重复导入
     * - validate: 启动时校验必需变量
     * ───────────────────────────────────────────────────────────────────────── */
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      envFilePath: ['.env', '../../.env'], // 支持根目录 .env
    }),

    /* ─────────────────────────────────────────────────────────────────────────
     * Throttler Module - 限流 (Ch22)
     * - ttl: 时间窗口 (毫秒)
     * - limit: 窗口内最大请求数
     * ───────────────────────────────────────────────────────────────────────── */
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 秒
        limit: 3, // 每秒最多 3 次
      },
      {
        name: 'medium',
        ttl: 10000, // 10 秒
        limit: 20, // 每 10 秒最多 20 次
      },
      {
        name: 'long',
        ttl: 60000, // 1 分钟
        limit: 100, // 每分钟最多 100 次
      },
    ]),

    /* ─────────────────────────────────────────────────────────────────────────
     * Memory Module - Redis (Ch21)
     * - Global 模块, 提供会话持久化和缓存
     * ───────────────────────────────────────────────────────────────────────── */
    MemoryModule,

    /* ─────────────────────────────────────────────────────────────────────────
     * Business Modules
     * ───────────────────────────────────────────────────────────────────────── */
    ChatModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
