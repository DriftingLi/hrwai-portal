<template>
  <section id="featured" ref="featuredSectionRef" class="section featured-section has-texture has-texture-light has-fade" style="--next-bg: #0EA5E9" v-if="items.length">
    <div class="light-aurora" aria-hidden="true"><div class="light-aurora__blob"></div></div>
    <div class="section-fade" aria-hidden="true"></div>
    <div class="container">
      <div class="section-title-wrap" v-reveal>
        <h2 class="section-title">内容精选<span class="title-underline"></span></h2>
        <p class="section-subtitle">最新公司动态与行业资讯</p>
      </div>
    </div>

    <div
      class="featured-carousel"
      v-reveal
      @mouseenter="pauseFeaturedAutoplay"
      @mouseleave="resumeFeaturedAutoplay"
    >
      <button class="featured-arrow featured-arrow--prev" @click="manualScrollFeatured(-1)" aria-label="上一篇">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div ref="featuredTrackRef" class="featured-track" @scroll.passive="onFeaturedScroll">
        <article
          v-for="(item, idx) in displayList"
          :key="`${idx === items.length ? 'clone' : 'real'}-${item.content_id}`"
          class="featured-card"
          :aria-hidden="idx === items.length ? 'true' : undefined"
        >
          <div class="featured-card__media">
            <img
              v-if="item.cover_image"
              :src="resolveFileUrl(item.cover_image)"
              :alt="item.title"
            />
            <div v-else class="featured-card__placeholder">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
            <span class="featured-card__tag">{{ categoryLabel(item.category) }}</span>
          </div>
          <div class="featured-card__body">
            <h3 class="featured-card__title">{{ item.title }}</h3>
            <p class="featured-card__summary">{{ item.summary || '暂无摘要' }}</p>
            <div class="featured-card__meta">
              <span v-if="item.published_at">{{ formatDate(item.published_at) }}</span>
            </div>
            <NuxtLink :to="`/content/${item.content_id}`" class="featured-card__link">
              查看详情
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </NuxtLink>
          </div>
        </article>
      </div>
      <button class="featured-arrow featured-arrow--next" @click="manualScrollFeatured(1)" aria-label="下一篇">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <!-- 分页指示器 -->
      <div class="featured-dots" v-if="items.length > 1">
        <button
          v-for="(item, idx) in items"
          :key="item.content_id"
          class="featured-dot"
          :class="{ active: idx === activeFeaturedIndex }"
          @click="goToFeaturedIndex(idx)"
          :aria-label="`第 ${idx + 1} 篇`"
        ></button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { categoryLabel, type FeaturedContent } from '~/api/featured'
import { resolveFileUrl } from '~/utils/fileUrl'
import { formatDate } from '~/utils/formatDate'
import { prefersReducedMotion } from '~/utils/motion'
import { useInViewport } from '~/composables/useInViewport'

/* ---------- 内容精选轮播（数据由首页传入，SSR 预渲染含标题/摘要） ---------- */
const props = defineProps<{ items: FeaturedContent[] }>()

const featuredSectionRef = ref<HTMLElement | null>(null)
const { isActive: featuredVisible } = useInViewport(featuredSectionRef)

const featuredTrackRef = ref<HTMLElement | null>(null)
const activeFeaturedIndex = ref(0)
let featuredAutoplayTimer: ReturnType<typeof setInterval> | null = null
const FEATURED_AUTOPLAY_INTERVAL = 2500
// smooth 滚动动画最长等待时长（ms），用于降级触发跳回
const FEATURED_SCROLL_TIMEOUT = 800
// 跳回标志：瞬间跳转期间屏蔽 scroll 事件，避免索引闪烁与动画被打断
let isJumping = false
// 自动播放暂停标志（鼠标悬停时暂停）
let featuredAutoplayPaused = false

// 渲染列表：末尾追加首项克隆，用于无缝循环滚动
const displayList = computed<FeaturedContent[]>(() => {
  const list = props.items
  if (list.length <= 1) return list
  return [...list, list[0]!]
})

// 加载完成后复位滚动位置（hydration 后执行一次即可）
onMounted(() => {
  const track = featuredTrackRef.value
  if (track) {
    track.style.scrollBehavior = 'auto'
    track.scrollTo({ left: 0 })
    track.style.scrollBehavior = 'smooth'
  }
  isJumping = false
  startFeaturedAutoplay()
})

// 平滑滚动到指定索引（可以是克隆项位置 totalCount）
function smoothScrollToIndex(idx: number) {
  const track = featuredTrackRef.value
  if (!track) return
  const cardWidth = track.clientWidth
  track.scrollTo({ left: idx * cardWidth, behavior: 'smooth' })
}

// 瞬间无动画跳转到指定索引（用于无缝循环收尾）
function jumpToIndex(idx: number) {
  const track = featuredTrackRef.value
  if (!track) return
  track.style.scrollBehavior = 'auto'
  track.scrollTo({ left: idx * track.clientWidth })
  // 双 RAF 确保浏览器完成布局后再恢复 smooth
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      track.style.scrollBehavior = 'smooth'
    })
  })
}

// 等待 smooth 滚动完全结束（优先 scrollend 事件，降级 setTimeout）
function waitForScrollEnd(callback: () => void) {
  const track = featuredTrackRef.value
  if (!track) {
    setTimeout(callback, FEATURED_SCROLL_TIMEOUT)
    return
  }
  let executed = false
  const execute = () => {
    if (executed) return
    executed = true
    track.removeEventListener('scrollend', onScrollEnd as EventListener)
    callback()
  }
  const onScrollEnd = () => execute()
  // 优先用 scrollend 事件（现代浏览器）
  track.addEventListener('scrollend', onScrollEnd as EventListener, { once: true })
  // 降级：超时后强制执行（防止 scrollend 不触发）
  setTimeout(execute, FEATURED_SCROLL_TIMEOUT)
}

// 向右循环：最后一张 → 平滑滚到克隆项 → 动画结束 → 瞬间跳回第一张
function scrollRightWithLoop() {
  const totalCount = props.items.length
  if (totalCount <= 1) return
  const currentIdx = activeFeaturedIndex.value
  if (currentIdx >= totalCount - 1) {
    // 最后一张：平滑滚到克隆项（视觉上像滚到第一张）
    isJumping = true
    smoothScrollToIndex(totalCount)
    waitForScrollEnd(() => {
      jumpToIndex(0)  // 瞬间跳回真正的第一张
      activeFeaturedIndex.value = 0
      // 双 RAF 后释放标志
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          isJumping = false
        })
      })
    })
  } else {
    smoothScrollToIndex(currentIdx + 1)
  }
}

// 向左循环：第一张 → 瞬间跳到克隆项 → 平滑滚到最后一项
function scrollLeftWithLoop() {
  const totalCount = props.items.length
  if (totalCount <= 1) return
  const currentIdx = activeFeaturedIndex.value
  if (currentIdx <= 0) {
    // 第一张：先瞬间跳到克隆项（视觉无变化，因为克隆项与第一张相同）
    isJumping = true
    jumpToIndex(totalCount)
    // 等双 RAF 确保瞬间跳转完成后再平滑滚动
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        smoothScrollToIndex(totalCount - 1)  // 平滑滚到真正的最后一项
        activeFeaturedIndex.value = totalCount - 1
        waitForScrollEnd(() => {
          // 动画结束后释放标志
          requestAnimationFrame(() => {
            isJumping = false
          })
        })
      })
    })
  } else {
    smoothScrollToIndex(currentIdx - 1)
  }
}

function scrollFeatured(direction: number) {
  const totalCount = props.items.length
  if (totalCount === 0) return
  if (direction > 0) {
    scrollRightWithLoop()
  } else {
    scrollLeftWithLoop()
  }
}

function manualScrollFeatured(direction: number) {
  scrollFeatured(direction)
  // 手动切换后重启自动播放计时（避免刚切完立刻自动切）
  restartFeaturedAutoplay()
}

function goToFeaturedIndex(idx: number) {
  const track = featuredTrackRef.value
  if (!track) return
  const cardWidth = track.clientWidth
  track.scrollTo({ left: idx * cardWidth, behavior: 'smooth' })
  restartFeaturedAutoplay()
}

// 监听原生滚动事件，仅更新活动索引（永不执行跳回，避免打断 smooth 动画）
function onFeaturedScroll() {
  if (isJumping) return  // 跳回期间不更新索引
  const track = featuredTrackRef.value
  if (!track) return
  const cardWidth = track.clientWidth || 1
  const totalCount = props.items.length
  if (totalCount === 0) return
  const idx = Math.round(track.scrollLeft / cardWidth)
  // 只在真实索引范围内更新（克隆项位置 idx === totalCount 不更新，等跳回逻辑处理）
  if (idx >= 0 && idx < totalCount) {
    activeFeaturedIndex.value = idx
  }
}

// 自动播放：向右滚一张，最后一张无缝循环回第一张
function featuredAutoplayNext() {
  if (featuredAutoplayPaused) return
  const track = featuredTrackRef.value
  if (!track || props.items.length === 0) return
  scrollRightWithLoop()
}

function startFeaturedAutoplay() {
  stopFeaturedAutoplay()
  // 无障碍：用户请求减少动画时不自动轮播（手动箭头仍可用）
  if (prefersReducedMotion()) return
  if (featuredAutoplayPaused || props.items.length <= 1) return
  featuredAutoplayTimer = setInterval(featuredAutoplayNext, FEATURED_AUTOPLAY_INTERVAL)
}

function stopFeaturedAutoplay() {
  if (featuredAutoplayTimer) {
    clearInterval(featuredAutoplayTimer)
    featuredAutoplayTimer = null
  }
}

function restartFeaturedAutoplay() {
  stopFeaturedAutoplay()
  startFeaturedAutoplay()
}

function pauseFeaturedAutoplay() {
  featuredAutoplayPaused = true
  stopFeaturedAutoplay()
}

function resumeFeaturedAutoplay() {
  featuredAutoplayPaused = false
  startFeaturedAutoplay()
}

// 离屏停止、回屏恢复
watch(featuredVisible, (visible) => {
  if (visible) startFeaturedAutoplay()
  else stopFeaturedAutoplay()
})

onBeforeUnmount(() => {
  stopFeaturedAutoplay()
})
</script>

<style scoped>
.featured-section {
  background: var(--color-bg-card);
  overflow: hidden;
}
.featured-carousel {
  position: relative;
  max-width: var(--container-page);
  margin: 0 auto;
  padding: 0 var(--space-6);
}
.featured-track {
  display: flex;
  gap: var(--space-6);
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 0 var(--space-12);
  scroll-padding-left: var(--space-12);
}
.featured-track::-webkit-scrollbar {
  display: none;
}
.featured-card {
  flex: 0 0 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  scroll-snap-align: center;
  border: 1px solid var(--color-border);
  transition: box-shadow var(--duration-normal);
}
.featured-card:hover {
  box-shadow: var(--shadow-lg);
}
.featured-card__media {
  position: relative;
  min-height: 320px;
  background: var(--surface-card-alt);
  overflow: hidden;
}
.featured-card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform var(--duration-slow);
}
.featured-card:hover .featured-card__media img {
  transform: scale(1.03);
}
/* 封面底部渐变遮罩，提升标签可读性 */
.featured-card__media::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(15, 23, 42, 0.35) 0%, transparent 45%);
  pointer-events: none;
}
.featured-card__placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
}
.featured-card__tag {
  position: absolute;
  top: var(--space-4);
  left: var(--space-4);
  background: var(--glass-bg-dark);
  -webkit-backdrop-filter: blur(var(--blur-glass));
  backdrop-filter: blur(var(--blur-glass));
  border: 1px solid var(--glass-border-dark);
  color: #fff;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  letter-spacing: 0.02em;
  box-shadow: var(--shadow-sm);
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .featured-card__tag {
    background: rgba(15, 23, 42, 0.9);
  }
}
.featured-card__body {
  padding: var(--space-10);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.featured-card__title {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-snug);
  color: var(--color-text-primary);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.featured-card__summary {
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--color-text-secondary);
  margin: 0;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.featured-card__meta {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  display: flex;
  gap: var(--space-3);
  align-items: center;
}
.featured-card__link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-primary-600);
  text-decoration: none;
  transition: gap var(--duration-fast), color var(--duration-fast);
  margin-top: var(--space-2);
}
.featured-card__link:hover {
  gap: var(--space-3);
  color: var(--color-primary-700);
}
.featured-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 5;
  box-shadow: var(--shadow-sm);
  transition: background var(--duration-fast), color var(--duration-fast), border-color var(--duration-fast);
}
.featured-arrow:hover {
  background: var(--color-primary-500);
  color: #fff;
  border-color: var(--color-primary-500);
}
.featured-arrow--prev {
  left: var(--space-2);
}
.featured-arrow--next {
  right: var(--space-2);
}
/* 分页指示器 */
.featured-dots {
  display: flex;
  justify-content: center;
  gap: var(--space-2);
  margin-top: var(--space-6);
}
.featured-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-border-dark, #cbd5e1);
  border: none;
  padding: 0;
  cursor: pointer;
  transition: width var(--duration-normal), background var(--duration-fast);
}
.featured-dot:hover {
  background: var(--color-primary-400, #60a5fa);
}
.featured-dot.active {
  width: 28px;
  background: var(--gradient-brand);
}

@media (max-width: 767px) {
  .featured-card {
    grid-template-columns: minmax(0, 1fr);
  }
  .featured-card__media {
    min-height: 220px;
  }
  .featured-card__body {
    padding: var(--space-6);
  }
  .featured-card__title {
    font-size: var(--text-xl);
  }
}

@media (prefers-reduced-motion: reduce) {
  .featured-track {
    scroll-behavior: auto !important;
  }
}
</style>
