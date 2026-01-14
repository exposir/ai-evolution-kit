/**
 * [INPUT]: zod
 * [OUTPUT]: itinerarySchema - 旅行计划 Schema 定义
 * [POS]: 共享 Schema，供 API 和前端复用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { z } from "zod";

export const itinerarySchema = z.object({
  destination: z.string().describe("目的地城市"),
  duration: z.string().describe("旅行天数，如 '3天2晚'"),
  budget: z.string().describe("预算范围，如 '¥3000-5000'"),
  bestSeason: z.string().describe("最佳旅行季节"),
  highlights: z.array(z.string()).describe("必去景点，3-5个"),
  dailyPlan: z.array(
    z.object({
      day: z.number().describe("第几天"),
      title: z.string().describe("当日主题"),
      activities: z.array(z.string()).describe("具体活动安排"),
      meals: z.object({
        breakfast: z.string().optional(),
        lunch: z.string().optional(),
        dinner: z.string().optional(),
      }).describe("餐饮推荐"),
    })
  ).describe("每日行程安排"),
  tips: z.array(z.string()).describe("旅行小贴士"),
});

export type Itinerary = z.infer<typeof itinerarySchema>;
