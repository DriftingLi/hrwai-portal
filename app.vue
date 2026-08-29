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
import { watch } from 'vue'
import { portalNav } from '~/config/portalNav'
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
  titleTemplate: (title) => (title ? `${title} - 和润天下` : '和润天下人工智能科技有限公司'),
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes' },
    { name: 'format-detection', content: 'telephone=no' },
    { name: 'description', content: '和润天下人工智能科技有限公司 — 深耕叉车行业，提供叉车维修培训、残值智能评估、二手叉车交易撮合与 AI 叉车助手等一站式人工智能解决方案。' }
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
    name: '和润天下人工智能科技有限公司',
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

// 字体改为自托管（nuxt.config css 数组引入 Space Grotesk / MiSans / JetBrains Mono），
// 不再请求 Google Fonts（大陆访问不稳定，且 stylesheet 链接阻塞渲染）。
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
