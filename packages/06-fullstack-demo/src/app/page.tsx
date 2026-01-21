"use client";

import { useState, useRef, useEffect } from "react";

interface Message { role: "user" | "assistant"; content: string; }
interface HealthStatus { status: string; timestamp: string; services: { redis: string }; }

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [mode, setMode] = useState<"sync" | "stream">("stream");
  const [streamContent, setStreamContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamContent]);

  const checkHealth = async () => {
    try {
      const res = await fetch("/api/health");
      setHealth(await res.json());
    } catch { setHealth({ status: "离线", timestamp: "", services: { redis: "未知" } }); }
  };

  useEffect(() => { checkHealth(); const i = setInterval(checkHealth, 10000); return () => clearInterval(i); }, []);

  const resetSession = () => { setSessionId(null); setMessages([]); setStreamContent(""); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    mode === "sync" ? await sendSync(userMsg.content) : await sendStream(userMsg.content);
  };

  const sendSync = async (content: string) => {
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, messages: [{ role: "user", content }] }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.message);
      setSessionId(data.sessionId);
      setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Error: " + err }]);
    } finally { setIsLoading(false); }
  };

  const sendStream = async (content: string) => {
    setStreamContent("");
    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, messages: [{ role: "user", content }] }),
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
              if (parsed.content) { fullContent += parsed.content; setStreamContent(fullContent); }
            } catch {}
          }
        }
      }
      setMessages((prev) => [...prev, { role: "assistant", content: fullContent }]);
      setStreamContent("");
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Error: " + err }]);
    } finally { setIsLoading(false); }
  };

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">M6: Fullstack Demo</h1>
      <p className="text-gray-600 mb-4">验证 M5 NestJS 后端 (Next.js 前端 + NestJS 后端)</p>

      {/* Status Bar */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <span className={"px-3 py-1 rounded-full text-sm " + (health?.status === "正常" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
          M5: {health?.status || "检测中..."}
        </span>
        <span className={"px-3 py-1 rounded-full text-sm " + (health?.services?.redis === "已连接" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700")}>
          Redis: {health?.services?.redis || "未知"}
        </span>
        {sessionId && <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">Session: {sessionId.slice(0,8)}...</span>}
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setMode("sync")} className={"px-4 py-2 rounded " + (mode === "sync" ? "bg-blue-600 text-white" : "bg-gray-200")}>同步模式</button>
        <button onClick={() => setMode("stream")} className={"px-4 py-2 rounded " + (mode === "stream" ? "bg-blue-600 text-white" : "bg-gray-200")}>流式模式</button>
        <button onClick={resetSession} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">重置会话</button>
      </div>

      {/* Chat Area */}
      <div className="bg-white border rounded-lg mb-4 min-h-[400px] max-h-[500px] overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-20">
            <p>发送消息开始对话</p>
            <p className="text-sm mt-2">试试: "我叫小明" 然后问 "我叫什么？" 验证会话持久化</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={"flex " + (msg.role === "user" ? "justify-end" : "justify-start")}>
                <div className={"max-w-[80%] px-4 py-2 rounded-lg " + (msg.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100")}>
                  <div className="text-xs opacity-60 mb-1">{msg.role === "user" ? "你" : "AI"}</div>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {streamContent && (
              <div className="flex justify-start">
                <div className="max-w-[80%] px-4 py-2 rounded-lg bg-gray-100">
                  <div className="text-xs opacity-60 mb-1">AI</div>
                  <p className="whitespace-pre-wrap">{streamContent}<span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse"/></p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入消息..." disabled={isLoading}
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="submit" disabled={isLoading || !input.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {isLoading ? "发送中..." : "发送"}
        </button>
      </form>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-gray-100 rounded-lg text-sm">
        <p className="font-bold mb-2">验证步骤:</p>
        <ol className="list-decimal list-inside space-y-1 text-gray-600">
          <li>确保 M5 后端运行中: <code>cd packages/05-server-core && pnpm dev</code></li>
          <li>Ch20 验证: 发送消息，观察响应</li>
          <li>Ch21 验证: 说 "我叫小明"，然后问 "我叫什么？"</li>
          <li>Ch22 验证: 快速连续发送多条消息，观察限流</li>
        </ol>
      </div>
    </main>
  );
}
