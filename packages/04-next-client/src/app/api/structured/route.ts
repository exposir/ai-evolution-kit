/**
 * [INPUT]: ai SDK (streamObject), @/lib/schemas, @/lib/ai
 * [OUTPUT]: POST /api/structured - 结构化输出流式 API
 * [POS]: Ch19 后端，AI 逐步生成 JSON 对象
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { streamObject } from "ai";
import { model } from "@/lib/ai";
import { itinerarySchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const { destination } = await req.json();

  const result = streamObject({
    model,
    schema: itinerarySchema,
    prompt: `为去${destination}旅行的游客生成一份详细的旅行计划。
包括3天的行程安排，每天有具体的活动和餐饮推荐。
请用中文回复，内容要实用且有当地特色。`,
  });

  return result.toTextStreamResponse();
}
