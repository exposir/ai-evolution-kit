/**
 * [INPUT]: 依赖 @nestjs/common, @nestjs/config, @nestjs/core
 * [OUTPUT]: ApiKeyGuard 类, Public 装饰器
 * [POS]: common 模块的认证守卫, API Key 校验
 * [PROTOCOL]: 变更时更新此头部, 然后检查 CLAUDE.md
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  SetMetadata,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

/* ═══════════════════════════════════════════════════════════════════════════
 * Public Decorator
 * - 标记无需认证的路由
 * - 用法: @Public() 装饰 Controller 或 Handler
 * ═══════════════════════════════════════════════════════════════════════════ */

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/* ═══════════════════════════════════════════════════════════════════════════
 * ApiKeyGuard
 * - 校验请求头中的 X-API-Key 或 Authorization: Bearer
 * - 支持 @Public() 跳过校验
 * ═══════════════════════════════════════════════════════════════════════════ */

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);
  private readonly apiKey: string | undefined;

  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {
    this.apiKey = this.configService.get<string>('API_KEY');
  }

  canActivate(context: ExecutionContext): boolean {
    // 未配置 API_KEY 时不启用认证
    if (!this.apiKey) {
      return true;
    }

    // 检查 @Public() 装饰器
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      this.logger.warn('Missing API key in request');
      throw new UnauthorizedException('API key required');
    }

    if (token !== this.apiKey) {
      this.logger.warn('Invalid API key');
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * 提取 Token
   * - 优先级: X-API-Key > Authorization: Bearer
   * ───────────────────────────────────────────────────────────────────────── */
  private extractToken(request: {
    headers: { [key: string]: string | undefined };
  }): string | undefined {
    // X-API-Key header
    const apiKey = request.headers['x-api-key'];
    if (apiKey) return apiKey;

    // Authorization: Bearer <token>
    const auth = request.headers['authorization'];
    if (auth?.startsWith('Bearer ')) {
      return auth.slice(7);
    }

    return undefined;
  }
}
