// https://nuxt.com/docs/api/configuration/nuxt-config
import { buildSiteUrl } from './utils/siteUrl'

// 站点地址统一由 PORTAL_SITE_URL 提供（刻意不用 NUXT_PUBLIC_SITE_URL：
// 后者会自动映射 runtimeConfig.public.siteUrl 并在运行时覆盖配置期归一化结果，
// 导致 canonical/sitemap 出现非 www 版本）。
// 此处归一化为 www 固定版（SEO 决策，见 utils/siteUrl.ts）。
const siteUrl = buildSiteUrl('/', process.env.PORTAL_SITE_URL || '').replace(/\/$/, '')

export default defineNuxtConfig({
  compatibilityDate: '2026-08-01',

  modules: ['@nuxtjs/sitemap', '@nuxtjs/robots'],

  ssr: true,

  // ===== 站点 URL（site-config：sitemap/robots/canonical 解析统一来源） =====
  site: {
    url: siteUrl
  },

  // ===== 运行时配置（部署时经环境变量覆盖） =====
  // NUXT_API_INTERNAL_BASE    SSR 直连后端的内部地址（dev 默认本机 8080）
  // PORTAL_SITE_URL           canonical/OG/sitemap 使用的 www 站点地址（如 https://www.example.com）
  // NUXT_PUBLIC_BAIDU_VERIFICATION  百度站长验证码，留空则不输出验证 meta
  runtimeConfig: {
    apiInternalBase: process.env.NUXT_API_INTERNAL_BASE || 'http://127.0.0.1:8080',
    public: {
      siteUrl,
      baiduVerification: ''
    }
  },

  // ===== SEO：sitemap / robots（站点地址统一来自 site.url，见上方 site 配置） =====
  // sitemap 源路由位于 /__portal__/ 命名空间：/api/** 由代理中间件转发后端，避免劫持
  sitemap: {
    sources: ['/__portal__/sitemap-urls'],
    autoLastmod: true
  },
  robots: {
    sitemap: '/sitemap.xml'
  },

  // ===== 全局样式（设计令牌 / 基础样式 / 文章正文） =====
  css: [
    '~/assets/css/design-tokens.css',
    '~/assets/css/global.css',
    '~/assets/css/markdown.css'
  ],

  // ===== 混合渲染策略 =====
  routeRules: {
    '/': { prerender: true },
    '/sitemap.xml': { prerender: true },
    '/robots.txt': { prerender: true },
    '/news': { swr: 60 },
    '/news/**': { swr: 60 },
    '/content/**': { swr: 600 }
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
