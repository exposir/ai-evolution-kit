"use client";

/**
 * [INPUT]: ai/react (useChat), React
 * [OUTPUT]: Ch16 演示页面 - useChat Hook 基础用法
 * [POS]: M4 第一章，展示 Vercel AI SDK 的状态管理能力
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useChat } from "ai/react";
import Link from "next/link";

export default function Ch16Page() {
  /* ========================================================================
   * useChat Hook - 一行代码搞定聊天状态管理
   * - messages: 消息数组，自动维护
   * - input: 输入框绑定值
   * - handleInputChange: 输入框 onChange 处理
   * - handleSubmit: 表单 onSubmit 处理
   * - isLoading: 加载状态
   * ======================================================================== */
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/chat",
    });

  return (
    <main className="max-w-2xl mx-auto p-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/" className="text-blue-600 hover:underline text-sm">
          ← 返回首页
        </Link>
        <h1 className="text-2xl font-bold mt-2">Ch16: useChat Hook</h1>
        <p className="text-gray-600 text-sm">
          现代化状态管理 - 自动处理消息、输入、提交
        </p>
      </div>

      {/* Chat Messages */}
      <div className="bg-white border rounded-lg mb-4 min-h-[400px] max-h-[500px] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p>开始对话吧 👋</p>
            <p className="text-sm mt-2">试试输入 "你好" 或 "What is React?"</p>
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
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-2 rounded-lg">
                  <span className="text-gray-500 animate-pulse">思考中...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="输入消息..."
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          发送
        </button>
      </form>

      {/* Code Highlight */}
      <div className="mt-8 p-4 bg-gray-900 rounded-lg text-sm">
        <p className="text-gray-400 mb-2">// 核心代码</p>
        <pre className="text-green-400 overflow-x-auto">
{`const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
  api: "/api/chat",
});`}
        </pre>
      </div>
    </main>
  );
}
