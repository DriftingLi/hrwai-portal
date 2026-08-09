# ===== 官网门户多阶段构建 Dockerfile =====
# Stage 1: 构建 Nuxt 应用（预渲染 + sitemap 需在构建期访问后端公开接口）
# Stage 2: node 运行时托管 Nitro standalone 产物

# ----- Builder 阶段 -----
FROM node:22-alpine AS builder

WORKDIR /app

# 安装依赖（利用层缓存）
COPY package.json package-lock.json ./
RUN npm ci

# 复制源码
COPY . .

# 构建期环境变量（预渲染首页/sitemap 需要后端可达；不可达时降级为空数据，不阻断构建）
ARG NUXT_API_INTERNAL_BASE=http://backend:8080
ENV NUXT_API_INTERNAL_BASE=${NUXT_API_INTERNAL_BASE}
# 站点地址用 PORTAL_SITE_URL（www 归一化在构建期完成，NUXT_PUBLIC_SITE_URL 会绕过）
ARG PORTAL_SITE_URL=
ENV PORTAL_SITE_URL=${PORTAL_SITE_URL}
ARG NUXT_PUBLIC_BAIDU_VERIFICATION=
ENV NUXT_PUBLIC_BAIDU_VERIFICATION=${NUXT_PUBLIC_BAIDU_VERIFICATION}

RUN npm run build

# ----- Runtime 阶段 -----
FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Nitro standalone 产物（含 server 依赖 package.json）
COPY --from=builder /app/.output .output

EXPOSE 3000

# 运行期环境变量（SSR 直连后端地址可在容器启动时覆盖）
ENV NUXT_API_INTERNAL_BASE=http://backend:8080

USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", ".output/server/index.mjs"]
