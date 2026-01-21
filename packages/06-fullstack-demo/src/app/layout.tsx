import "./globals.css";

/**
 * [INPUT]: Next.js App Router
 * [OUTPUT]: 全局布局
 * [POS]: M6 根布局
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const metadata = {
  title: "M6: Fullstack Demo",
  description: "验证 M5 NestJS 后端的全栈演示",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
