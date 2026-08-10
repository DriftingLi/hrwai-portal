<template>
  <div class="news-archive">
    <NewsTabs :active-key="activeKey" />

    <div v-if="list.items.length" class="news-grid">
      <NewsCard v-for="item in list.items" :key="item.content_id" :item="item" />
    </div>
    <div v-else class="news-empty">暂无内容</div>

    <nav v-if="list.pages > 1" class="news-pagination">
      <NuxtLink v-if="page > 1" :to="pageUrl(page - 1)" class="page-link">上一页</NuxtLink>
      <span class="page-info">第 {{ page }} / {{ list.pages }} 页</span>
      <NuxtLink v-if="page < list.pages" :to="pageUrl(page + 1)" class="page-link">下一页</NuxtLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFeaturedApi } from '~/composables/useFeaturedApi'

const props = defineProps<{ category?: string }>()

const route = useRoute()
const { getPublicList } = useFeaturedApi()

const PAGE_SIZE = 10
const activeKey = computed(() => props.category || 'all')
const page = computed(() => {
  const p = Number(route.query.page)
  return Number.isInteger(p) && p > 0 ? p : 1
})

const { data: list } = await useAsyncData(
  `news-list-${activeKey.value}-${page.value}`,
  () =>
    getPublicList({
      page: page.value,
      page_size: PAGE_SIZE,
      ...(props.category ? { category: props.category } : {})
    }).catch(() => ({ items: [], page: page.value, pages: 1, total: 0 })),
  { default: () => ({ items: [], page: 1, pages: 1, total: 0 }) }
)

function pageUrl(p: number) {
  const base = props.category ? `/news/${props.category}` : '/news'
  return p > 1 ? `${base}?page=${p}` : base
}
</script>

<style scoped>
.news-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
  gap: var(--space-6);
}
.news-empty {
  text-align: center;
  padding: 80px 0;
  color: var(--color-text-tertiary);
  font-size: var(--text-base);
}
.news-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-6);
  margin-top: var(--space-12);
}
.page-link {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 8px 20px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  text-decoration: none;
  transition: all var(--duration-fast);
}
.page-link:hover {
  border-color: var(--color-primary-300);
  color: var(--color-primary-600);
}
.page-info {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}
</style>
