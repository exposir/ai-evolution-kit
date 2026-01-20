"use client";

/**
 * [INPUT]: ai/react (useChat), React
 * [OUTPUT]: Ch18 演示页面 - 生成式 UI，AI 工具调用渲染组件
 * [POS]: M4 第三章，展示 AI 返回结构化数据，前端动态渲染组件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useChat } from "ai/react";
import Link from "next/link";

/* ========================================================================
 * UI Components - 根据工具结果渲染的组件
 * ======================================================================== */

function WeatherCard({ data }: { data: { city: string; temperature: number; condition: string; humidity: number; wind: number } }) {
  const conditionEmoji: Record<string, string> = {
    Sunny: "☀️",
    Cloudy: "☁️",
    Rainy: "🌧️",
    Snowy: "❄️",
  };

  return (
    <div className="bg-gradient-to-br from-blue-400 to-blue-600 text-white rounded-xl p-6 shadow-lg max-w-sm">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium opacity-90">{data.city}</h3>
          <p className="text-5xl font-bold mt-2">{data.temperature}°C</p>
        </div>
        <span className="text-5xl">{conditionEmoji[data.condition] || "🌤️"}</span>
      </div>
      <p className="mt-2 text-lg">{data.condition}</p>
      <div className="flex gap-6 mt-4 text-sm opacity-80">
        <span>💧 {data.humidity}%</span>
        <span>💨 {data.wind} km/h</span>
      </div>
    </div>
  );
}

function StockCard({ data }: { data: { symbol: string; price: string; change: number; changePercent: string; volume: number } }) {
  const isPositive = data.change >= 0;

  return (
    <div className="bg-white border rounded-xl p-6 shadow-lg max-w-sm">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-gray-500 text-sm">股票</h3>
          <p className="text-2xl font-bold">{data.symbol}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${isPositive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {isPositive ? "▲" : "▼"} {Math.abs(data.change)} ({data.changePercent}%)
        </div>
      </div>
      <p className="text-4xl font-bold mt-4">${data.price}</p>
      <p className="text-gray-500 text-sm mt-2">成交量: {data.volume.toLocaleString()}</p>
    </div>
  );
}

function ChartCard({ data }: { data: { title: string; type: string; data: { label: string; value: number }[] } }) {
  const maxValue = Math.max(...data.data.map((d) => d.value));

  return (
    <div className="bg-white border rounded-xl p-6 shadow-lg max-w-md">
      <h3 className="text-lg font-bold mb-4">{data.title}</h3>
      <div className="space-y-3">
        {data.data.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-20 text-sm text-gray-600 truncate">{item.label}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
            <span className="w-12 text-sm font-medium text-right">{item.value}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-4">图表类型: {data.type}</p>
    </div>
  );
}

/* ========================================================================
 * Tool Invocation Renderer
 * ======================================================================== */

function ToolInvocation({ toolInvocation }: { toolInvocation: { toolName: string; state: string; result?: unknown } }) {
  if (toolInvocation.state !== "result") {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <span className="animate-spin">⚙️</span>
        <span>调用 {toolInvocation.toolName}...</span>
      </div>
    );
  }

  const result = toolInvocation.result as Record<string, unknown>;

  switch (toolInvocation.toolName) {
    case "get_weather":
      return <WeatherCard data={result as { city: string; temperature: number; condition: string; humidity: number; wind: number }} />;
    case "get_stock":
      return <StockCard data={result as { symbol: string; price: string; change: number; changePercent: string; volume: number }} />;
    case "show_chart":
      return <ChartCard data={result as { title: string; type: string; data: { label: string; value: number }[] }} />;
    default:
      return <pre className="text-xs bg-gray-100 p-2 rounded">{JSON.stringify(result, null, 2)}</pre>;
  }
}

/* ========================================================================
 * Main Page
 * ======================================================================== */

export default function Ch18Page() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/gen-ui",
      maxSteps: 3,
    });

  const suggestions = [
    "北京天气怎么样？",
    "Show me AAPL stock price",
    "Show a bar chart of sales: Q1=100, Q2=150, Q3=120, Q4=200",
  ];

  return (
    <main className="max-w-2xl mx-auto p-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/" className="text-blue-600 hover:underline text-sm">
          ← 返回首页
        </Link>
        <h1 className="text-2xl font-bold mt-2">Ch18: Generative UI</h1>
        <p className="text-gray-600 text-sm">
          生成式 UI - AI 决定渲染什么组件
        </p>
      </div>

      {/* Suggestions */}
      <div className="flex flex-wrap gap-2 mb-4">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => {
              const form = document.querySelector("form");
              const inputEl = form?.querySelector("input");
              if (inputEl) {
                inputEl.value = s;
                inputEl.dispatchEvent(new Event("input", { bubbles: true }));
              }
            }}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="bg-white border rounded-lg mb-4 min-h-[400px] max-h-[600px] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p>试试上面的建议 🎨</p>
            <p className="text-sm mt-2">AI 会返回可交互的组件</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[90%] ${msg.role === "user" ? "" : ""}`}>
                  {msg.role === "user" ? (
                    <div className="bg-blue-600 text-white px-4 py-2 rounded-lg">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Render tool invocations as components */}
                      {msg.toolInvocations?.map((tool, i) => (
                        <ToolInvocation key={i} toolInvocation={tool} />
                      ))}
                      {/* Text content */}
                      {msg.content && (
                        <div className="bg-gray-100 px-4 py-2 rounded-lg">
                          {msg.content}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-2 rounded-lg animate-pulse">
                  生成组件中...
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="问天气、股票或请求图表..."
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          发送
        </button>
      </form>

      {/* Code Highlight */}
      <div className="mt-8 p-4 bg-gray-900 rounded-lg text-sm">
        <p className="text-gray-400 mb-2">// 核心原理</p>
        <pre className="text-green-400 overflow-x-auto">
{`// 后端定义工具
tools: {
  get_weather: tool({
    parameters: z.object({ city: z.string() }),
    execute: async ({ city }) => fetchWeather(city),
  }),
}

// 前端根据工具结果渲染组件
{msg.toolInvocations?.map((tool) => (
  <ComponentForTool tool={tool} />
))}`}
        </pre>
      </div>
    </main>
  );
}
