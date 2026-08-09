<template>
  <div class="dispatch-page">
    <div class="container">
      <div class="dispatch-card">
        <div class="dispatch-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
        </div>
        <h1 class="dispatch-title">二手叉车交易</h1>
        <p class="dispatch-subtitle">一站式二手叉车信息撮合平台，即将上线</p>
        <p class="dispatch-desc">
          整合车源信息与 AI 残值评估报告，消除信息不对称，让买卖双方高效对接、透明交易。
        </p>
        <div class="dispatch-actions">
          <NuxtLink to="/" class="btn-back">返回首页</NuxtLink>
          <a :href="externalMallUrl" target="_blank" rel="noopener noreferrer" class="btn-outline">
            访问现有交易平台 →
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSiteLinks } from '~/composables/useSiteLinks'
import { externalMallUrl } from '~/config/links'

const { site } = useSiteLinks()

useSeoMeta({
  title: '二手叉车交易',
  description: '一站式二手叉车信息撮合平台，整合车源信息与 AI 残值评估报告，即将上线。',
  ogTitle: '二手叉车交易',
  ogDescription: '一站式二手叉车信息撮合平台，即将上线。',
  ogType: 'website',
  ogUrl: site('/dispatch')
})

useHead({
  link: [{ rel: 'canonical', href: site('/dispatch') }]
})
</script>

<style scoped>
.dispatch-page {
  min-height: 100vh;
  background: var(--color-bg-page);
  padding: 160px var(--space-6) 80px;
}
.container {
  max-width: var(--container-narrow);
  margin: 0 auto;
}
.dispatch-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  padding: var(--space-16) var(--space-10);
  text-align: center;
}
.dispatch-icon {
  width: 88px;
  height: 88px;
  margin: 0 auto var(--space-8);
  border-radius: var(--radius-full);
  background: var(--color-primary-50);
  color: var(--color-primary-500);
  display: flex;
  align-items: center;
  justify-content: center;
}
.dispatch-title {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin: 0 0 var(--space-4);
}
.dispatch-subtitle {
  font-size: var(--text-lg);
  font-weight: var(--font-medium);
  color: var(--color-primary-600);
  margin: 0 0 var(--space-6);
}
.dispatch-desc {
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--color-text-secondary);
  max-width: 480px;
  margin: 0 auto var(--space-10);
}
.dispatch-actions {
  display: flex;
  gap: var(--space-4);
  justify-content: center;
  flex-wrap: wrap;
}
.btn-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 12px 32px;
  background: var(--gradient-brand);
  color: #fff;
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  border-radius: var(--radius-md);
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: opacity var(--duration-fast), transform var(--duration-fast);
}
.btn-back:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
.btn-outline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 12px 32px;
  background: transparent;
  color: var(--color-primary-600);
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  border-radius: var(--radius-md);
  text-decoration: none;
  border: 2px solid var(--color-primary-500);
  cursor: pointer;
  transition: background var(--duration-fast);
}
.btn-outline:hover {
  background: var(--color-primary-50);
}
</style>
