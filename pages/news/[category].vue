<template>
  <div class="news-page">
    <div class="container">
      <header class="news-header">
        <h1 class="news-title">{{ categoryLabel(category) }}</h1>
        <p class="news-subtitle">和润天下内容精选 — {{ categoryLabel(category) }}</p>
      </header>

      <NewsArchive :category="category" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { categoryLabel, featuredCategoryKeys } from '~/api/featured'
import { useSiteLinks } from '~/composables/useSiteLinks'

const route = useRoute()
const { site } = useSiteLinks()

// 分类 key 校验：无效分类返回真实 404
const category = computed(() => (route.params.category as string) || '')
if (!featuredCategoryKeys.includes(category.value as (typeof featuredCategoryKeys)[number])) {
  throw createError({ statusCode: 404, statusMessage: '分类不存在' })
}

const categoryTitle = computed(() => categoryLabel(category.value))

useSeoMeta({
  title: categoryTitle,
  description: computed(() => `和润天下内容精选 — ${categoryTitle.value}，关注叉车行业智能化发展。`),
  ogTitle: computed(() => categoryTitle.value),
  ogDescription: computed(() => `和润天下内容精选 — ${categoryTitle.value}。`),
  ogType: 'website',
  ogUrl: computed(() => site(`/news/${category.value}`)),
  twitterCard: 'summary_large_image'
})

// BreadcrumbList 结构化数据（首页 → 内容精选 → 分类）
useHead({
  link: computed(() => [{ rel: 'canonical', href: site(`/news/${category.value}`) }]),
  script: computed(() => [
    {
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '首页', item: site('/') },
          { '@type': 'ListItem', position: 2, name: '内容精选', item: site('/news') },
          { '@type': 'ListItem', position: 3, name: categoryTitle.value, item: site(`/news/${category.value}`) }
        ]
      }),
      type: 'application/ld+json'
    } as any
  ])
})
</script>

<style scoped>
.news-page {
  background: var(--color-bg-page);
  padding: 120px 0 80px;
  min-height: 100vh;
  min-height: 100dvh;
}
.container {
  max-width: var(--container-page);
  margin: 0 auto;
  padding: 0 var(--space-6);
}
.news-header {
  text-align: center;
  margin-bottom: var(--space-10);
}
.news-title {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin: 0;
  position: relative;
  display: inline-block;
}
.news-title::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 56px;
  height: 3px;
  background: linear-gradient(to right, #0EA5E9, #14B8A6);
  border-radius: 2px;
}
.news-subtitle {
  margin: var(--space-5) 0 0;
  font-size: var(--text-base);
  color: var(--color-text-tertiary);
}
</style>
