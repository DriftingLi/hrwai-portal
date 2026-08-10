# ADR-0001：官网门户独立仓库 + Nuxt 混合渲染

- 状态：已接受
- 日期：2026-08-09

## Context

官网首页与精选内容模块原为 Vue3 SPA（monorepo `frontend/`）的一个路由分支（www 子域名），纯客户端渲染（CSR）：搜索引擎抓取不到实质内容；精选内容无列表页，超过 6 条的内容不可发现；官网与培训/评估/AI 助手耦合在同一 SPA 与同一 nginx 容器，无法独立演进。

## Decision

1. **独立仓库**：官网门户为独立 Nuxt 4 应用，独占 www 子域名；与 Vue SPA 工作区（training./valuation./mentor./manage.）解耦。开发期在 monorepo 内 `portal/` 文件夹（gitignored）进行，完成后发布为独立 GitHub 仓库。
2. **混合渲染**：`/` 构建时预渲染；`/content/**` 与 `/news` SSR + SWR 定时重新验证（600s / 60s）。**不引入发布 webhook**——后台发布后最多一个周期自动生效；如将来需要，Nitro `revalidate` API 已预留。
3. **数据通路**：SSR 直连后端内网地址（`NUXT_API_INTERNAL_BASE`，与 sitemap 数据源同模式）；浏览器同源 `/api`、`/static` 经 Nitro 代理中间件转发，无 CORS。
4. **阅读量语义拆分**：详情接口带 `no_view=1`（SSR/爬虫路径）不计阅读量；新增客户端计数端点 `POST /api/featured-content/:id/view`，真实浏览器 hydration 后调用。「阅读量」从此定义为真实用户视角计数，与「详情请求次数」区分（见 CONTEXT.md）。
5. **URL 保持**：`/content/:id` 路径与现网一致，已收录链接不失效；新增 `/news`、`/news/[category]` 归档页消除孤儿内容。
6. **AI 助手迁移**：原 www 上的 `/ai-assistant` 迁至 training. 子域名（学员功能归属），门户核心服务卡片整页跳转。

## Consequences

- 门户可独立部署、独立演进；后端公开接口是两仓库间的唯一契约（数据访问层测试锁定）。
- SWR 时效：新发布内容列表 1 分钟内、详情 10 分钟内可见。
- 构建期依赖：预渲染与 sitemap 需要后端公开接口可达；不可达时降级为空数据，不阻断构建。
- monorepo 内 Vue SPA 的官网代码在上线验证后延迟清理（见 spec Out of Scope）。
