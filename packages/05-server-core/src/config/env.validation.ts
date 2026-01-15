/**
 * [INPUT]: 依赖 class-validator, class-transformer
 * [OUTPUT]: EnvironmentVariables 类, validate 函数
 * [POS]: config 模块的环境变量验证器, 启动时校验必需配置
 * [PROTOCOL]: 变更时更新此头部, 然后检查 CLAUDE.md
 */

import { plainToInstance } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  validateSync,
} from 'class-validator';

/* ═══════════════════════════════════════════════════════════════════════════
 * Environment Variables Schema
 * ═══════════════════════════════════════════════════════════════════════════ */

export class EnvironmentVariables {
  /* ─────────────────────────────────────────────────────────────────────────
   * OpenAI Configuration
   * ───────────────────────────────────────────────────────────────────────── */
  @IsString()
  @IsNotEmpty()
  OPENAI_API_KEY: string;

  @IsUrl()
  @IsOptional()
  OPENAI_BASE_URL?: string;

  @IsString()
  @IsOptional()
  OPENAI_MODEL?: string = 'gpt-4o-mini';

  /* ─────────────────────────────────────────────────────────────────────────
   * Redis Configuration
   * ───────────────────────────────────────────────────────────────────────── */
  @IsString()
  @IsOptional()
  REDIS_URL?: string = 'redis://localhost:6379';

  /* ─────────────────────────────────────────────────────────────────────────
   * Supabase Configuration
   * ───────────────────────────────────────────────────────────────────────── */
  @IsUrl()
  @IsOptional()
  SUPABASE_URL?: string;

  @IsString()
  @IsOptional()
  SUPABASE_SERVICE_KEY?: string;

  /* ─────────────────────────────────────────────────────────────────────────
   * Auth Configuration
   * ───────────────────────────────────────────────────────────────────────── */
  @IsString()
  @IsOptional()
  API_KEY?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Validation Function
 * - 启动时调用, 校验失败则抛出异常阻止启动
 * ═══════════════════════════════════════════════════════════════════════════ */

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
