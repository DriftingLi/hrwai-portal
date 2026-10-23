<template>
  <div class="portal-layout">
    <PortalNavbar :menu-items="portalNav" />
    <main class="portal-main">
      <NuxtPage />
    </main>
    <PortalFooter />
    <BackToTop />
  </div>
</template>

<script setup lang="ts">
import { watch, onMounted } from 'vue'
import { portalNav } from '~/config/portalNav'
import { siteFontsHref } from '~/config/siteFonts'
import { criticalCss } from '~/config/criticalCss'
import { useSiteLinks } from '~/composables/useSiteLinks'

const config = useRuntimeConfig()
const siteBase = config.public.siteUrl as string
const baiduVerification = config.public.baiduVerification as string
const { site } = useSiteLinks()

// 跨页锚点滚动（导航/页脚 /#anchor 链接：整页跳转后滚到目标区块）
const route = useRoute()
watch(
  () => route.hash,
  (hash) => {
    if (!hash) return
    nextTick(() => {
      setTimeout(() => {
        document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
      }, 50)
    })
  },
  { immediate: true }
)

// 百度站长验证 meta（NUXT_PUBLIC_BAIDU_VERIFICATION 配置后输出）
if (baiduVerification) {
  useHead({
    meta: [{ name: 'baidu-site-verification', content: baiduVerification }]
  })
}

// 全站默认 head（页面级 useSeoMeta 覆盖标题/描述）
useHead({
  htmlAttrs: { lang: 'zh-CN' },
  titleTemplate: (title) => (title ? `${title} - 和润天下` : '和润天下（广州）人工智能科技有限公司'),
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes' },
    { name: 'format-detection', content: 'telephone=no' },
    { name: 'description', content: '和润天下（广州）人工智能科技有限公司 — 深耕叉车行业，提供叉车维修培训、残值智能评估、二手叉车交易撮合与 AI 叉车助手等一站式人工智能解决方案。' }
  ],
  // 标签页图标 = 公司 logo（由 scripts/gen-favicon.mjs 从 HRWAIlogo.jpg 生成）
  link: [
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
    { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
    { rel: 'icon', type: 'image/png', sizes: '48x48', href: '/favicon-48x48.png' },
    { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }
  ]
})

// canonical + Organization 结构化数据：仅在配置了站点地址后输出绝对 URL
if (siteBase) {
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: '和润天下（广州）人工智能科技有限公司',
    url: site('/'),
    logo: site('/images/HRWAIlogo.jpg'),
    description: '深耕叉车行业，以 AI 技术驱动产业智能化升级。'
  }
  useHead({
    link: [{ rel: 'canonical', href: site('/') }],
    script: [
      {
        children: JSON.stringify(organizationJsonLd),
        type: 'application/ld+json'
      } as any
    ]
  })
}

// 首屏关键 CSS 内联进 <head>：HTML 一到就出正确的首帧（原因见 config/criticalCss.ts）
useHead({
  style: [
    {
      key: 'critical-css',
      textContent: criticalCss,
      // critical 别名 = 负权重，保证排在 Nuxt 注入的样式之前（后者可覆盖）
      tagPriority: 'critical'
    }
  ]
})

/* ---------- 字体样式表：异步加载，不阻塞首屏 ----------
   字体是自托管的（nuxt.config 注释），但 @font-face 声明有 400+ 条 unicode-range 切片，
   塞进入口样式表会把它撑到 500KB+ 并拖住首屏渲染。这里改为：
     - SSR 只发 preload（as=style）：与 HTML 并行下载、预热缓存，本身不阻塞渲染
     - 水合完成后由下面的 onMounted 真正插入 <link rel="stylesheet">
     - 浏览器不支持 JS 时由 <noscript> 兜底（此时才走阻塞路径，属于降级）
   为什么不用更常见的「media="print" + onload 切 all」：unhead 在水合时会把 SSR 的
   props 重新打到 DOM 上，media 会被改回 print，字体就永远不生效（实测只注册了 24 个
   hero 面，而不是 475 个）。这个写法绕开 unhead 对 head 标签的接管。
   文件由 scripts/gen-site-fonts.mjs 生成（内容哈希命名，可长缓存）。 */
useHead({
  link: [
    {
      key: 'site-fonts-preload',
      rel: 'preload',
      as: 'style',
      href: siteFontsHref
    }
  ],
  noscript: [
    {
      innerHTML: `<link rel="stylesheet" href="${siteFontsHref}">`,
      tagPriority: 'critical'
    }
  ]
})

onMounted(() => {
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = siteFontsHref
  link.dataset.siteFonts = 'true'
  document.head.appendChild(link)
})
</script>

<style scoped>
.portal-layout {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-page);
}
.portal-main {
  flex: 1;
}
</style>
