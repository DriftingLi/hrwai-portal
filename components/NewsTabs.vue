<template>
  <nav class="news-tabs">
    <NuxtLink
      to="/news"
      class="news-tab"
      :class="{ active: activeKey === 'all' }"
    >全部</NuxtLink>
    <NuxtLink
      v-for="key in featuredCategoryKeys"
      :key="key"
      :to="`/news/${key}`"
      class="news-tab"
      :class="{ active: activeKey === key }"
    >{{ categoryLabel(key) }}</NuxtLink>
  </nav>
</template>

<script setup lang="ts">
import { featuredCategoryKeys, categoryLabel } from '~/api/featured'

defineProps<{ activeKey: string }>()
</script>

<style scoped>
.news-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-bottom: var(--space-10);
}
.news-tab {
  display: inline-flex;
  align-items: center;
  padding: 8px 20px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: all var(--duration-fast);
}
.news-tab:hover {
  border-color: var(--color-primary-300);
  color: var(--color-primary-600);
}
.news-tab.active {
  background: var(--gradient-brand);
  border-color: transparent;
  color: #fff;
}
</style>
