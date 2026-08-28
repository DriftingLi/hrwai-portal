<template>
  <div class="content-detail-page">
    <!-- 阅读进度条 -->
    <div class="reading-progress" aria-hidden="true">
      <div class="reading-progress-bar" :style="{ transform: `scaleX(${progress})` }"></div>
    </div>
    <div class="container">
      <template v-if="detail">
        <!-- 文章头部 -->
        <header class="article-header">
          <span class="article-tag">{{ detail.category_label || categoryLabel(detail.category) }}</span>
          <h1 class="article-title">{{ detail.title }}</h1>
          <div class="article-meta">
            <span v-if="detail.source" class="meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              来源：{{ detail.source }}
            </span>
            <span v-if="detail.published_at" class="meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              {{ formatDate(detail.published_at) }}
            </span>
            <span class="meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              阅读 {{ displayedViewCount }}
            </span>
          </div>
        </header>

        <!-- 主体网格 -->
        <div class="article-layout">
          <article class="article-main">
            <!-- 移动端折叠目录（<1024px 显示） -->
            <ArticleToc :items="toc" variant="mobile" />
            <div class="markdown-body" v-html="renderedContent"></div>

            <!-- 分享 -->
            <div class="article-share">
              <button class="share-btn" :class="{ copied }" @click="copyLink">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path v-if="!copied" d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline v-if="!copied" points="16 6 12 2 8 6" />
                  <line v-if="!copied" x1="12" y1="2" x2="12" y2="15" />
                  <polyline v-else points="20 6 9 17 4 12" />
                </svg>
                {{ copied ? '已复制' : '复制链接' }}
              </button>
            </div>

            <!-- 上一篇 / 下一篇 -->
            <nav class="article-nav">
              <div class="nav-item nav-prev">
                <NuxtLink v-if="detail.prev" :to="`/content/${detail.prev.content_id}`" class="nav-link">
                  <span class="nav-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                    上一篇
                  </span>
                  <span class="nav-title">{{ detail.prev.title }}</span>
                </NuxtLink>
                <div v-else class="nav-empty">
                  <span class="nav-label">上一篇</span>
                  <span class="nav-title-empty">没有更新的文章了</span>
                </div>
              </div>
              <div class="nav-item nav-next">
                <NuxtLink v-if="detail.next" :to="`/content/${detail.next.content_id}`" class="nav-link">
                  <span class="nav-label">
                    下一篇
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </span>
                  <span class="nav-title">{{ detail.next.title }}</span>
                </NuxtLink>
                <div v-else class="nav-empty">
                  <span class="nav-label">下一篇</span>
                  <span class="nav-title-empty">没有更早的文章了</span>
                </div>
              </div>
            </nav>
          </article>

          <!-- 侧边栏：目录 + 相关资讯 -->
          <aside class="article-sidebar">
            <ArticleToc :items="toc" variant="desktop" />
            <h3 class="sidebar-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
              相关资讯
            </h3>
            <ul class="related-list" v-if="detail.related && detail.related.length">
              <li v-for="item in detail.related" :key="item.content_id">
                <NuxtLink :to="`/content/${item.content_id}`" class="related-item">
                  <div class="related-cover-wrap" v-if="item.cover_image">
                    <img :src="resolveFileUrl(item.cover_image)" :alt="item.title" class="related-cover" loading="lazy" decoding="async" />
                  </div>
                  <div class="related-cover-wrap related-cover-placeholder" v-else>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </div>
                  <div class="related-info">
                    <span class="related-title">{{ item.title }}</span>
                    <span class="related-date" v-if="item.published_at">{{ formatDate(item.published_at) }}</span>
                  </div>
                </NuxtLink>
              </li>
            </ul>
            <div v-else class="related-empty">暂无相关资讯</div>
          </aside>
        </div>
      </template>
    </div>
    <!-- 正文图片灯箱 -->
    <ClientOnly>
      <Lightbox />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { categoryLabel, type FeaturedDetail } from '~/api/featured'
import { resolveFileUrl } from '~/utils/fileUrl'
import { renderMarkdown, extractToc } from '~/utils/markdown'
import { formatDate } from '~/utils/formatDate'
import { useSiteLinks } from '~/composables/useSiteLinks'
import { useFeaturedApi } from '~/composables/useFeaturedApi'

const route = useRoute()
const { site } = useSiteLinks()
const { getPublicDetail, incrementView } = useFeaturedApi()

const id = computed(() => Number(route.params.id))

// SSR 取数：noView=true（no_view=1），爬虫/SSR 不计阅读量；失败降级为 null → 404
const { data: detail } = await useAsyncData(
  `featured-detail-${id.value}`,
  () => getPublicDetail(id.value, true).catch(() => null as unknown as FeaturedDetail),
  { default: () => null as unknown as FeaturedDetail }
)

// 不存在/未发布/非数字 ID → 真实 404（区别于旧 SPA 的 200 + 空态）
if (!detail.value || !id.value) {
  throw createError({ statusCode: 404, statusMessage: '文章不存在或已下架' })
}

// 阅读量：SSR 展示快照值；hydration 后由真实浏览器调用计数端点累加
const displayedViewCount = ref(detail.value?.view_count ?? 0)
onMounted(async () => {
  try {
    const res = await incrementView(id.value)
    displayedViewCount.value = res.view_count
  } catch {
    // 计数失败不阻断阅读
  }
})

const renderedContent = computed(() => renderMarkdown(detail.value?.content ?? ''))

// 文章目录（h2/h3 锚点，id 由 renderMarkdown 注入）
const toc = computed(() => extractToc(renderedContent.value))

// ===== 阅读进度条（scroll → 文章区域滚动比例） =====
const progress = ref(0)
let articleEl: HTMLElement | null = null
function onScroll() {
  if (!articleEl) articleEl = document.querySelector('.article-layout')
  if (!articleEl) return
  const rect = articleEl.getBoundingClientRect()
  const total = rect.height - window.innerHeight
  if (total <= 0) {
    progress.value = 1
    return
  }
  progress.value = Math.min(Math.max(-rect.top / total, 0), 1)
}

// ===== 复制链接分享 =====
const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null
async function copyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    copied.value = true
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    // 剪贴板不可用（如非安全上下文）时回退选中提示
    copied.value = false
  }
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  if (copiedTimer) clearTimeout(copiedTimer)
})

// ===== 文章级 SEO（标题/描述/OG/Article 结构化数据/canonical）=====
const articleTitle = computed(() => detail.value?.title ?? '')
const articleSummary = computed(() => detail.value?.summary || '')
const articleImage = computed(() =>
  detail.value?.cover_image ? resolveFileUrl(detail.value.cover_image) : site('/images/hero-bg.webp')
)
const articlePublished = computed(() => detail.value?.published_at || detail.value?.created_at || '')

useSeoMeta({
  title: articleTitle,
  description: articleSummary,
  ogTitle: articleTitle,
  ogDescription: articleSummary,
  ogType: 'article',
  ogImage: articleImage,
  ogUrl: computed(() => site(`/content/${id.value}`)),
  twitterCard: 'summary_large_image',
  twitterTitle: articleTitle
})

useHead({
  link: [
    { rel: 'canonical', href: site(`/content/${id.value}`) }
  ],
  script: computed(() =>
    detail.value
      ? [
          {
            children: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: detail.value.title,
              description: detail.value.summary,
              image: articleImage.value,
              datePublished: articlePublished.value,
              author: { '@type': 'Organization', name: '和润天下人工智能科技有限公司' },
              publisher: {
                '@type': 'Organization',
                name: '和润天下人工智能科技有限公司',
                logo: site('/images/HRWAIlogo.jpg')
              }
            }),
            type: 'application/ld+json'
          } as any
        ]
      : []
  )
})
</script>

<style scoped>
.content-detail-page {
  padding: 120px 0 80px;
  background: var(--color-bg-page, #f8fafc);
  min-height: 100vh;
  min-height: 100dvh;
}

.content-detail-page .container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-6, 24px);
}

/* 文章头部 */
.article-header {
  background: #fff;
  border-radius: var(--radius-lg, 12px);
  padding: 40px 48px;
  margin-bottom: 32px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.article-tag {
  display: inline-block;
  background: var(--gradient-brand, linear-gradient(135deg, #2563eb, #7c3aed));
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: var(--radius-full, 999px);
  margin-bottom: 16px;
  letter-spacing: 0.5px;
}

.article-title {
  font-family: var(--font-display, 'PingFang SC', sans-serif);
  font-size: 32px;
  font-weight: var(--font-bold, 700);
  color: var(--color-text-primary, #0f172a);
  line-height: 1.3;
  margin: 0 0 20px;
}

.article-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  font-size: 14px;
  color: var(--color-text-tertiary, #64748b);
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* 主体网格 */
.article-layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 32px;
  align-items: start;
}

.article-main {
  background: #fff;
  border-radius: var(--radius-lg, 12px);
  padding: 40px 48px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  min-width: 0;
}

/* ===== 升级：阅读进度条 ===== */
.reading-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: var(--z-fixed, 1030);
  background: transparent;
  pointer-events: none;
}
.reading-progress-bar {
  height: 100%;
  background: linear-gradient(to right, #0EA5E9, #14B8A6);
  transform-origin: left center;
  transform: scaleX(0);
}

/* ===== 升级：复制链接分享 ===== */
.article-share {
  margin-top: var(--space-8, 32px);
  display: flex;
  justify-content: flex-end;
}
.share-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2, 8px);
  min-height: 38px;
  padding: 8px 18px;
  border-radius: var(--radius-full, 9999px);
  border: 1px solid var(--color-border, #e2e8f0);
  background: #fff;
  color: var(--color-text-secondary, #475569);
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: border-color var(--duration-fast, 150ms), color var(--duration-fast, 150ms);
}
.share-btn:hover {
  border-color: var(--color-primary-400, #38bdf8);
  color: var(--color-primary-600, #0284c7);
}
.share-btn.copied {
  border-color: var(--color-success, #10b981);
  color: var(--color-success, #10b981);
}

/* 上一篇/下一篇 */
.article-nav {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  margin-top: 48px;
  padding-top: 32px;
  border-top: 1px solid var(--color-border-light, #e2e8f0);
}

.nav-item {
  flex: 1;
  min-width: 0;
}

.nav-next {
  text-align: right;
}

.nav-link {
  display: inline-block;
  text-decoration: none;
  color: var(--color-text-primary, #0f172a);
  max-width: 100%;
  transition: color 0.2s;
}

.nav-link:hover {
  color: var(--color-primary-500, #2563eb);
}

.nav-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--color-text-tertiary, #64748b);
  margin-bottom: 8px;
}

.nav-title {
  display: block;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.nav-empty {
  color: var(--color-text-tertiary, #94a3b8);
}

.nav-title-empty {
  display: block;
  font-size: 14px;
  margin-top: 4px;
}

/* 侧边栏 */
.article-sidebar {
  background: #fff;
  border-radius: var(--radius-lg, 12px);
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  position: sticky;
  top: 100px;
}

/* ===== 升级：TOC 槽位显隐（移动折叠目录 / 桌面侧栏目录互斥） ===== */
@media (min-width: 1024px) {
  .article-main > details.toc-details {
    display: none;
  }
}
@media (max-width: 1023px) {
  .article-sidebar > nav.toc-desktop {
    display: none;
  }
}

.sidebar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-display, 'PingFang SC', sans-serif);
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary, #0f172a);
  margin: 0 0 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--color-primary-500, #2563eb);
}

.related-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.related-list li {
  margin-bottom: 16px;
}

.related-list li:last-child {
  margin-bottom: 0;
}

.related-item {
  display: flex;
  gap: 12px;
  text-decoration: none;
  color: inherit;
  padding: 8px;
  margin: -8px;
  border-radius: var(--radius-md, 8px);
  transition: background 0.2s;
}

.related-item:hover {
  background: var(--color-bg-page, #f8fafc);
}

.related-cover-wrap {
  width: 80px;
  height: 60px;
  border-radius: var(--radius-md, 8px);
  overflow: hidden;
  flex-shrink: 0;
  background: var(--color-bg-page, #f1f5f9);
}

.related-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.related-cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary, #94a3b8);
}

.related-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}

.related-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary, #0f172a);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.2s;
}

.related-item:hover .related-title {
  color: var(--color-primary-500, #2563eb);
}

.related-date {
  font-size: 12px;
  color: var(--color-text-tertiary, #94a3b8);
}

.related-empty {
  font-size: 14px;
  color: var(--color-text-tertiary, #94a3b8);
  text-align: center;
  padding: 32px 0;
}

/* 响应式 */
@media (max-width: 1024px) {
  .article-header,
  .article-main {
    padding: 32px 28px;
  }
  .article-title {
    font-size: 26px;
  }
}

@media (max-width: 768px) {
  .content-detail-page {
    padding: 90px 0 60px;
  }

  .article-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .article-sidebar {
    position: static;
    order: 2;
  }

  .article-main {
    order: 1;
    padding: 24px 20px;
  }

  .article-header {
    padding: 24px 20px;
    margin-bottom: 20px;
  }

  .article-title {
    font-size: 22px;
  }

  .article-meta {
    gap: 16px;
    font-size: 13px;
  }

  .article-nav {
    flex-direction: column;
    gap: 16px;
  }

  .nav-next {
    text-align: left;
  }
}
</style>
