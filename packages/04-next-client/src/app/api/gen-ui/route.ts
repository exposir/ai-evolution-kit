/**
 * [INPUT]: ai SDK (streamText, tool), zod
 * [OUTPUT]: POST /api/gen-ui - 工具调用 API，返回结构化数据供前端渲染组件
 * [POS]: Ch18 后端，AI 决定调用哪个工具，前端根据工具结果渲染组件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { streamText, tool } from "ai";
import { z } from "zod";
import { model } from "@/lib/ai";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model,
    messages,
    system: `You are a helpful assistant with access to tools.
When the user asks about weather, use the get_weather tool.
When the user asks about stocks or stock prices, use the get_stock tool.
When the user asks to show a chart or data visualization, use the show_chart tool.
For other questions, respond directly without tools.`,
    tools: {
      get_weather: tool({
        description: "Get weather information for a city",
        parameters: z.object({
          city: z.string().describe("City name"),
        }),
        execute: async ({ city }) => {
          // Mock weather data
          const weather = {
            city,
            temperature: Math.floor(Math.random() * 30) + 5,
            condition: ["Sunny", "Cloudy", "Rainy", "Snowy"][
              Math.floor(Math.random() * 4)
            ],
            humidity: Math.floor(Math.random() * 50) + 30,
            wind: Math.floor(Math.random() * 20) + 5,
          };
          return weather;
        },
      }),

      get_stock: tool({
        description: "Get stock price information",
        parameters: z.object({
          symbol: z.string().describe("Stock symbol like AAPL, GOOGL"),
        }),
        execute: async ({ symbol }) => {
          // Mock stock data
          const basePrice = symbol === "AAPL" ? 178 : symbol === "GOOGL" ? 142 : 100;
          const change = (Math.random() * 10 - 5).toFixed(2);
          return {
            symbol: symbol.toUpperCase(),
            price: (basePrice + Math.random() * 10).toFixed(2),
            change: parseFloat(change),
            changePercent: ((parseFloat(change) / basePrice) * 100).toFixed(2),
            volume: Math.floor(Math.random() * 10000000),
          };
        },
      }),

      show_chart: tool({
        description: "Show a data chart or visualization",
        parameters: z.object({
          title: z.string().describe("Chart title"),
          type: z.enum(["bar", "line", "pie"]).describe("Chart type"),
          data: z.array(
            z.object({
              label: z.string(),
              value: z.number(),
            })
          ).describe("Chart data points"),
        }),
        execute: async ({ title, type, data }) => {
          return { title, type, data };
        },
      }),
    },
    maxSteps: 3,
  });

  return result.toDataStreamResponse();
}
