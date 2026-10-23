// https://nuxt.com/docs/api/configuration/nuxt-config
import { buildSiteUrl } from './utils/siteUrl'

// 站点地址统一由 PORTAL_SITE_URL 提供（刻意不用 NUXT_PUBLIC_SITE_URL：
// 后者会自动映射 runtimeConfig.public.siteUrl 并在运行时覆盖配置期归一化结果，
// 导致 canonical/sitemap 出现非 www 版本）。
// 此处归一化为 www 固定版（SEO 决策，见 utils/siteUrl.ts）。
const siteUrl = buildSiteUrl('/', process.env.PORTAL_SITE_URL || '').replace(/\/$/, '')

// 功能服务域根（training./valuation. 子域所在域）。门户换域名后功能服务可能仍在原域，
// 故与站点地址分开配置：未配置时跟随站点地址（门户与功能同根域的旧行为）。
// 不加 www 前缀亦可——buildSubdomainUrl 会自行剥离。
const featureBase = (process.env.PORTAL_FEATURE_BASE || siteUrl).replace(/\/$/, '')

// 功能入口分属两个域族（门户票 #32 后续 / FL 票 #1756 切换）：
//   训练站 → training.gdyidao.cn（易道）；残值评估 → valuation.hrwai.cn/valuation（和润）。
// 两者各自可配（PORTAL_TRAINING_URL / PORTAL_VALUATION_URL），代码里给的是**当前可用的缺省值**。
// 残值域名证书于 2026-10-22 就绪（/、/valuation、/api 实测全 200），故缺省已指向子域。
const trainingBase = (process.env.PORTAL_TRAINING_URL || 'https://training.gdyidao.cn').replace(/\/+$/, '')
const valuationBase = (process.env.PORTAL_VALUATION_URL || 'https://valuation.hrwai.cn/valuation').replace(/\/+$/, '')

// ICP 备案号随域名变化：当前为 hrwai.cn 的备案号（2026-10 完成备案）；
// 需要临时切换域名时可经 PORTAL_ICP 覆盖，留空则不输出备案信息。
const icp = process.env.PORTAL_ICP ?? '粤ICP备2026161235号-1'

export default defineNuxtConfig({
  compatibilityDate: '2026-08-01',

  modules: ['@nuxtjs/sitemap', '@nuxtjs/robots'],

  ssr: true,

  // ===== 组件自动导入（home/ 子目录关闭路径前缀，板块组件保持 SiteHero 等原名） =====
  components: [
    { path: '~/components/home', pathPrefix: false },
    // 估值页组件同样关掉路径前缀：ValuationShell / WholeMachineForm 等按原名使用
    { path: '~/components/valuation', pathPrefix: false },
    '~/components'
  ],

  // ===== 页面切换过渡（过渡类定义在 global.css；prefers-reduced-motion 下禁用） =====
  app: {
    pageTransition: { name: 'page', mode: 'out-in' }
  },

  // ===== 站点 URL（site-config：sitemap/robots/canonical 解析统一来源） =====
  site: {
    url: siteUrl
  },

  // ===== 运行时配置（部署时经环境变量覆盖） =====
  // NUXT_API_INTERNAL_BASE    SSR 直连后端的地址（dev 默认本机 8080）
  // PORTAL_SITE_URL           canonical/OG/sitemap 使用的站点地址（如 https://www.hrwai.cn）
  // PORTAL_FEATURE_BASE       旧口径：功能服务域根（仅 buildSubdomainUrl 仍在用）
  // PORTAL_TRAINING_URL       训练站入口（缺省 https://training.gdyidao.cn）
  // PORTAL_VALUATION_URL      残值评估入口（缺省 <siteUrl>/valuation；域名证书就绪后切子域）
  // PORTAL_ICP                页脚 ICP 备案号；缺省为当前站点备案号
  // NUXT_PUBLIC_BAIDU_VERIFICATION  百度站长验证码，留空则不输出验证 meta
  runtimeConfig: {
    apiInternalBase: process.env.NUXT_API_INTERNAL_BASE || 'http://127.0.0.1:8080',
    // 回源鉴权 token（票 FL#1746）：/api 代理回源时带 X-Origin-Token，源站 nginx 只有
    // 在 token 命中时才采信 EO-Connecting-IP（真实客户端 IP）。留空 = 不带该头，
    // 源站会退回「按边缘节点取 IP」的旧行为（不会更糟，但 IP 仍不是用户）。
    apiOriginToken: process.env.NUXT_API_ORIGIN_TOKEN || '',
    public: {
      siteUrl,
      featureBase,
      trainingBase,
      valuationBase,
      icp,
      baiduVerification: ''
    }
  },

  // ===== SEO：sitemap / robots（站点地址统一来自 site.url，见上方 site 配置） =====
  // sitemap 源路由位于 /__portal__/ 命名空间：/api/** 由代理中间件转发后端，避免劫持
  sitemap: {
    sources: ['/__portal__/sitemap-urls'],
    autoLastmod: true,
    // 估值工作区是登录后的动态页面，不进 sitemap（票 #32）；
    // 保留模块默认的 /_** 排除项（Nuxt 内部路径），不要整体覆盖掉
    exclude: ['/_**', '/valuation/**']
  },
  robots: {
    sitemap: '/sitemap.xml',
    // 估值页面不抓取；索引层另有页面 meta 与 X-Robots-Tag 兜底
    disallow: ['/valuation']
  },

  // ===== 全局样式（设计令牌 → 基础样式 → 文章正文） =====
  // 这里只放**布局样式**：它们进入 Vite 的入口样式表 entry.*.css，而入口样式表是渲染
  // 阻塞资源——首屏 paint 必须等它下载+解析完。字体声明（@font-face，含 400+ 条
  // unicode-range 切片）体量是布局样式的几十倍，放进来会把这笔等待放大到秒级。
  //
  // 字体（自托管，替代 Google Fonts：大陆访问 fonts.googleapis 不稳定）：
  // - MiSans（小米，免费商用）：简中切片子集（unicode-range 按需加载），字重为 MiSans 自有标度
  //   （Regular=330/Demibold=450/Bold=630/Heavy=700），浏览器对标准 400/500/600/700 自动就近匹配
  // - Space Grotesk（OFL）：西文/数字展示字体；JetBrains Mono（OFL）：序号/年份等 mono 点缀
  // 它们的 @font-face 由 scripts/gen-site-fonts.mjs 汇总成 public/fonts/site.<hash>.css，
  // app.vue 以 preload + 异步 stylesheet 加载，不阻塞首屏（见该文件注释）。
  css: [
    // hero 首屏关键字体子集（scripts/gen-hero-fonts.mjs 生成）：这条**必须**留在阻塞样式里，
    // 否则首屏 hero 文案会先用系统字体渲染再跳成 MiSans（swap 二次闪变）。
    // 24 个 @font-face 只有 4.9KB，代价可接受；其余 427 条走异步。
    '~/assets/css/hero-fonts.css',
    '~/assets/css/design-tokens.css',
    '~/assets/css/global.css',
    '~/assets/css/markdown.css'
  ],

  // ===== 混合渲染策略 =====
  routeRules: {
    '/': { swr: 60 },
    '/sitemap.xml': { prerender: true },
    '/robots.txt': { prerender: true },
    '/news': { swr: 60 },
    '/news/**': { swr: 60 },
    '/content/**': { swr: 600 },
    // 估值工作区（票 #32）：按服务端会话实时渲染，**不预渲染**；
    // /valuation/** 一律 noindex——动态评估页不该进搜索索引
    '/valuation/**': {
      headers: { 'x-robots-tag': 'noindex, nofollow' }
    }
  },

  // ===== 类型检查 =====
  typescript: {
    strict: true
  },

  // ===== 构建 =====
  vite: {
    build: {
      // rolldown-vite 用 lightningcss 压缩 CSS，会把 max-width: 767px 编译成 range 语法
      // (width<=767px)——旧浏览器/WebView（Chrome<104、部分国产内核）不支持 →
      // 媒体查询全部失效（移动端完全不适配）。关闭 CSS 压缩，保留传统 max-width 语法。
      cssMinify: false
    }
  }
})
