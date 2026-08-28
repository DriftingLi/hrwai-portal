<template>
  <article class="news-card">
    <NuxtLink :to="`/content/${item.content_id}`" class="news-card__link">
      <div class="news-card__media">
        <img
          v-if="item.cover_image"
          :src="resolveFileUrl(item.cover_image)"
          :alt="item.title"
          loading="lazy"
          decoding="async"
        />
        <div v-else class="news-card__placeholder">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
        <span class="news-card__tag">{{ categoryLabel(item.category) }}</span>
      </div>
      <div class="news-card__body">
        <h3 class="news-card__title">{{ item.title }}</h3>
        <p class="news-card__summary">{{ item.summary || '暂无摘要' }}</p>
        <div class="news-card__meta">
          <span v-if="item.published_at">{{ formatDate(item.published_at) }}</span>
          <span v-if="item.view_count">阅读 {{ item.view_count }}</span>
        </div>
      </div>
    </NuxtLink>
  </article>
</template>

<script setup lang="ts">
import type { FeaturedContent } from '~/api/featured'
import { categoryLabel } from '~/api/featured'
import { resolveFileUrl } from '~/utils/fileUrl'
import { formatDate } from '~/utils/formatDate'

defineProps<{ item: FeaturedContent }>()
</script>

<style scoped>
.news-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  transition: box-shadow var(--duration-normal), transform var(--duration-normal), border-color var(--duration-fast);
}
.news-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
  border-color: var(--color-primary-300);
}
.news-card__link {
  display: block;
  text-decoration: none;
  color: inherit;
}
.news-card__media {
  position: relative;
  aspect-ratio: 16 / 9;
  background: var(--surface-card-alt);
  overflow: hidden;
}
.news-card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform var(--duration-slow);
}
.news-card:hover .news-card__media img {
  transform: scale(1.05);
}
.news-card__placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
}
.news-card__tag {
  position: absolute;
  top: var(--space-3);
  left: var(--space-3);
  background: var(--gradient-brand);
  color: #fff;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  box-shadow: var(--shadow-sm);
}
.news-card__body {
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.news-card__title {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  line-height: var(--leading-snug);
  color: var(--color-text-primary);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.news-card__summary {
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--color-text-secondary);
  margin: 0;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.news-card__meta {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  display: flex;
  gap: var(--space-4);
}
</style>
