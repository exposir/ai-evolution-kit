# Stage 1: Build
FROM node:20-slim AS builder

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 复制依赖定义
COPY package.json pnpm-lock.yaml* ./

# 安装所有依赖（包括 devDependencies）
RUN pnpm install --frozen-lockfile

# 复制所有源代码
COPY . .

# 编译项目
RUN pnpm run build

# Stage 2: Run
FROM node:20-slim AS runner

WORKDIR /app

# 设置为生产环境
ENV NODE_ENV=production

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 只复制生产环境需要的依赖定义
COPY --from=builder /app/package.json /app/pnpm-lock.yaml* ./

# 只安装生产依赖
RUN pnpm install --prod --frozen-lockfile

# 从 builder 阶段复制编译好的代码
COPY --from=builder /app/dist ./dist

# 暴露端口（与 main.ts 中的端口一致）
EXPOSE 3001

# 启动命令
CMD ["node", "dist/main"]
