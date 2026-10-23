# ADR-0003：首屏渲染路径（关键 CSS 内联 + 字体异步）

- 状态：已接受
- 日期：2026-10-23
- 关联：首屏白屏诊断（首页加载短暂白屏）

## Context

首页在真实网络下首屏白屏 3s 量级，诊断把原因收敛到一条链：

1. 字体 `@font-face` 原本走 `nuxt.config.ts` 的 `css` 数组，被 Vite 打进**入口样式表** `entry.*.css`。MiSans 四个字重各 100 个 `unicode-range` 切片，加三个 @fontsource 包，共 451 条 `@font-face`，把这份样式表撑到 **527KB**（gzip 前）。
2. 入口样式表是**渲染阻塞**资源：它没下载+解析完，浏览器不画第一帧，停在 UA 默认白底。截断网络下这一等就是数秒——这是白屏的主体。
3. `.hero-in` 的入场动画从 `opacity: 0` 起步，即使样式表到了，hero 文案还要再淡入一次，等于在等待之外再叠一段空窗（实测 `.hero-title` 在 224ms 时为 0、884ms 时 0.34、1255ms 才到 1）。
4. `html`/`body` 没有兜底底色（`rgba(0,0,0,0)`），所以「样式表未到时」画出来的就是纯白。

已量到的对照：拦截 CSS 请求后 FCP 3008ms→960ms；节流 A/B 下 527KB 样式表 7848ms vs 25KB 样式表 1340ms。

## Decision

1. **把字体声明移出阻塞路径**。`scripts/gen-site-fonts.mjs` 解析 `@fontsource/*` 与 `misans` 的 `@font-face`，只保留 woff2 源，字体文件复制到 `public/fonts/site/` 并按内容哈希命名，汇总成 `public/fonts/site.<hash>.css`（内容哈希 → 可 `immutable`）。入口样式表降到 **29KB**（gzip 6.4KB）。
2. **字体样式表异步加载**：SSR 只发 `preload as=style`（并行下载、预热缓存，本身不阻塞），水合完成后由 `onMounted` 插入 `<link rel="stylesheet">`，`<noscript>` 兜底。全程不进渲染阻塞路径。
   *为什么不用更常见的 `media="print"` + `onload` 切 `all`*：unhead 在水合时会把 SSR 的 props 重新打到 DOM 上，`media` 被改回 `print`，字体样式表永远不生效。实测（去掉 HTML 里的 `<script>` 后 `media` 能正确变成 `all`、注册 475 个字体面；带脚本时停在 `print`、只有 24 个 hero 面）确认了这一点。改成水合后插入 DOM 就绕开了 unhead 对 head 标签的接管。
3. **hero 首屏字体子集仍留在阻塞样式表里**（`assets/css/hero-fonts.css`，24 条 / 4.9KB）。它覆盖首屏文案的全部码点；去掉它 hero 标题会先用系统字体渲染再跳 MiSans（swap 二次闪变），代价比这 4.9KB 大。
4. **首屏关键 CSS 内联进 `<head>`**（`config/criticalCss.ts`，< 0.5KB）：`:root` 两个颜色变量 + `html,body` 底色 + `.hero` 底色与满屏高度。HTML 一到就出正确首帧，不必等任何外部样式表。`tagPriority: 'critical'` 保证排在 Nuxt 注入的样式之前。选择器刻意用 `.hero` 而不是 `#hero`：这段样式先解析，但必须让入口样式表里的 `.hero[data-v-xxx]` 能覆盖它（尤其 `100vh`/`100dvh` 双写），ID 选择器会把覆盖顶回去——测试锁住了这条。
5. **hero 入场动画只做位移、不做透明度**：`@keyframes heroIn` 去掉 `opacity`，delay 从 0.12/0.24/0.36/0.9s 收紧到 0.06/0.12/0.18/0.28s。首帧就有文案。
6. **缓存分层**（`edgeone.json`）：`/_nuxt/*` 与 `/fonts/site/*` 内容哈希 → `max-age=31536000, immutable`；`/_nuxt/builds/*` 必须 `max-age=0`（否则整站指到旧 chunk）；`/fonts/hero/*`、`/images/*` 一天缓存 + 一周 SWR；HTML 交给 SWR 路由规则（`s-maxage=60`），不在 `edgeone.json` 覆盖。
7. **一致性的闸**：`config/__tests__/criticalCss.spec.ts` 校验内联变量与 `design-tokens.css` 取值一致、规则形状、体积上限；`prebuild`/`predev` 自动重建字体样式表。

## Consequences

- 首屏 FCP（4G 节流 + 4× CPU 节流，同机 A/B 代理）：**7632ms → 3376ms**（第二轮 7392 → 2740）。同一口径下线上当前为 9928ms。
- 首帧底色（拦截全部样式表 1.2s 时采样）：改前 `html/body/.hero` 全是 `rgba(0,0,0,0)`（即白屏）；改后 `rgb(11,17,32)`。
- hero 文案（`.hero-title`）在首帧即 `opacity: 1`，不再有淡入空窗。
- 字体从「渲染阻塞」变成「异步到达」：正文区在字体就绪前用系统字体，视觉上无感；首屏 hero 不受影响（子集仍阻塞）。若后续要彻底消除正文的字体切换，可再考虑 `size-adjust` 调优的 fallback 字体，本 ADR 不做。
- `public/fonts/site/`（427 个 woff2，8MB）与 `public/fonts/site*.css` 是生成物，**不入库**（`.gitignore`）；`config/siteFonts.ts` 虽是生成物但**要入库**——`typecheck` / 单测不走 `prebuild`，缺它 `app.vue` 的 import 直接解析失败。
- 字体包升级后必须重跑 `npm run gen:site-fonts`（`prebuild`/`predev` 已覆盖常规路径，CI 若跳过 `prebuild` 需显式补一条）。
- 内联关键 CSS 是 `design-tokens.css` 的副本，两处要同步；那条测试就是闸，但它是「改错会红」而非「自动同步」。
- 遗留：`/_nuxt/builds/*` 之外，EdgeOne 默认对 HTML 也下发 `max-age=0`，靠 `routeRules` 的 SWR 头覆盖；若将来关掉 SWR，需要重新确认 HTML 的缓存语义。
