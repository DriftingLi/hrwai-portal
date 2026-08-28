<template>
  <!-- 移动端：折叠目录 -->
  <details v-if="variant === 'mobile' && items.length" class="toc-details">
    <summary class="toc-summary">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
      目录
    </summary>
    <ul class="toc-list toc-list--mobile">
      <li v-for="item in items" :key="item.id" :class="`depth-${item.depth}`">
        <a :href="`#${item.id}`" class="toc-link" @click.prevent="jump(item.id)">{{ item.text }}</a>
      </li>
    </ul>
  </details>

  <!-- 桌面端：目录列表（sticky 由父级布局控制），当前小节高亮 -->
  <nav v-if="variant === 'desktop' && items.length" class="toc-desktop" aria-label="文章目录">
    <p class="toc-heading">目录</p>
    <ul class="toc-list">
      <li v-for="item in items" :key="item.id" :class="`depth-${item.depth}`">
        <a
          :href="`#${item.id}`"
          class="toc-link"
          :class="{ active: activeId === item.id }"
          @click.prevent="jump(item.id)"
        >{{ item.text }}</a>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import type { TocItem } from '~/utils/markdown'

/**
 * 文章目录：variant="mobile" 折叠面板 / variant="desktop" 列表（当前小节高亮）。
 * 桌面实例监听 IntersectionObserver 高亮；移动实例无监听开销。
 */

const props = withDefaults(
  defineProps<{
    items: TocItem[]
    variant?: 'mobile' | 'desktop'
  }>(),
  { variant: 'desktop' }
)

const activeId = ref('')
let observer: IntersectionObserver | null = null

function jump(id: string) {
  const reduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })
  // 关闭移动端折叠面板（details 无 open 引用，从事件源向上找）
  document.querySelector<HTMLDetailsElement>('details.toc-details[open]')?.removeAttribute('open')
}

onMounted(() => {
  if (props.variant !== 'desktop') return
  const headings = Array.from(document.querySelectorAll<HTMLHeadingElement>('.markdown-body h2[id], .markdown-body h3[id]'))
  if (headings.length === 0 || typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(
    (entries) => {
      // 取视口最上方的可见标题为当前小节
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (visible?.target.id) activeId.value = visible.target.id
    },
    { rootMargin: '-80px 0px -65% 0px', threshold: 0 }
  )
  headings.forEach((h) => observer!.observe(h))
})

onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>

<style scoped>
/* 桌面目录 */
.toc-heading {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-tertiary);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin: 0 0 var(--space-3);
}
.toc-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  border-left: 2px solid var(--color-border);
}
.toc-list li.depth-3 .toc-link {
  padding-left: var(--space-6);
  font-size: var(--text-sm);
}
.toc-link {
  display: block;
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-base);
  line-height: var(--leading-snug);
  color: var(--color-text-secondary);
  text-decoration: none;
  border-left: 2px solid transparent;
  margin-left: -2px;
  transition: color var(--duration-fast), border-color var(--duration-fast);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.toc-link:hover {
  color: var(--color-primary-600);
}
.toc-link.active {
  color: var(--color-primary-600);
  font-weight: var(--font-semibold);
  border-left-color: var(--color-primary-500);
}

/* 移动端折叠目录 */
.toc-details {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--surface-card-alt);
  margin-bottom: var(--space-8);
}
.toc-summary {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-5);
  cursor: pointer;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  list-style: none;
}
.toc-summary::-webkit-details-marker {
  display: none;
}
.toc-list--mobile {
  padding: 0 var(--space-5) var(--space-4);
  border-left: none;
}
.toc-list--mobile .toc-link {
  padding: var(--space-2) 0;
  white-space: normal;
}
</style>
