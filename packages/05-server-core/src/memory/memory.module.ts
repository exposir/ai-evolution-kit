/**
 * [INPUT]: 依赖 memory.service
 * [OUTPUT]: MemoryModule 类
 * [POS]: memory 模块的组装器, 提供全局 Redis 服务
 * [PROTOCOL]: 变更时更新此头部, 然后检查 CLAUDE.md
 */

import { Global, Module } from '@nestjs/common';
import { MemoryService } from './memory.service';

/* ═══════════════════════════════════════════════════════════════════════════
 * MemoryModule
 * - Global: 全局模块, 无需重复导入
 * - 提供 Redis 连接和会话管理
 * ═══════════════════════════════════════════════════════════════════════════ */

@Global()
@Module({
  providers: [MemoryService],
  exports: [MemoryService],
})
export class MemoryModule {}
