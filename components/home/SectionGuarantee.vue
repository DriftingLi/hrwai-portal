<template>
  <section id="service" ref="guaranteeSectionRef" class="section service-guarantee has-texture has-texture-dark has-fade" style="--next-bg: var(--color-bg-page)" v-reveal>
    <div class="dark-aurora" aria-hidden="true"><div class="dark-aurora__blob"></div></div>
    <div class="section-fade" aria-hidden="true"></div>
    <div class="container guarantee-carousel">
      <!-- 左侧面板 -->
      <div class="gc-left">
        <div class="gc-badge">服务保障</div>
        <h2 class="gc-heading">八大核心保障</h2>
        <p class="gc-sub">全方位护航，让合作无忧</p>
        <div class="gc-controls">
          <button class="gc-arrow" @click="manualPrev" aria-label="上一项">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button class="gc-arrow" @click="manualNext" aria-label="下一项">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        <div class="gc-pagination">{{ String(carouselIndex + 1).padStart(2, '0') }} / {{ String(guarantees.length).padStart(2, '0') }}</div>
        <!-- 自动播放进度条（手动切换重置、悬停暂停） -->
        <div class="gc-progress" :class="{ 'is-paused': autoplayPaused }" aria-hidden="true">
          <div :key="carouselIndex" class="gc-progress-bar"></div>
        </div>
      </div>
      <!-- 右侧卡片 -->
      <div
        class="gc-right"
        @mouseenter="pauseAutoplay"
        @mouseleave="resumeAutoplay"
      >
        <Transition name="gc-card" mode="out-in">
          <div :key="carouselIndex" class="gc-card">
            <div class="gc-card-step">
              <span class="gc-card-step-num">{{ currentGuarantee.no }}</span>
              <span class="gc-card-step-label">保障项</span>
            </div>
            <h3 class="gc-card-title">{{ currentGuarantee.title }}</h3>
            <p class="gc-card-desc">{{ currentGuarantee.desc }}</p>
          </div>
        </Transition>
        <!-- 装饰叠层卡片 -->
        <div class="gc-card-deco gc-card-deco--1"></div>
        <div class="gc-card-deco gc-card-deco--2"></div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, watch } from 'vue'
import { guarantees } from '~/config/homeContent'
import { prefersReducedMotion } from '~/utils/motion'
import { useInViewport } from '~/composables/useInViewport'

/* ---------- 服务保障轮播 ---------- */
const guaranteeSectionRef = ref<HTMLElement | null>(null)
const { isActive: guaranteeVisible } = useInViewport(guaranteeSectionRef)

const carouselIndex = ref(0)
const currentGuarantee = computed(() => guarantees[carouselIndex.value]!)
let autoplayTimer: ReturnType<typeof setInterval> | null = null
const AUTOPLAY_INTERVAL = 2500
// ref 化供进度条暂停态绑定
const autoplayPaused = ref(false)

function carouselNext() {
  carouselIndex.value = (carouselIndex.value + 1) % guarantees.length
}
function carouselPrev() {
  carouselIndex.value = (carouselIndex.value - 1 + guarantees.length) % guarantees.length
}

function startAutoplay() {
  stopAutoplay()
  // 无障碍：用户请求减少动画时不自动轮播（手动箭头仍可用）
  if (prefersReducedMotion()) return
  if (autoplayPaused.value) return
  autoplayTimer = setInterval(carouselNext, AUTOPLAY_INTERVAL)
}
function stopAutoplay() {
  if (autoplayTimer) {
    clearInterval(autoplayTimer)
    autoplayTimer = null
  }
}
/* 手动切换：重置计时，避免刚手动切完又立刻自动切 */
function manualNext() {
  carouselNext()
  startAutoplay()
}
function manualPrev() {
  carouselPrev()
  startAutoplay()
}
/* 悬停暂停 / 离开恢复 */
function pauseAutoplay() {
  autoplayPaused.value = true
  stopAutoplay()
}
function resumeAutoplay() {
  autoplayPaused.value = false
  startAutoplay()
}

// 离屏停止、回屏恢复
watch(guaranteeVisible, (visible) => {
  if (visible) startAutoplay()
  else stopAutoplay()
})

onBeforeUnmount(() => {
  stopAutoplay()
})
</script>

<style scoped>
.service-guarantee {
  background: var(--surface-dark);
  overflow: hidden;
}
.guarantee-carousel {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-10);
  align-items: center;
}
.gc-left {
  color: var(--color-text-on-dark);
}
.gc-badge {
  display: inline-block;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-full);
  background: rgba(14, 165, 233, 0.15);
  border: 1px solid rgba(14, 165, 233, 0.3);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-primary-300);
  margin-bottom: var(--space-6);
}
.gc-heading {
  font-family: var(--font-display);
  font-size: clamp(1.75rem, 3.5vw, var(--text-3xl));
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
  color: #fff;
  margin: 0 0 var(--space-3);
}
.gc-sub {
  font-size: var(--text-base);
  color: var(--color-text-muted);
  margin: 0 0 var(--space-8);
  line-height: var(--leading-relaxed);
}
.gc-controls {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.gc-arrow {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border-darker);
  background: transparent;
  color: var(--color-text-on-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background var(--duration-fast), border-color var(--duration-fast);
}
.gc-arrow:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--color-primary-400);
}
.gc-pagination {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  letter-spacing: 0.1em;
}
/* 自动播放进度条 */
.gc-progress {
  width: 140px;
  height: 3px;
  margin-top: var(--space-4);
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.12);
  overflow: hidden;
}
.gc-progress-bar {
  height: 100%;
  border-radius: inherit;
  background: var(--gradient-brand);
  transform-origin: left center;
  animation: gcProgress 2.5s linear both;
}
@keyframes gcProgress {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
.gc-progress.is-paused .gc-progress-bar {
  animation-play-state: paused;
}
.gc-right {
  position: relative;
  min-height: 320px;
}
.gc-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  padding: var(--space-10);
  position: relative;
  z-index: 2;
  width: 100%;
  box-sizing: border-box;
  min-height: 320px;
  display: flex;
  flex-direction: column;
}
.gc-card-step {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}
.gc-card-step-num {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-primary-500);
}
.gc-card-step-label {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.gc-card-title {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-snug);
  color: var(--color-text-primary);
  margin: 0 0 var(--space-4);
}
.gc-card-desc {
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--color-text-secondary);
  margin: 0;
  flex: 1;
}
/* 装饰叠层卡片 */
.gc-card-deco {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
}
.gc-card-deco--1 {
  z-index: 1;
  transform: translate(8px, 8px);
  opacity: 0.5;
}
.gc-card-deco--2 {
  z-index: 0;
  transform: translate(16px, 16px);
  opacity: 0.25;
}
/* 卡片切换过渡（单卡片 out-in 模式，避免叠加闪烁） */
.gc-card-enter-active,
.gc-card-leave-active {
  transition: opacity 0.3s var(--ease-default), transform 0.3s var(--ease-default);
}
.gc-card-enter-from {
  opacity: 0;
  transform: translateX(24px);
}
.gc-card-leave-to {
  opacity: 0;
  transform: translateX(-24px);
}

@media (min-width: 768px) {
  .guarantee-carousel {
    grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
    gap: var(--space-12);
  }
}

@media (max-width: 639px) {
  .gc-right {
    min-height: 280px;
  }
  .gc-card {
    padding: var(--space-6);
    min-height: 280px;
  }
  .gc-card-title {
    font-size: var(--text-xl);
  }
  .gc-card-deco--1 {
    transform: translate(4px, 4px);
  }
  .gc-card-deco--2 {
    transform: translate(8px, 8px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .gc-progress-bar {
    animation: none !important;
    transform: none;
  }
  /* 卡片切换过渡降级为直接切换 */
  .gc-card-enter-active,
  .gc-card-leave-active {
    transition: none !important;
  }
}
</style>
