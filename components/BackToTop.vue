<template>
  <Transition name="btt">
    <button
      v-if="visible"
      class="back-to-top glass"
      aria-label="返回顶部"
      @click="scrollToTop"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * 返回顶部悬浮按钮：滚动超一屏渐显，玻璃拟态圆形。
 * 全局挂载（app.vue）；reduced-motion 下直接跳顶。
 */

const visible = ref(false)
let ticking = false

function onScroll() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    visible.value = window.scrollY > window.innerHeight
    ticking = false
  })
}

function scrollToTop() {
  const reduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<style scoped>
.back-to-top {
  position: fixed;
  right: var(--space-6);
  bottom: var(--space-8);
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  border: 1px solid var(--glass-border);
  color: var(--color-primary-600);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: var(--z-fixed);
  box-shadow: var(--shadow-lg);
  transition: transform var(--duration-fast), box-shadow var(--duration-fast), color var(--duration-fast);
}
.back-to-top:hover {
  transform: translateY(-3px);
  color: var(--color-primary-700);
  box-shadow: var(--shadow-glow-primary), var(--shadow-lg);
}
/* 悬浮在深色区块上时按钮底为白色玻璃，图标仍为品牌色，无需变色处理 */

.btt-enter-active,
.btt-leave-active {
  transition: opacity var(--duration-normal), transform var(--duration-normal);
}
.btt-enter-from,
.btt-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.9);
}

@media (max-width: 639px) {
  .back-to-top {
    right: var(--space-4);
    bottom: var(--space-6);
    width: 42px;
    height: 42px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .back-to-top,
  .btt-enter-active,
  .btt-leave-active {
    transition: none !important;
  }
}
</style>
