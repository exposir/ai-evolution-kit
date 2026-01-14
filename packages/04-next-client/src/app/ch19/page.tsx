"use client";

/**
 * [INPUT]: ai/react (useObject), zod, React
 * [OUTPUT]: Ch19 演示页面 - 结构化输出，实时填充表单
 * [POS]: M4 第四章，展示 AI 逐步生成 JSON 对象的能力
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { experimental_useObject as useObject } from "ai/react";
import Link from "next/link";
import { useState } from "react";
import { itinerarySchema, type Itinerary } from "@/lib/schemas";

export default function Ch19Page() {
  const [destination, setDestination] = useState("");

  const { object, submit, isLoading, error } = useObject({
    api: "/api/structured",
    schema: itinerarySchema,
  });

  const itinerary = object as Partial<Itinerary> | undefined;

  const suggestions = ["北京", "上海", "成都", "杭州", "西安"];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (destination.trim()) {
      submit({ destination });
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/" className="text-blue-600 hover:underline text-sm">
          ← 返回首页
        </Link>
        <h1 className="text-2xl font-bold mt-2">Ch19: Structured Output</h1>
        <p className="text-gray-600 text-sm">
          结构化数据流 - 实时生成并填充复杂对象
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">🗺️ AI 旅行计划生成器</h2>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="输入目的地城市..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !destination.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? "生成中..." : "生成计划"}
          </button>
        </form>

        <div className="flex gap-2 mt-3">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => setDestination(s)}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
          Error: {error.message}
        </div>
      )}

      {/* Itinerary Display */}
      {itinerary && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl p-6 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm opacity-80">目的地</p>
                <h2 className="text-3xl font-bold">
                  {itinerary.destination || (
                    <span className="animate-pulse bg-white/20 rounded px-8 py-1">...</span>
                  )}
                </h2>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-80">行程</p>
                <p className="text-xl font-semibold">
                  {itinerary.duration || "..."}
                </p>
              </div>
            </div>

            <div className="flex gap-6 mt-6">
              <div>
                <p className="text-sm opacity-80">预算</p>
                <p className="font-medium">{itinerary.budget || "计算中..."}</p>
              </div>
              <div>
                <p className="text-sm opacity-80">最佳季节</p>
                <p className="font-medium">{itinerary.bestSeason || "分析中..."}</p>
              </div>
            </div>
          </div>

          {/* Highlights */}
          {itinerary.highlights && itinerary.highlights.length > 0 && (
            <div className="bg-white border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-3">✨ 必去景点</h3>
              <div className="flex flex-wrap gap-2">
                {itinerary.highlights.map((h, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Daily Plan */}
          {itinerary.dailyPlan && itinerary.dailyPlan.length > 0 && (
            <div className="bg-white border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">📅 每日行程</h3>
              <div className="space-y-4">
                {itinerary.dailyPlan.map((day, i) => (
                  <div key={i} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="flex items-center gap-3">
                      <span className="bg-blue-600 text-white text-sm px-2 py-1 rounded">
                        Day {day.day}
                      </span>
                      <h4 className="font-medium">{day.title}</h4>
                    </div>

                    {day.activities && day.activities.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {day.activities.map((act, j) => (
                          <li key={j} className="text-gray-600 text-sm flex items-start gap-2">
                            <span className="text-blue-500">•</span>
                            {act}
                          </li>
                        ))}
                      </ul>
                    )}

                    {day.meals && (
                      <div className="mt-2 flex gap-4 text-xs text-gray-500">
                        {day.meals.breakfast && <span>🍳 {day.meals.breakfast}</span>}
                        {day.meals.lunch && <span>🍜 {day.meals.lunch}</span>}
                        {day.meals.dinner && <span>🍽️ {day.meals.dinner}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          {itinerary.tips && itinerary.tips.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-3">💡 旅行小贴士</h3>
              <ul className="space-y-2">
                {itinerary.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-700">
                    <span className="text-yellow-600">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Code Highlight */}
      <div className="mt-8 p-4 bg-gray-900 rounded-lg text-sm">
        <p className="text-gray-400 mb-2">// 核心代码</p>
        <pre className="text-green-400 overflow-x-auto">
{`// 定义 Schema
const itinerarySchema = z.object({
  destination: z.string(),
  dailyPlan: z.array(z.object({ day: z.number(), ... })),
});

// 前端使用
const { object, submit, isLoading } = useObject({
  api: "/api/structured",
  schema: itinerarySchema,
});

// object 会实时填充，边生成边显示`}
        </pre>
      </div>
    </main>
  );
}
