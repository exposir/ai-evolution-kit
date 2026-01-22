import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 允许跨域请求 M5 后端
  // 注意: /api/chat/stream 使用专用 Route Handler (绕过 rewrite 缓冲问题)
  async rewrites() {
    return [
      {
        source: "/api/chat/stream",
        destination: "/api/chat/stream", // 不重写, 使用本地 Route Handler
        has: [{ type: "header", key: "x-skip-rewrite" }], // 永远不匹配, 跳过此规则
      },
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/:path*",
      },
    ];
  },
};

export default nextConfig;
