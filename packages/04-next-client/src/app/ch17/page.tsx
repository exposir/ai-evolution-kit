"use client";

/**
 * [INPUT]: ai/react (useChat), React (useEffect, useRef)
 * [OUTPUT]: Ch17 演示页面 - 流式传输打字机效果
 * [POS]: M4 第二章，展示 Token 级别的流式渲染
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useChat } from "ai/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function Ch17Page() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/chat",
    });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [tokenCount, setTokenCount] = useState(0);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Count tokens in latest assistant message
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === "assistant") {
      // Rough token estimate: ~4 chars per token for English, ~1.5 for Chinese
      const chars = lastMsg.content.length;
      setTokenCount(Math.ceil(chars / 2));
    }
  }, [messages]);

  return (
    <main className="max-w-2xl mx-auto p-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/" className="text-blue-600 hover:underline text-sm">
          ← 返回首页
        </Link>
        <h1 className="text-2xl font-bold mt-2">Ch17: Streaming UI</h1>
        <p className="text-gray-600 text-sm">
          打字机效果 - Token 逐个显示，降低感知延迟
        </p>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-4 mb-4 text-sm">
        <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
          消息数: {messages.length}
        </div>
        <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full">
          ~Token: {tokenCount}
        </div>
        {isLoading && (
          <div className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full animate-pulse">
            ● 流式传输中...
          </div>
        )}
      </div>

      {/* Chat Messages with Streaming Effect */}
      <div className="bg-white border rounded-lg mb-4 min-h-[400px] max-h-[500px] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p>发送消息，观察流式效果 ⚡</p>
            <p className="text-sm mt-2">
              试试 &quot;写一首关于编程的诗&quot; 看打字机效果
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-lg ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {/* Role badge */}
                  <div className="text-xs opacity-60 mb-1">
                    {msg.role === "user" ? "You" : "AI"}
                  </div>

                  {/* Content with cursor effect for streaming */}
                  <p className="text-sm whitespace-pre-wrap">
                    {msg.content}
                    {/* Blinking cursor during streaming */}
                    {isLoading &&
                      msg.role === "assistant" &&
                      msg.id === messages[messages.length - 1]?.id && (
                        <span className="inline-block w-2 h-4 bg-gray-600 ml-0.5 animate-pulse" />
                      )}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="输入消息观察流式效果..."
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? "传输中..." : "发送"}
        </button>
      </form>

      {/* Technical Explanation */}
      <div className="mt-8 p-4 bg-gray-900 rounded-lg text-sm">
        <p className="text-gray-400 mb-2">// 后端核心代码</p>
        <pre className="text-green-400 overflow-x-auto">
{`import { streamText } from "ai";

const result = streamText({ model, messages });
return result.toDataStreamResponse(); // SSE 流式响应`}
        </pre>
        <p className="text-gray-400 mt-4 mb-2">// 原理</p>
        <pre className="text-blue-400 overflow-x-auto">
{`Server-Sent Events (SSE)
├── Token 1 → 渲染
├── Token 2 → 渲染
├── Token 3 → 渲染
└── ... (用户看到文字逐个出现)`}
        </pre>
      </div>
    </main>
  );
}
