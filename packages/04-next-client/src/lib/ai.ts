/**
 * [INPUT]: ai SDK (createOpenAICompatible), 环境变量
 * [OUTPUT]: model - 智谱 AI 兼容的 OpenAI 客户端
 * [POS]: 共享 AI 配置，所有 API 路由复用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const zhipu = createOpenAICompatible({
  name: "zhipu",
  baseURL: process.env.OPENAI_BASE_URL || "https://open.bigmodel.cn/api/paas/v4",
  apiKey: process.env.OPENAI_API_KEY,
});

export const model = zhipu("glm-4-flash");
