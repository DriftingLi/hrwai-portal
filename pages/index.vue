<template>
  <div class="portal-home">
    <SiteHero />
    <SectionAbout />
    <SectionFounder />
    <SectionProducts />
    <SectionTech />
    <SectionCooperation />
    <SectionMilestones />
    <SectionGuarantee />
    <SectionFaq />
    <SectionFeatured :items="featuredList" />
    <SectionCta />
  </div>
</template>

<script setup lang="ts">
import type { FeaturedContent } from '~/api/featured'
import { useSiteLinks } from '~/composables/useSiteLinks'
import { useFeaturedApi } from '~/composables/useFeaturedApi'

const { site } = useSiteLinks()
const { getPublicList } = useFeaturedApi()

// 首页 SEO（预渲染静态 HTML 携带完整元数据）
// title 不设置：由 app.vue titleTemplate 默认输出「和润天下人工智能科技有限公司」，避免后缀冗余
useSeoMeta({
  description: '和润天下人工智能科技有限公司 — 深耕叉车行业，提供叉车维修培训认证、叉车残值智能评估、二手叉车信息撮合与 AI 叉车助手，助力叉车产业链数字化升级。',
  ogTitle: '和润天下人工智能科技有限公司',
  ogDescription: '深耕叉车行业，提供叉车维修培训、残值评估、二手交易与 AI 助手一站式解决方案。',
  ogType: 'website',
  ogImage: site('/images/hero-bg.webp'),
  ogUrl: site('/'),
  twitterCard: 'summary_large_image',
  twitterTitle: '和润天下人工智能科技有限公司'
})

/* ---------- 内容精选数据（板块呈现见 SectionFeatured） ---------- */
// 预渲染阶段服务端取数（构建时嵌入静态 HTML），客户端 hydration 复用载荷不重取。
// 后端不可达（如构建环境无内网连通）时降级为空列表，不阻断构建/渲染。
const { data: featuredData } = await useAsyncData(
  'featured-list',
  () =>
    getPublicList({ page: 1, page_size: 6 }).catch(() => ({
      items: [],
      total: 0,
      page: 1,
      pages: 1
    })),
  { default: () => ({ items: [], total: 0, page: 1, pages: 1 }) }
)

// 关键：setup 期即填充列表——SSR/预渲染 HTML 直接包含精选内容标题/摘要（SEO 需要）
const featuredList = computed(() => ((featuredData.value?.items as unknown) || []) as FeaturedContent[])
</script>

<style scoped>
.portal-home {
  background: var(--color-bg-card);
}
</style>
