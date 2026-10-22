# ADR-0002：残值评估工作区的 BFF 会话与路由

- 状态：已接受
- 日期：2026-10-22
- 关联：GitHub issue #32；FL 仓 #1756（估值族令牌与 `/api/valuation/auth/login`，契约不可改）

## Context

残值评估的前端原本住在 FL 仓的 Vue SPA 里，与培训站共用同一族 Cookie（`aud=web`），挂在易道的域名下；报告署名、短信签名与备案主体却是和润。搬迁到门户仓（Nuxt 4，`valuation.hrwai.cn` 或 `www.hrwai.cn/valuation`）后，有一条新边界必须一次定清楚：

- 估值令牌（`aud=valuation`）不能落到浏览器：`localStorage` 与页面变量都能被脚本读取，那就等于把「会话边界独立」交还给前端自己擦；
- 后端契约不变：`POST /api/valuation/auth/login` 签双令牌且**不下发 Cookie**，登录后的读面（历史/详情）只认 `Authorization: Bearer`；
- 门户已有唯一一套同源 BFF：`server/middleware/api-proxy.ts` 把 `/api/**`、`/static/**` 转发到 `NUXT_API_INTERNAL_BASE` 并带 `X-Origin-Token`；票面明确「不新增代理」。

## Decision

1. **路由前缀**：`/valuation/**` 是同一个 Nuxt 应用的路由前缀（整机输入 `/valuation`、电池输入 `/valuation/battery`、历史 `/valuation/history`、详情 `/valuation/report/:id` 与 `/valuation/battery/report/:id`、登录 `/valuation/login`）。需要登录的页面按请求实时取数，**不预渲染**；`/valuation/**` 输出 `X-Robots-Tag: noindex`（routeRules）与页面 `<meta name="robots">`，并写进 `robots.txt` 的 disallow。
2. **BFF 会话**：登录由服务端调 `POST /api/valuation/auth/login`，把 `{token,refresh_token,user_id,account,username,role}` 封进 **httpOnly + Secure + SameSite=Lax + Path=/、不设 Domain** 的本域会话 Cookie（`hrwai_valuation_session`）。浏览器只拿到会话摘要，**永远不接触令牌**；`Secure` 仅在「dev 且请求为 http」时放宽，否则本机 http 调试无法存 Cookie。
3. **代理注入**：`/api/valuation/**` 转发前，从会话 Cookie 取出 access token 注入 `Authorization: Bearer`；同时（a）摘掉转发头里的会话 Cookie（它就是可用令牌，上游不需要）、（b）抹掉浏览器自带的 `Authorization` 与 `X-Origin-Token`（凭证唯一来源是服务端会话与部署环境变量）。凭证策略单点在 `server/utils/valuationProxy.ts`，可被单测。
4. **会话端点独占**：登录/登出/当前用户放在 `/__portal__/valuation/session/*`（`/api/**` 是代理命名空间，不能自用）。`/api/valuation/auth/login`、`/api/valuation/auth/logout` 与 `/api/valuation/admin/**` 在代理层直接 404：前者直达等于把令牌交给浏览器，后者属易道管理后台（票面决策补充：本仓不引用）。
5. **有效期**：会话 Cookie 寿命与 access token 的 `exp` 对齐（后端默认 2h）；refresh 只在登出时用于吊销上游会话。自动续期**不在本票**（轮换 refresh 并回写 Cookie 是另一个决定）。
6. **报告下载不新增转发实现**：入口链接指向 `/api/valuation/evaluations/:id/report`（电池同理），由既有代理管道流式转发（`proxyRequest`），PDF 不进内存。
7. **数据访问层**：`api/valuation.ts` 是页面唯一取数入口（与 `api/featured.ts` 同约定）；`useValuationApi` 用 `useRequestFetch` 绑定取数器——SSR 转发原始请求头、客户端同源相对路径，两侧都经同一个 BFF。

## Consequences

- 浏览器里不存在可被 JS 读取的估值凭证；登出清本域 Cookie 并尽力吊销上游 refresh（失败只留日志，不反悔）。
- 会话 Cookie 的内容是 base64 JSON（httpOnly 阻止脚本读取，但**未加密**）：拿到 Cookie 即等价于拿到令牌。若后续要求更强隔离，应改为签名/加密 Cookie 或服务端会话存储——本票不做。
- access token 2h 过期后需要重新登录（未实现自动续期）；登出端点没有 CSRF token，依赖 SameSite=Lax（跨站 POST 不带 Cookie）与同源调用面。
- 旧 SPA 与门户并存期间，两套登录态互相独立；旧入口 301 由部署侧在切换日执行（不属本仓代码）。
- 测试面：`server/utils/__tests__/*` 锁定「输入 → 上游请求/状态码」，`api/__tests__/valuation.spec.ts` 锁定端点与查询参数，`pages/valuation/__tests__/*.ssr.spec.ts` 锁定页面渲染。
