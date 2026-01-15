/**
 * [INPUT]: 依赖 ioredis, @nestjs/config
 * [OUTPUT]: MemoryService 类 (get/set/delete, getConversation/saveConversation)
 * [POS]: memory 模块的核心服务, 封装 Redis 操作和会话管理
 * [PROTOCOL]: 变更时更新此头部, 然后检查 CLAUDE.md
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/* ═══════════════════════════════════════════════════════════════════════════
 * Types
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ConversationState {
  sessionId: string;
  messages: ConversationMessage[];
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MemoryService
 * - Redis 连接管理
 * - 会话状态持久化 (Checkpointer 模式)
 * - 通用缓存操作
 * ═══════════════════════════════════════════════════════════════════════════ */

@Injectable()
export class MemoryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MemoryService.name);
  private redis: Redis | null = null;
  private readonly enabled: boolean;

  /* ─────────────────────────────────────────────────────────────────────────
   * Key Prefixes - 命名空间隔离
   * ───────────────────────────────────────────────────────────────────────── */
  private readonly PREFIX = {
    CONVERSATION: 'conv:', // 会话状态
    CACHE: 'cache:', // 通用缓存
    LOCK: 'lock:', // 分布式锁
  };

  /* ─────────────────────────────────────────────────────────────────────────
   * TTL Constants (seconds)
   * ───────────────────────────────────────────────────────────────────────── */
  private readonly TTL = {
    CONVERSATION: 60 * 60 * 24, // 24 小时
    CACHE: 60 * 5, // 5 分钟
  };

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    this.enabled = !!redisUrl;
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * Lifecycle Hooks
   * ───────────────────────────────────────────────────────────────────────── */

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.warn('Redis not configured, memory service disabled');
      return;
    }

    const redisUrl = this.configService.get<string>('REDIS_URL')!;
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis connected');
    });

    this.redis.on('error', (err) => {
      this.logger.error(`Redis error: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log('Redis disconnected');
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════════
   * Conversation State (Checkpointer)
   * - LangGraph 的状态持久化模式
   * - 支持会话恢复和多轮对话
   * ═══════════════════════════════════════════════════════════════════════════ */

  async getConversation(sessionId: string): Promise<ConversationState | null> {
    if (!this.redis) return null;

    const key = this.PREFIX.CONVERSATION + sessionId;
    const data = await this.redis.get(key);

    if (!data) return null;

    try {
      return JSON.parse(data) as ConversationState;
    } catch {
      this.logger.warn(`Failed to parse conversation: ${sessionId}`);
      return null;
    }
  }

  async saveConversation(state: ConversationState): Promise<void> {
    if (!this.redis) return;

    const key = this.PREFIX.CONVERSATION + state.sessionId;
    state.updatedAt = Date.now();

    await this.redis.setex(
      key,
      this.TTL.CONVERSATION,
      JSON.stringify(state),
    );
  }

  async deleteConversation(sessionId: string): Promise<void> {
    if (!this.redis) return;

    const key = this.PREFIX.CONVERSATION + sessionId;
    await this.redis.del(key);
  }

  async appendMessage(
    sessionId: string,
    message: Omit<ConversationMessage, 'timestamp'>,
  ): Promise<ConversationState> {
    let state = await this.getConversation(sessionId);

    if (!state) {
      state = {
        sessionId,
        messages: [],
        metadata: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }

    state.messages.push({
      ...message,
      timestamp: Date.now(),
    });

    await this.saveConversation(state);
    return state;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
   * Generic Cache Operations
   * ═══════════════════════════════════════════════════════════════════════════ */

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;

    const data = await this.redis.get(this.PREFIX.CACHE + key);
    if (!data) return null;

    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!this.redis) return;

    const ttl = ttlSeconds ?? this.TTL.CACHE;
    await this.redis.setex(
      this.PREFIX.CACHE + key,
      ttl,
      JSON.stringify(value),
    );
  }

  async delete(key: string): Promise<void> {
    if (!this.redis) return;
    await this.redis.del(this.PREFIX.CACHE + key);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
   * Utility Methods
   * ═══════════════════════════════════════════════════════════════════════════ */

  isEnabled(): boolean {
    return this.enabled && this.redis !== null;
  }

  async ping(): Promise<boolean> {
    if (!this.redis) return false;
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}
