/**
 * [INPUT]: 依赖 @nestjs/core, app.module
 * [OUTPUT]: NestJS 应用启动入口
 * [POS]: 05-server-core 的启动器, 配置全局中间件
 * [PROTOCOL]: 变更时更新此头部, 然后检查 CLAUDE.md
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

/* ═══════════════════════════════════════════════════════════════════════════
 * Bootstrap - 应用启动
 * ═══════════════════════════════════════════════════════════════════════════ */

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  /* ─────────────────────────────────────────────────────────────────────────
   * Global Pipes - 全局校验
   * - transform: 自动转换请求体类型
   * - whitelist: 过滤未声明的属性
   * ───────────────────────────────────────────────────────────────────────── */
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  /* ─────────────────────────────────────────────────────────────────────────
   * CORS - 跨域配置
   * ───────────────────────────────────────────────────────────────────────── */
  app.enableCors({
    origin: true, // 开发环境允许所有来源
    credentials: true,
  });

  /* ─────────────────────────────────────────────────────────────────────────
   * Start Server
   * ───────────────────────────────────────────────────────────────────────── */
  const port = process.env.PORT ?? 3001; // 避免与 Next.js 3000 冲突
  await app.listen(port);

  logger.log(`🚀 服务器运行于 http://localhost:${port}`);
  logger.log(`📡 聊天 API: POST http://localhost:${port}/chat`);
  logger.log(`📡 流式 API: POST http://localhost:${port}/chat/stream`);
}

bootstrap();
