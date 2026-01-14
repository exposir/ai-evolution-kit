import Link from "next/link";

/**
 * [INPUT]: Next.js App Router
 * [OUTPUT]: 首页导航，链接到各章节演示
 * [POS]: M4 入口页面
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export default function Home() {
  const chapters = [
    {
      id: 16,
      title: "useChat Hook",
      desc: "现代化状态管理，自动处理消息、输入、提交",
      path: "/ch16",
    },
    {
      id: 17,
      title: "Streaming UI",
      desc: "打字机效果，Token 级别流式传输",
      path: "/ch17",
    },
    {
      id: 18,
      title: "GenUI",
      desc: "生成式 UI，AI 返回 React 组件",
      path: "/ch18",
    },
    {
      id: 19,
      title: "Structured Output",
      desc: "结构化数据流，实时填充表单",
      path: "/ch19",
    },
  ];

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">M4: AI UX Engineering</h1>
      <p className="text-gray-600 mb-8">
        用 Vercel AI SDK 构建丝滑的 AI 交互体验
      </p>

      <div className="grid gap-4">
        {chapters.map((ch) => (
          <Link
            key={ch.id}
            href={ch.path}
            className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-4">
              <span className="text-2xl font-mono text-blue-600">
                Ch{ch.id}
              </span>
              <div>
                <h2 className="text-lg font-semibold">{ch.title}</h2>
                <p className="text-gray-500 text-sm">{ch.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800 text-sm">
          <strong>提示：</strong>运行 <code>pnpm dev</code> 启动开发服务器，访问{" "}
          <code>http://localhost:3000</code>
        </p>
      </div>
    </main>
  );
}
