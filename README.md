# 和润天下官网门户（HRWAI Portal）

独立 Nuxt 4 应用，承载官网（首页 / 内容精选归档 / 内容详情），面向访客与搜索引擎爬虫。

- **SSR 混合渲染**：`/` 构建时预渲染；`/content/**` SWR 600s；`/news` SWR 60s（后台发布内容自动生效，无需 webhook）
- **SEO**：全量 SSR HTML、sitemap.xml（构建时含全部已发布文章）、robots.txt、JSON-LD（Organization / Article / BreadcrumbList）、OG/Twitter Card、canonical（www 固定版）、百度验证 meta（可配置）
- **与其它模块解耦**：门户只读消费后端公开 API；功能入口（培训 / 残值评估 / AI 助手）整页跳转到对应子域名（跳转协议跟随访问者当前页协议——生产 HTTPS 下自动使用 https 子域，不依赖构建期 PORTAL_SITE_URL 的协议值）
- **残值评估工作区**：`/valuation/**` 与官网同一构建、同一套同源 BFF。估值令牌由 Nuxt 服务端持有（httpOnly 会话 Cookie），浏览器不接触令牌；`/valuation/**` 不预渲染且 noindex（见 ADR-0002）

## 技术栈

Nuxt 4 + TypeScript + Nitro（standalone）+ Vitest + marked（服务端 Markdown 渲染）

## 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `NUXT_API_INTERNAL_BASE` | 是 | SSR 直连后端内部地址（docker 网络 `http://backend:8080`，本地 `http://127.0.0.1:8080`）；浏览器请求经同源 `/api` 代理转发同一后端；估值 BFF 的登录/当前用户也走这个地址 |
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

- `edgeone.json`：EdgeOne Pages 构建配置（构建命令 / 安装命令 / Node 版本），见下节

### 部署（腾讯云 EdgeOne Pages）

生产与预览由 EdgeOne Pages 托管：仓库已通过 **Git 集成**连接，push 到 main 会自动构建并部署
（也可在控制台手动触发重新部署）。

| 项目 | 值 |
| --- | --- |
| 框架预设 | Nuxt（平台自动识别） |
| 构建命令 | `npm run build` |
| 安装命令 | `npm ci` |
| Node 版本 | 22.17.1（**必须 ≥ 22.12.0**：rolldown 的平台二进制要求 `^20.19.0 \|\| >=22.12.0`，低于该版本会被跳过安装，构建报 `Cannot find native binding`） |
| 输出目录 | 留空交由平台 Nuxt 预设处理 |

需要在「项目设置 - 环境变量」中配置：

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `NUXT_API_INTERNAL_BASE` | 是 | 后端入口地址，填**公网可达**的后端域名。当前取 `https://www.gccsmile.com`——该域名的 `/api/` 与 `/static/` 由宿主机 nginx 反代到后端，已验证可用。**EdgeOne 边缘运行时访问不到服务器内网回环地址**，原先服务器部署用的 `http://127.0.0.1:8080` 不可用 |
| `PORTAL_SITE_URL` | 是 | 门户自身的站点地址（canonical / OG / sitemap 使用）。当前为 `https://www.hrwai.cn`。非 www 地址会被自动补 `www.` 前缀（见 `utils/siteUrl.ts`），因此裸域填 `https://hrwai.cn` 也会归一化为 `https://www.hrwai.cn` |
| `PORTAL_FEATURE_BASE` | 是 | 功能服务域根（`training.` / `valuation.` 子域所在域），当前为 `https://gccsmile.com`。缺省时跟随 `PORTAL_SITE_URL`——**门户换域名后必须显式设置**，否则功能入口跳转会指向门户域名的子域 |
| `PORTAL_ICP` | 否 | 页脚 ICP 备案号，缺省为 `粤ICP备2026161235号-1`（hrwai.cn 的备案号）；留空则不输出备案信息 |
| `NUXT_PUBLIC_BAIDU_VERIFICATION` | 否 | 百度站长验证码，留空不输出验证 meta |

> **域名分工**：门户（官网）用 `www.hrwai.cn`；后端接口与静态资源仍由 `gccsmile.com` 提供
> （后端返回的图片等绝对 URL 指向该域名，因此它对访客必须可达），培训 / 残值评估等功能服务
> 也在其子域（`training.` / `valuation.gccsmile.com`），所以 `PORTAL_FEATURE_BASE` 必须
> 显式指向 `https://gccsmile.com`。
>
> ✅ `hrwai.cn` 已完成 ICP 备案（**粤ICP备2026161235号-1**）。页脚备案号取自 `PORTAL_ICP`，
> 代码内缺省值已设为该号码；若 EdgeOne 项目环境变量里仍配着旧域名（gccsmile.com）的备案号，
> 需同步修改或删除该变量。

> **迁移历史**：此前经 GitHub Actions 构建镜像 + SSH 部署到自托管 PVE（production=pve-02 / testing=pve-01）的方式已停用，
> workflow、临时替换用的静态站（`yidao-static-site/`）以及全部服务器部署脚本（`deploy/`）均已删除。
> 原 GitHub Secrets / Variables 与分支保护中的 `check` 状态检查、testing 部署要求同步取消。

## 页面与路由

| 路由 | 策略 | 说明 |
| --- | --- | --- |
| `/` | 预渲染 | 官网首页（Hero/公司介绍/创始人/核心服务/合作模式/服务保障/内容精选轮播/CTA） |
| `/content/[id]` | SSR + SWR 600s | 文章详情（Markdown 服务端渲染、上/下一篇、相关资讯）；不存在/未发布返回真实 404；阅读量由 hydration 后客户端端点计数（SSR/爬虫不计） |
| `/news`、`/news/[category]` | SSR + SWR 60s | 内容精选归档页（全部 + 公司动态/行业新闻/产品资讯/资讯），分页 |
| `/valuation` | SSR（不预渲染） | 整机残值评估输入；字典公开接口服务端预取，提交无需登录 |
| `/valuation/battery` | SSR（不预渲染） | 电池 RUL 评估输入（至少 10 个完整循环的 JSON） |
| `/valuation/history` | SSR（需登录，不预渲染） | 评估历史（整机 / 电池两个页签），令牌由服务端注入 |
| `/valuation/report/[id]`、`/valuation/battery/report/[id]` | SSR（需登录，不预渲染） | 历史详情 + PDF 报告下载入口（经 `/api` 代理流式转发） |
| `/valuation/login` | SSR（不预渲染） | 估值登录（BFF 会话 Cookie），已登录自动回跳 |
| `/sitemap.xml`、`/robots.txt` | 预渲染 | 构建时生成 |

### 残值评估工作区（`/valuation/**`）

- **登录与会话（ADR-0002）**：`/__portal__/valuation/session/{login,logout}` 由本仓 BFF 独占——服务端调 `POST /api/valuation/auth/login`，把双令牌封进 **httpOnly + Secure + SameSite=Lax + Path=/、不设 Domain** 的本域会话 Cookie；浏览器只拿会话摘要。
- **上游鉴权**：`/api/valuation/**` 仍由 `server/middleware/api-proxy.ts` 转发（唯一一套代理），转发前注入 `Authorization: Bearer` 并摘掉会话 Cookie 与浏览器自带的 `Authorization` / `X-Origin-Token`。`/api/valuation/auth/login|logout` 与 `/api/valuation/admin/**` 在代理层返回 404。
- **报告下载**：入口指向 `/api/valuation/evaluations/:id/report`（电池同理），由既有代理管道**流式**转发，PDF 不进内存。
- **SEO**：`/valuation/**` 不预渲染；页面输出 `<meta name="robots" content="noindex, nofollow">`，`routeRules` 另加 `X-Robots-Tag`，`robots.txt` 亦 disallow。

## 目录结构

```
api/          数据访问层（页面唯一 seam，页面不直接 $fetch）：featured / valuation
assets/css/   设计令牌（design-tokens/global/markdown，自 monorepo 移植）
components/   导航/页脚/归档页组件；valuation/ 估值工作区组件
composables/  useFeaturedApi（SSR 直连后端）/ useValuationApi（BFF 同源）/ useSiteLinks（跨子域链接）
config/       官网导航
pages/        路由页面（valuation/ 为残值评估工作区）
plugins/      v-reveal 滚动动画指令
server/       Nitro 代理中间件（/api、/static，含估值 Bearer 注入）+ sitemap 数据源 + 估值 BFF 会话路由
utils/        纯函数（fileUrl / markdown / siteUrl / valuation*），单测覆盖
```

## 领域词汇

官网门户 / 精选内容 / 精选内容归档页 / 阅读量的定义见主仓库 `CONTEXT.md`「门户与内容」小节；本仓库 `docs/adr/` 记录独立仓库决策。
