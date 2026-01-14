/**
 * [INPUT]: ai SDK (streamText), @/lib/ai (model)
 * [OUTPUT]: POST /api/chat - 流式聊天 API
 * [POS]: Ch16-17 共用的后端路由
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { streamText } from "ai";
import { model } from "@/lib/ai";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model,
    messages,
    system: "You are a helpful assistant. Respond concisely in the same language as the user.",
  });

  return result.toDataStreamResponse();
}
