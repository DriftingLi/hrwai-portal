<template>
  <div class="news-page">
    <div class="container">
      <header class="news-header">
        <h1 class="news-title">内容精选</h1>
        <p class="news-subtitle">最新公司动态与行业资讯</p>
      </header>

      <NewsArchive />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSiteLinks } from '~/composables/useSiteLinks'

const { site } = useSiteLinks()

useSeoMeta({
  title: '内容精选',
  description: '和润天下内容精选 — 公司动态、行业新闻、产品资讯与资讯，关注叉车行业智能化发展。',
  ogTitle: '内容精选',
  ogDescription: '和润天下内容精选 — 公司动态、行业新闻、产品资讯与资讯。',
  ogType: 'website',
  ogUrl: site('/news'),
  twitterCard: 'summary_large_image'
})

// BreadcrumbList 结构化数据
useHead({
  link: [{ rel: 'canonical', href: site('/news') }],
  script: [
    {
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '首页', item: site('/') },
          { '@type': 'ListItem', position: 2, name: '内容精选', item: site('/news') }
        ]
      }),
      type: 'application/ld+json'
    } as any
  ]
})
</script>

<style scoped>
.news-page {
  background: var(--color-bg-page);
  padding: 120px 0 80px;
  min-height: 100vh;
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
