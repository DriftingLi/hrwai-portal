# 和润天下官网门户（HRWAI Portal）

独立 Nuxt 4 应用，承载 www 子域名官网（首页 / 内容精选归档 / 内容详情），面向访客与搜索引擎爬虫。

- **SSR 混合渲染**：`/` 构建时预渲染；`/content/**` SWR 600s；`/news` SWR 60s（后台发布内容自动生效，无需 webhook）
- **SEO**：全量 SSR HTML、sitemap.xml（构建时含全部已发布文章）、robots.txt、JSON-LD（Organization / Article / BreadcrumbList）、OG/Twitter Card、canonical（www 固定版）、百度验证 meta（可配置）
- **与其它模块解耦**：门户只读消费后端公开 API；功能入口（培训 / 残值评估 / AI 助手）整页跳转到对应子域名

## 技术栈

Nuxt 4 + TypeScript + Nitro（standalone）+ Vitest + marked（服务端 Markdown 渲染）

## 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `NUXT_API_INTERNAL_BASE` | 是 | SSR 直连后端内部地址（docker 网络 `http://backend:8080`，本地 `http://127.0.0.1:8080`）；浏览器请求经同源 `/api` 代理转发同一后端 |
| `PORTAL_SITE_URL` | 部署时建议 | canonical / OG / sitemap 使用的 www 站点地址（如 `https://www.example.com`）；未配置则输出相对路径 |
| `NUXT_PUBLIC_BAIDU_VERIFICATION` | 可选 | 百度站长平台验证码；留空不输出验证 meta |

## 本地开发

```bash
npm install
# 启动后端（monorepo backend，端口 8080）后：
npm run dev          # http://localhost:3000
npm test             # Vitest（数据访问层 seam）
npm run typecheck    # vue-tsc
```

## 构建与部署

```bash
# 构建（预渲染首页 + 生成 sitemap；后端公开接口需可达，不可达时降级为空数据不阻断）
NUXT_API_INTERNAL_BASE=http://backend:8080 \
PORTAL_SITE_URL=https://www.example.com \
npm run build

# 产物：.output/（Nitro standalone）
node .output/server/index.mjs
```

容器化：

```bash
docker build --build-arg NUXT_API_INTERNAL_BASE=http://backend:8080 \
             --build-arg PORTAL_SITE_URL=https://www.example.com \
             -t hrwai-portal .
```

- `Dockerfile`：node:22 多阶段，运行期可用 `-e NUXT_API_INTERNAL_BASE=...` 覆盖后端地址
- `nginx.conf.template`：可选的多站点宿主机入口（整站转发到 portal 容器；`/api` 与 `/static` 由 Nitro 内部代理，无需单独反代）
- `.github/workflows/portal-ci.yml`：CI/CD——任意分支 push 自动 check + build + 部署 **testing**（验证通过后 PR 进 main）；PR 进 main 跑 check（分支保护要求）；main push（PR 合并）自动部署 **production**；`workflow_dispatch` 可手动指定环境/ref

### CI/CD 部署（ghcr.io + 服务器）

镜像推送到 `ghcr.io/<org>/hrwai-portal`，服务器经本地 `ghcr-proxy`（127.0.0.1:5000 pull-through 缓存）拉取；www 由 `forklift-frontend-prod` 的 nginx（host 网络 51820）按 Host 头分流到 portal 容器（127.0.0.1:3000），`/api` 与 `/static` 由 Nitro 内部代理到后端。

需要配置的 Secrets / Variables：

| 级别 | 名称 | 说明 |
| --- | --- | --- |
| 仓库 Secrets | `SSH_HOST` / `SSH_PORT` / `SSH_USER` / `SSH_PRIVATE_KEY` | SSH 跳板（pve 公网，如 `183.36.195.104:2222` root） |
| 环境 Secrets | `SSH_JUMP_HOST` | LXC 内网 IP（production `172.17.1.201` / testing `172.17.1.200`） |
| 环境 Secrets | `NUXT_API_INTERNAL_BASE` | SSR 后端地址（host 网络下 `http://127.0.0.1:8080`） |
| 仓库 Secrets | `PORTAL_SITE_URL` | www 站点地址（如 `https://www.gccsmile.com`；裸域自动补 www） |
| 仓库 Secrets | `NUXT_PUBLIC_BAIDU_VERIFICATION` | 可选，百度验证码 |
| 仓库 Variables | `REGISTRY_PROXY` | `127.0.0.1:5000` |
| 仓库 Variables | `KEEP_IMAGES` | 旧镜像保留数，默认 3 |
| 环境 Variables | `ENABLE_NGINX_REDIRECT` | production `true`（注入 www 分流）/ testing `false` |

触发部署：`gh workflow run portal-ci.yml -f environment=production -f ref=<sha>`（GitHub Actions → workflow_dispatch 选择环境）。

## 页面与路由

| 路由 | 策略 | 说明 |
| --- | --- | --- |
| `/` | 预渲染 | 官网首页（Hero/公司介绍/创始人/核心服务/合作模式/服务保障/内容精选轮播/CTA） |
| `/content/[id]` | SSR + SWR 600s | 文章详情（Markdown 服务端渲染、上/下一篇、相关资讯）；不存在/未发布返回真实 404；阅读量由 hydration 后客户端端点计数（SSR/爬虫不计） |
| `/news`、`/news/[category]` | SSR + SWR 60s | 内容精选归档页（全部 + 公司动态/行业新闻/产品资讯/资讯），分页 |
| `/sitemap.xml`、`/robots.txt` | 预渲染 | 构建时生成 |

## 目录结构

```
api/          数据访问层（门户唯一 seam，页面不直接 $fetch）
assets/css/   设计令牌（design-tokens/global/markdown，自 monorepo 移植）
components/   导航/页脚/归档页组件
composables/  useFeaturedApi（SSR 直连后端）/ useSiteLinks（跨子域链接）
config/       官网导航
pages/        路由页面
plugins/      v-reveal 滚动动画指令
server/       Nitro 代理中间件（/api、/static）+ sitemap 数据源
utils/        纯函数（fileUrl / markdown / siteUrl），单测覆盖
```

## 领域词汇

官网门户 / 精选内容 / 精选内容归档页 / 阅读量的定义见主仓库 `CONTEXT.md`「门户与内容」小节；本仓库 `docs/adr/` 记录独立仓库决策。
