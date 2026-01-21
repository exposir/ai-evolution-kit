import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 允许跨域请求 M5 后端
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/:path*",
      },
    ];
  },
};

export default nextConfig;
