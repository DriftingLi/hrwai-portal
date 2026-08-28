<template>
  <div class="news-archive">
    <NewsTabs :active-key="activeKey" />

    <div class="sort-tabs">
      <NuxtLink :to="sortUrl('latest')" class="sort-tab" :class="{ active: sort === 'latest' }">最新资讯</NuxtLink>
      <NuxtLink :to="sortUrl('hot')" class="sort-tab" :class="{ active: sort === 'hot' }">热点资讯</NuxtLink>
    </div>

    <div v-if="list.items.length" class="news-grid">
      <NewsCard v-for="item in list.items" :key="item.content_id" :item="item" />
    </div>
    <div v-else class="news-empty">暂无内容</div>

    <nav v-if="list.pages > 1" class="news-pagination" aria-label="分页">
      <NuxtLink :to="pageUrl(page - 1)" class="page-link" :class="{ disabled: page <= 1 }" aria-label="上一页">上一页</NuxtLink>
      <template v-for="(p, idx) in paginationItems" :key="`${p}-${idx}`">
        <span v-if="p === '...'" class="page-ellipsis" aria-hidden="true">…</span>
        <NuxtLink
          v-else
          :to="pageUrl(p as number)"
          class="page-num"
          :class="{ active: p === page }"
          :aria-current="p === page ? 'page' : undefined"
          :aria-label="`第 ${p} 页`"
        >{{ p }}</NuxtLink>
      </template>
      <NuxtLink :to="pageUrl(page + 1)" class="page-link" :class="{ disabled: page >= list.pages }" aria-label="下一页">下一页</NuxtLink>
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
const sort = computed(() => {
  const s = route.query.sort as string
  return s === 'hot' ? 'hot' : 'latest'
})

const { data: list } = await useAsyncData(
  `news-list-${activeKey.value}-${page.value}-${sort.value}`,
  () =>
    getPublicList({
      page: page.value,
      page_size: PAGE_SIZE,
      sort: sort.value,
      ...(props.category ? { category: props.category } : {})
    }).catch(() => ({ items: [], page: page.value, pages: 1, total: 0 })),
  { default: () => ({ items: [], page: 1, pages: 1, total: 0 }) }
)

/**
 * 分页数字窗口（≤7 个数字 + 省略号），遵循：
 * - 总页数 ≤7 时全部展示
 * - 靠近开头：1 2 3 4 5 … last
 * - 靠近末尾：1 … last-4 last-3 last-2 last-1 last
 * - 中间：1 … p-1 p p+1 … last
 */
const paginationItems = computed<(number | '...')[]>(() => {
  const total = list.value.pages
  const cur = page.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (cur <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (cur >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', cur - 1, cur, cur + 1, '...', total]
})

function pageUrl(p: number) {
  const base = props.category ? `/news/${props.category}` : '/news'
  const q = new URLSearchParams()
  if (sort.value !== 'latest') q.set('sort', sort.value)
  if (p > 1) q.set('page', String(p))
  const qs = q.toString()
  return qs ? `${base}?${qs}` : base
}

function sortUrl(s: 'latest' | 'hot') {
  const base = props.category ? `/news/${props.category}` : '/news'
  const q = new URLSearchParams()
  if (s !== 'latest') q.set('sort', s)
  if (page.value > 1) q.set('page', String(page.value))
  const qs = q.toString()
  return qs ? `${base}?${qs}` : base
}
</script>

<style scoped>
.sort-tabs {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}
.sort-tab {
  display: inline-flex;
  align-items: center;
  padding: 6px 16px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: all var(--duration-fast);
}
.sort-tab:hover {
  border-color: var(--color-primary-300);
  color: var(--color-primary-600);
}
.sort-tab.active {
  background: var(--color-primary-500);
  border-color: var(--color-primary-500);
  color: #fff;
}
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
  gap: var(--space-2);
  margin-top: var(--space-12);
  flex-wrap: wrap;
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
.page-link.disabled {
  opacity: 0.45;
  pointer-events: none;
}
.page-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  min-height: 40px;
  padding: 6px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  text-decoration: none;
  transition: all var(--duration-fast);
}
.page-num:hover {
  border-color: var(--color-primary-300);
  color: var(--color-primary-600);
}
.page-num.active {
  background: var(--color-primary-500);
  border-color: var(--color-primary-500);
  color: #fff;
  box-shadow: var(--shadow-sm);
}
.page-ellipsis {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  color: var(--color-text-muted);
  user-select: none;
}
</style>
