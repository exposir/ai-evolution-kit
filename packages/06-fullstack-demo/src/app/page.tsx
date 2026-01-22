"use client";

/**
 * [INPUT]: React hooks, M5 后端 API (通过 rewrite 代理)
 * [OUTPUT]: M6 全栈验证页面 - 完整验证 M5 NestJS 后端
 * [POS]: M6 入口页面，多标签验证 Ch20/Ch21/Ch22，对标 M4 视觉复杂度
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useRef, useEffect, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
 * Types
 * ═══════════════════════════════════════════════════════════════════════════ */

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface HealthStatus {
  status: string;
  timestamp: string;
  services: { redis: string };
}

interface UsageStats {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

type TabId = "dashboard" | "chat" | "memory" | "throttle";

/* ═══════════════════════════════════════════════════════════════════════════
 * Dashboard Tab - 系统监控仪表盘
 * ═══════════════════════════════════════════════════════════════════════════ */

function DashboardTab({
  health,
  usage,
  messageCount,
  sessionId,
}: {
  health: HealthStatus | null;
  usage: UsageStats | null;
  messageCount: number;
  sessionId: string | null;
}) {
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setUptime((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur">
            <span className="text-4xl">🚀</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold">M6 Fullstack Demo</h2>
            <p className="text-white/80">Next.js → NestJS → Redis 全栈验证</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <p className="text-white/60 text-sm">运行时间</p>
            <p className="text-2xl font-mono font-bold">{formatUptime(uptime)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <p className="text-white/60 text-sm">消息总数</p>
            <p className="text-2xl font-bold">{messageCount}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <p className="text-white/60 text-sm">Token 消耗</p>
            <p className="text-2xl font-bold">{usage?.totalTokens || 0}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <p className="text-white/60 text-sm">Session</p>
            <p className="text-lg font-mono truncate">{sessionId?.slice(0, 8) || "—"}</p>
          </div>
        </div>
      </div>

      {/* Service Status Grid */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* M5 Backend Status */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <span className="text-xl">⚡</span> M5 NestJS
            </h3>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-600">状态</span>
              <span
                className={
                  "px-3 py-1 rounded-full text-sm font-medium " +
                  (health?.status === "正常"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700")
                }
              >
                {health?.status || "检测中..."}
              </span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-600">端口</span>
              <span className="font-mono text-gray-800">3001</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">端点</span>
              <span className="text-sm text-gray-500">/chat, /health</span>
            </div>
          </div>
        </div>

        {/* Redis Status */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-orange-500 px-4 py-3">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <span className="text-xl">🔴</span> Redis (Upstash)
            </h3>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-600">连接</span>
              <span
                className={
                  "px-3 py-1 rounded-full text-sm font-medium " +
                  (health?.services?.redis === "已连接"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700")
                }
              >
                {health?.services?.redis || "未知"}
              </span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-600">用途</span>
              <span className="text-sm text-gray-800">会话持久化</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">协议</span>
              <span className="font-mono text-sm text-gray-500">rediss://</span>
            </div>
          </div>
        </div>

        {/* M6 Frontend Status */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-3">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <span className="text-xl">🌐</span> M6 Next.js
            </h3>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-600">状态</span>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                运行中
              </span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-600">端口</span>
              <span className="font-mono text-gray-800">3002</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">代理</span>
              <span className="text-sm text-gray-500">/api/* → M5</span>
            </div>
          </div>
        </div>
      </div>

      {/* Architecture Diagram */}
      <div className="bg-gray-900 rounded-xl p-6 text-white">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <span>📐</span> 系统架构
        </h3>
        <pre className="text-sm text-green-400 overflow-x-auto font-mono">
{`┌─────────────────────────────────────────────────────────────────┐
│                    M6: Next.js (port 3002)                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    React Frontend                         │   │
│  │   Dashboard │ Chat (Ch20) │ Memory (Ch21) │ Throttle (Ch22) │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │ rewrite /api/*                    │
└──────────────────────────────┼───────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    M5: NestJS (port 3001)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ ChatController │ │ MemoryService │ │ThrottlerGuard│          │
│  │  POST /chat   │  │    Redis     │  │  1秒/3次     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└──────────────────────────────┼───────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              External Services                                   │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │   DeepSeek   │  │    Upstash   │                             │
│  │    LLM API   │  │    Redis     │                             │
│  └──────────────┘  └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘`}
        </pre>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Chat Tab - Ch20 NestJS 对话验证
 * ═══════════════════════════════════════════════════════════════════════════ */

function ChatTab({
  messages,
  input,
  setInput,
  isLoading,
  streamContent,
  onSubmit,
  mode,
  onModeChange,
}: {
  messages: Message[];
  input: string;
  setInput: (v: string) => void;
  isLoading: boolean;
  streamContent: string;
  onSubmit: (e: React.FormEvent) => void;
  mode: "sync" | "stream";
  onModeChange: (m: "sync" | "stream") => void;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const suggestions = [
    { text: "你好", icon: "👋" },
    { text: "今天天气怎么样？", icon: "🌤️" },
    { text: "写一首关于编程的诗", icon: "📝" },
    { text: "解释什么是 NestJS", icon: "🏗️" },
  ];


  return (
    <div className="space-y-6">
      {/* Chapter Header */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur">
            <span className="text-3xl">💬</span>
          </div>
          <div>
            <h2 className="text-xl font-bold">Chapter 20: NestJS 架构</h2>
            <p className="text-white/80">
              测试 POST /chat (同步) 和 POST /chat/stream (流式) 端点
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onModeChange("sync")}
            className={
              "flex-1 py-2 rounded-lg font-medium transition-all " +
              (mode === "sync"
                ? "bg-white text-blue-600 shadow-lg"
                : "bg-white/20 text-white hover:bg-white/30")
            }
          >
            ⏱️ 同步模式
          </button>
          <button
            onClick={() => onModeChange("stream")}
            className={
              "flex-1 py-2 rounded-lg font-medium transition-all " +
              (mode === "stream"
                ? "bg-white text-blue-600 shadow-lg"
                : "bg-white/20 text-white hover:bg-white/30")
            }
          >
            ⚡ 流式模式
          </button>
        </div>
      </div>

      {/* Quick Suggestions */}
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => setInput(s.text)}
            className="flex items-center gap-2 px-4 py-2 bg-white border rounded-full hover:border-blue-500 hover:shadow-md transition-all group"
          >
            <span className="group-hover:scale-110 transition-transform">{s.icon}</span>
            <span className="text-sm text-gray-700">{s.text}</span>
          </button>
        ))}
      </div>

      {/* Chat Container */}
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="h-[400px] overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-4xl">💬</span>
              </div>
              <p className="text-lg font-medium">开始对话</p>
              <p className="text-sm mt-1">选择建议或输入消息，观察 {mode === "sync" ? "同步" : "流式"} 响应</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={"flex " + (msg.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={
                      "max-w-[80%] rounded-2xl px-4 py-3 " +
                      (msg.role === "user"
                        ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                        : "bg-gray-100")
                    }
                  >
                    <div
                      className={
                        "text-xs mb-1 flex items-center gap-2 " +
                        (msg.role === "user" ? "text-blue-200" : "text-gray-400")
                      }
                    >
                      <span>{msg.role === "user" ? "👤 你" : "🤖 AI"}</span>
                      <span>·</span>
                      <span>{msg.timestamp.toLocaleTimeString()}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}

              {/* Streaming Content */}
              {streamContent && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] bg-gray-100 rounded-2xl px-4 py-3">
                    <div className="text-xs text-gray-400 mb-1 flex items-center gap-2">
                      <span>🤖 AI</span>
                      <span className="inline-flex items-center gap-1 text-blue-500">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                        流式传输中
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {streamContent}
                      <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse rounded" />
                    </p>
                  </div>
                </div>
              )}

              {/* Loading Indicator */}
              {isLoading && !streamContent && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 text-gray-500">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-sm">思考中...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <form onSubmit={onSubmit} className="border-t p-4 flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入消息..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all font-medium shadow-lg shadow-blue-500/25"
          >
            {isLoading ? "发送中..." : "发送"}
          </button>
        </form>
      </div>

      {/* Technical Note */}
      <div className="bg-gray-900 rounded-xl p-5 text-sm">
        <p className="text-gray-400 mb-3 font-medium">// NestJS Controller 端点</p>
        <pre className="text-green-400 overflow-x-auto">
{`@Controller('chat')
@UseGuards(ThrottlerGuard)
export class ChatController {
  @Post()
  async chat(@Body() dto: ChatRequestDto) {
    // 同步响应 - 等待完整结果
    return this.chatService.chat(dto);
  }

  @Post('stream')
  async stream(@Body() dto: ChatRequestDto, @Res() res: Response) {
    // SSE 流式响应 - 逐 Token 发送
    res.setHeader('Content-Type', 'text/event-stream');
    // ...
  }
}`}
        </pre>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Memory Tab - Ch21 Redis 会话持久化验证
 * ═══════════════════════════════════════════════════════════════════════════ */

function MemoryTab({
  sessionId,
  messages,
  onTestMemory,
  isLoading,
}: {
  sessionId: string | null;
  messages: Message[];
  onTestMemory: (msg: string) => void;
  isLoading: boolean;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [chatInput, setChatInput] = useState("");

  const testSteps = [
    {
      step: 1,
      title: "设置记忆",
      msg: "我叫小明，请记住我的名字",
      icon: "💾",
      color: "from-purple-500 to-indigo-500",
    },
    {
      step: 2,
      title: "追加信息",
      msg: "我喜欢编程和喝咖啡",
      icon: "➕",
      color: "from-indigo-500 to-blue-500",
    },
    {
      step: 3,
      title: "验证记忆",
      msg: "我叫什么名字？我有什么爱好？",
      icon: "🔍",
      color: "from-blue-500 to-cyan-500",
    },
  ];

  const handleTest = (index: number, msg: string) => {
    setCurrentStep(index + 1);
    onTestMemory(msg);
  };

  return (
    <div className="space-y-6">
      {/* Chapter Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur">
            <span className="text-3xl">🧠</span>
          </div>
          <div>
            <h2 className="text-xl font-bold">Chapter 21: Redis Memory</h2>
            <p className="text-white/80">
              MemoryService 会话持久化 - 同一 sessionId 下 AI 记住上下文
            </p>
          </div>
        </div>
      </div>

      {/* Session Card */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-5 py-3">
          <h3 className="text-white font-semibold">🔑 当前会话</h3>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">{sessionId ? "🔐" : "🔓"}</span>
            </div>
            <div className="flex-1">
              <p className="font-mono text-lg">{sessionId || "(尚未创建)"}</p>
              <p className="text-sm text-gray-500">
                {sessionId
                  ? "会话进行中，所有消息都保存在 Redis"
                  : "发送第一条消息创建会话"}
              </p>
            </div>
            {sessionId && (
              <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                ● 活跃
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Test Steps */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-purple-500 to-indigo-500 px-5 py-3">
          <h3 className="text-white font-semibold">📋 验证步骤</h3>
        </div>
        <div className="p-5 space-y-4">
          {testSteps.map((step, i) => (
            <div
              key={i}
              className={
                "relative flex items-center gap-4 p-4 rounded-xl transition-all " +
                (currentStep > i
                  ? "bg-green-50 border-2 border-green-200"
                  : currentStep === i && isLoading
                  ? "bg-purple-50 border-2 border-purple-300"
                  : "bg-gray-50 border-2 border-transparent hover:border-gray-200")
              }
            >
              {/* Step Number */}
              <div
                className={
                  "w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shadow-lg " +
                  (currentStep > i
                    ? "bg-gradient-to-br from-green-400 to-green-500"
                    : `bg-gradient-to-br ${step.color}`)
                }
              >
                {currentStep > i ? "✓" : step.step}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{step.icon}</span>
                  <h4 className="font-semibold">{step.title}</h4>
                </div>
                <p className="text-sm text-gray-500 mt-1">&quot;{step.msg}&quot;</p>
              </div>

              {/* Action */}
              <button
                onClick={() => handleTest(i, step.msg)}
                disabled={isLoading}
                className={
                  "px-4 py-2 rounded-lg font-medium transition-all " +
                  (currentStep > i
                    ? "bg-green-100 text-green-700"
                    : "bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 shadow-lg")
                }
              >
                {currentStep > i ? "已完成" : isLoading && currentStep === i ? "执行中..." : "发送"}
              </button>

              {/* Progress Line */}
              {i < testSteps.length - 1 && (
                <div
                  className={
                    "absolute left-9 top-16 w-0.5 h-8 " +
                    (currentStep > i ? "bg-green-300" : "bg-gray-200")
                  }
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Free Chat */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-3">
          <h3 className="text-white font-semibold">💬 自由对话</h3>
        </div>
        <div className="p-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (chatInput.trim() && !isLoading) {
                onTestMemory(chatInput.trim());
                setChatInput("");
              }
            }}
            className="flex gap-3"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="输入任意内容测试记忆功能..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
            />
            <button
              type="submit"
              disabled={isLoading || !chatInput.trim()}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium rounded-xl hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all"
            >
              {isLoading ? "发送中..." : "发送"}
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-3">
            💡 提示: 完成上方验证步骤后，可在此自由对话测试 AI 是否记住了你的信息
          </p>
        </div>
      </div>

      {/* Message Timeline */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-5 py-3 flex items-center justify-between">
          <h3 className="text-white font-semibold">📜 对话历史</h3>
          <span className="text-white/60 text-sm">{messages.length} 条消息</span>
        </div>
        <div className="p-5 max-h-80 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <span className="text-4xl mb-2 block">💭</span>
              <p>暂无对话记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <div
                  key={msg.id}
                  className={
                    "flex gap-3 p-3 rounded-lg " +
                    (msg.role === "user" ? "bg-blue-50" : "bg-gray-50")
                  }
                >
                  <div
                    className={
                      "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm " +
                      (msg.role === "user" ? "bg-blue-500" : "bg-gray-500")
                    }
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {msg.role === "user" ? "你" : "AI"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {msg.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">
                      {msg.content.length > 150
                        ? msg.content.slice(0, 150) + "..."
                        : msg.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Technical Note */}
      <div className="bg-gray-900 rounded-xl p-5 text-sm">
        <p className="text-gray-400 mb-3 font-medium">// MemoryService 实现</p>
        <pre className="text-green-400 overflow-x-auto">
{`@Injectable()
export class MemoryService {
  constructor(private readonly redis: Redis) {}

  async getConversation(sessionId: string): Promise<Conversation> {
    const data = await this.redis.get(\`session:\${sessionId}\`);
    return data ? JSON.parse(data) : { messages: [] };
  }

  async appendMessage(sessionId: string, message: Message) {
    const conv = await this.getConversation(sessionId);
    conv.messages.push(message);
    await this.redis.set(\`session:\${sessionId}\`, JSON.stringify(conv));
  }
}`}
        </pre>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Throttle Tab - Ch22 限流验证
 * ═══════════════════════════════════════════════════════════════════════════ */

function ThrottleTab() {
  const [results, setResults] = useState<
    { id: number; status: number; time: number }[]
  >([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testCount, setTestCount] = useState(6);

  const runThrottleTest = async () => {
    setIsTesting(true);
    setResults([]);

    const requests = Array.from({ length: testCount }, (_, i) => i + 1);
    const startTime = Date.now();

    const promises = requests.map(async (id) => {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [{ role: "user", content: "test" }] }),
        });
        return { id, status: res.status, time: Date.now() - startTime };
      } catch {
        return { id, status: 0, time: Date.now() - startTime };
      }
    });

    const allResults = await Promise.all(promises);
    setResults(allResults.sort((a, b) => a.id - b.id));
    setIsTesting(false);
  };

  const successCount = results.filter((r) => r.status === 200).length;
  const throttledCount = results.filter((r) => r.status === 429).length;
  const errorCount = results.filter((r) => r.status !== 200 && r.status !== 429).length;

  return (
    <div className="space-y-6">
      {/* Chapter Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur">
            <span className="text-3xl">🛡️</span>
          </div>
          <div>
            <h2 className="text-xl font-bold">Chapter 22: Guardrails</h2>
            <p className="text-white/80">
              @nestjs/throttler 限流保护 - 1秒内最多 3 个请求
            </p>
          </div>
        </div>
      </div>

      {/* Test Control Panel */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-red-500 px-5 py-3">
          <h3 className="text-white font-semibold">🎯 压力测试控制台</h3>
        </div>
        <div className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Request Count Selector */}
            <div className="flex items-center gap-3">
              <span className="text-gray-600">并发请求数:</span>
              <div className="flex gap-2">
                {[4, 6, 8, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setTestCount(n)}
                    className={
                      "w-10 h-10 rounded-lg font-bold transition-all " +
                      (testCount === n
                        ? "bg-orange-500 text-white shadow-lg"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200")
                    }
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Launch Button */}
            <button
              onClick={runThrottleTest}
              disabled={isTesting}
              className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 disabled:opacity-50 transition-all font-bold text-lg shadow-lg shadow-orange-500/25 flex items-center gap-3"
            >
              {isTesting ? (
                <>
                  <span className="animate-spin">⚙️</span>
                  测试中...
                </>
              ) : (
                <>
                  <span>🚀</span>
                  发起 {testCount} 个并发请求
                </>
              )}
            </button>
          </div>

          <p className="text-sm text-gray-500 mt-4 text-center">
            限流配置: <code className="bg-gray-100 px-2 py-0.5 rounded">1秒 / 3次</code>，
            预期 {Math.min(3, testCount)} 个成功，{Math.max(0, testCount - 3)} 个被限流
          </p>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-green-400 to-green-500 rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">✅</span>
                <span className="font-medium">成功</span>
              </div>
              <p className="text-4xl font-bold">{successCount}</p>
              <p className="text-white/70 text-sm mt-1">HTTP 200</p>
            </div>
            <div className="bg-gradient-to-br from-red-400 to-red-500 rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🛑</span>
                <span className="font-medium">限流</span>
              </div>
              <p className="text-4xl font-bold">{throttledCount}</p>
              <p className="text-white/70 text-sm mt-1">HTTP 429</p>
            </div>
            <div className="bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">❌</span>
                <span className="font-medium">错误</span>
              </div>
              <p className="text-4xl font-bold">{errorCount}</p>
              <p className="text-white/70 text-sm mt-1">其他</p>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="bg-gray-800 px-5 py-3">
              <h3 className="text-white font-semibold">📊 详细结果</h3>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {results.map((r) => (
                  <div
                    key={r.id}
                    className={
                      "relative p-4 rounded-xl border-2 transition-all " +
                      (r.status === 200
                        ? "bg-green-50 border-green-200"
                        : r.status === 429
                        ? "bg-red-50 border-red-200"
                        : "bg-gray-50 border-gray-200")
                    }
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={
                          "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold " +
                          (r.status === 200
                            ? "bg-green-500"
                            : r.status === 429
                            ? "bg-red-500"
                            : "bg-gray-500")
                        }
                      >
                        {r.id}
                      </span>
                      <span
                        className={
                          "text-2xl " +
                          (r.status === 200
                            ? ""
                            : r.status === 429
                            ? ""
                            : "")
                        }
                      >
                        {r.status === 200 ? "✅" : r.status === 429 ? "🛑" : "❌"}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">状态</span>
                        <span
                          className={
                            "font-mono font-bold " +
                            (r.status === 200
                              ? "text-green-600"
                              : r.status === 429
                              ? "text-red-600"
                              : "text-gray-600")
                          }
                        >
                          {r.status}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">耗时</span>
                        <span className="font-mono">{r.time}ms</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Technical Note */}
      <div className="bg-gray-900 rounded-xl p-5 text-sm">
        <p className="text-gray-400 mb-3 font-medium">// ThrottlerGuard 配置</p>
        <pre className="text-green-400 overflow-x-auto">
{`// app.module.ts
ThrottlerModule.forRoot([
  {
    name: 'short',
    ttl: 1000,   // 1 秒时间窗口
    limit: 3,    // 每秒最多 3 次请求
  },
  {
    name: 'medium',
    ttl: 10000,  // 10 秒时间窗口
    limit: 20,   // 每 10 秒最多 20 次
  },
])

// chat.controller.ts
@Controller('chat')
@UseGuards(ThrottlerGuard)  // 应用限流守卫
export class ChatController { ... }`}
        </pre>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Tab Navigation Component
 * ═══════════════════════════════════════════════════════════════════════════ */

function TabNav({
  activeTab,
  onTabChange,
}: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}) {
  const tabs: { id: TabId; label: string; icon: string; color: string }[] = [
    { id: "dashboard", label: "仪表盘", icon: "📊", color: "from-indigo-500 to-purple-500" },
    { id: "chat", label: "Ch20: 对话", icon: "💬", color: "from-blue-500 to-cyan-500" },
    { id: "memory", label: "Ch21: 记忆", icon: "🧠", color: "from-purple-500 to-pink-500" },
    { id: "throttle", label: "Ch22: 限流", icon: "🛡️", color: "from-orange-500 to-red-500" },
  ];

  return (
    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={
            "flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all whitespace-nowrap " +
            (activeTab === tab.id
              ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
              : "bg-white border text-gray-600 hover:border-gray-300 hover:shadow-sm")
          }
        >
          <span className="text-xl">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Main Page Component
 * ═══════════════════════════════════════════════════════════════════════════ */

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [mode, setMode] = useState<"sync" | "stream">("stream");
  const [streamContent, setStreamContent] = useState("");
  const [usage, setUsage] = useState<UsageStats | null>(null);

  // Health check
  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/health");
      setHealth(await res.json());
    } catch {
      setHealth({ status: "离线", timestamp: "", services: { redis: "未知" } });
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  // Reset session
  const resetSession = () => {
    setSessionId(null);
    setMessages([]);
    setStreamContent("");
    setUsage(null);
  };

  // Send sync message
  const sendSync = async (content: string) => {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          messages: [{ role: "user", content }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.message);
      setSessionId(data.sessionId);
      setUsage(data.usage);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: data.content,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Error: " + err,
          timestamp: new Date(),
        },
      ]);
    }
  };

  // Send stream message
  const sendStream = async (content: string) => {
    setStreamContent("");
    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          messages: [{ role: "user", content }],
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (!reader) throw new Error("无法读取流");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data.includes("DONE")) continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                setStreamContent(fullContent);
              }
              if (parsed.sessionId) {
                setSessionId(parsed.sessionId);
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: fullContent,
          timestamp: new Date(),
        },
      ]);
      setStreamContent("");
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Error: " + err,
          timestamp: new Date(),
        },
      ]);
    }
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    if (mode === "sync") {
      await sendSync(userMsg.content);
    } else {
      await sendStream(userMsg.content);
    }
    setIsLoading(false);
  };

  // Handle test memory
  const handleTestMemory = async (msg: string) => {
    if (isLoading) return;
    setInput("");
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: msg,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    await sendStream(msg);
    setIsLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-xl text-white">🚀</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">M6: Fullstack Demo</h1>
                <p className="text-sm text-gray-500">验证 M5 NestJS 后端</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Status Pills */}
              <div className="hidden md:flex gap-2">
                <span
                  className={
                    "px-3 py-1 rounded-full text-xs font-medium " +
                    (health?.status === "正常"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700")
                  }
                >
                  M5: {health?.status || "..."}
                </span>
                <span
                  className={
                    "px-3 py-1 rounded-full text-xs font-medium " +
                    (health?.services?.redis === "已连接"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700")
                  }
                >
                  Redis: {health?.services?.redis || "..."}
                </span>
              </div>

              {/* Reset Button */}
              <button
                onClick={resetSession}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                重置会话
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === "dashboard" && (
          <DashboardTab
            health={health}
            usage={usage}
            messageCount={messages.length}
            sessionId={sessionId}
          />
        )}
        {activeTab === "chat" && (
          <ChatTab
            messages={messages}
            input={input}
            setInput={setInput}
            isLoading={isLoading}
            streamContent={streamContent}
            onSubmit={handleSubmit}
            mode={mode}
            onModeChange={setMode}
          />
        )}
        {activeTab === "memory" && (
          <MemoryTab
            sessionId={sessionId}
            messages={messages}
            onTestMemory={handleTestMemory}
            isLoading={isLoading}
          />
        )}
        {activeTab === "throttle" && <ThrottleTab />}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <p>
              M6 前端 (port 3002) → M5 后端 (port 3001) → Redis (Upstash)
            </p>
            <div className="flex gap-4">
              <a
                href="http://localhost:3001/health"
                target="_blank"
                className="text-blue-500 hover:underline"
              >
                M5 健康检查
              </a>
              <span>·</span>
              <span>AI Evolution Kit</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
