/**
 * [INPUT]: 依赖 @nestjs/common, memory.service, crypto
 * [OUTPUT]: CacheInterceptor 类
 * [POS]: common 模块的缓存拦截器, 基于 Redis 的响应缓存
 * [PROTOCOL]: 变更时更新此头部, 然后检查 CLAUDE.md
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { createHash } from 'crypto';
import { MemoryService } from '../../memory/memory.service';

/* ═══════════════════════════════════════════════════════════════════════════
 * CacheInterceptor
 * - 基于请求体的缓存键生成
 * - 命中则直接返回缓存, 未命中则执行并缓存
 * - 适用于幂等查询接口
 * ═══════════════════════════════════════════════════════════════════════════ */

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);
  private readonly ttlSeconds: number;

  constructor(
    private readonly memoryService: MemoryService,
    ttlSeconds = 300, // 默认 5 分钟
  ) {
    this.ttlSeconds = ttlSeconds;
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    // Redis 未启用时直接放行
    if (!this.memoryService.isEnabled()) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const cacheKey = this.generateCacheKey(request);

    // 尝试从缓存读取
    const cached = await this.memoryService.get<unknown>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache HIT: ${cacheKey}`);
      return of(cached);
    }

    this.logger.debug(`Cache MISS: ${cacheKey}`);

    // 执行请求并缓存结果
    return next.handle().pipe(
      tap(async (response) => {
        await this.memoryService.set(cacheKey, response, this.ttlSeconds);
      }),
    );
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * 生成缓存键
   * - 基于: 方法 + 路径 + 请求体 hash
   * ───────────────────────────────────────────────────────────────────────── */
  private generateCacheKey(request: { method: string; url: string; body: unknown }): string {
    const bodyHash = createHash('md5')
      .update(JSON.stringify(request.body || {}))
      .digest('hex')
      .slice(0, 8);

    return `${request.method}:${request.url}:${bodyHash}`;
  }
}
