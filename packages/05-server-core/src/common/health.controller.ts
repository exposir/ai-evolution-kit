/**
 * [INPUT]: 依赖 memory.service
 * [OUTPUT]: HealthController 类 (GET /health)
 * [POS]: common 模块的健康检查端点, 用于监控和调试
 * [PROTOCOL]: 变更时更新此头部, 然后检查 CLAUDE.md
 */

import { Controller, Get } from '@nestjs/common';
import { MemoryService } from '../memory/memory.service';

/* ═══════════════════════════════════════════════════════════════════════════
 * HealthController
 * - 健康检查端点, 返回服务状态
 * - 用于: 负载均衡探针, 监控系统, 调试
 * ═══════════════════════════════════════════════════════════════════════════ */

@Controller('health')
export class HealthController {
  constructor(private readonly memoryService: MemoryService) {}

  @Get()
  async check() {
    const redisOk = await this.memoryService.ping();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        redis: redisOk ? 'connected' : 'disconnected',
      },
    };
  }
}
