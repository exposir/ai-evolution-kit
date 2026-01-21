/**
 * [INPUT]: next, dotenv, path
 * [OUTPUT]: Next.js 配置，从根目录加载环境变量
 * [POS]: M4 配置入口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { NextConfig } from "next";
import { config } from "dotenv";
import { resolve } from "path";

// 从 monorepo 根目录加载 .env
config({ path: resolve(__dirname, "../../.env") });

const nextConfig: NextConfig = {
  // Enable experimental features for AI SDK
};

export default nextConfig;
