/**
 * [INPUT]: 依赖 M5 后端 /chat/stream SSE 端点
 * [OUTPUT]: Next.js Route Handler, 透传 SSE 流式响应
 * [POS]: API 路由层, 绕过 rewrite 缓冲问题, 实现真正的流式传输
 * [PROTOCOL]: 变更时更新此头部, 然后检查 CLAUDE.md
 */

import { NextRequest } from "next/server";

const M5_URL = process.env.M5_URL || "http://localhost:3001";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const response = await fetch(`${M5_URL}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  // 透传 SSE 流
  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
