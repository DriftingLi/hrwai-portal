<template>
  <span ref="rootRef" class="count-up">{{ display }}</span>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

/**
 * 数字滚动递增（进入视口触发一次，rAF ease-out 缓动）
 * - suffix：数字后缀（如 "+"、"项"）
 * - duration：动画时长 ms
 * - SSR 渲染最终值（SEO 可见），客户端从 0 播放增强观感
 * - prefers-reduced-motion：直接显示最终值，不播放动画
 */

const props = withDefaults(
  defineProps<{
    value: number
    suffix?: string
    duration?: number
  }>(),
  { suffix: '', duration: 800 }
)

const rootRef = ref<HTMLElement | null>(null)
const current = ref(props.value) // SSR 直接输出最终值
let observer: IntersectionObserver | null = null
let rafId = 0

const display = computed(() => `${Math.round(current.value)}${props.suffix}`)

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function play() {
  if (prefersReducedMotion()) {
    current.value = props.value
    return
  }
  const start = performance.now()
  const from = 0
  const to = props.value
  const tick = (now: number) => {
    const t = Math.min((now - start) / props.duration, 1)
    current.value = from + (to - from) * easeOutCubic(t)
    if (t < 1) {
      rafId = requestAnimationFrame(tick)
    }
  }
  current.value = 0
  rafId = requestAnimationFrame(tick)
}

onMounted(() => {
  if (typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        play()
        observer?.disconnect()
        observer = null
      }
    },
    { threshold: 0.4 }
  )
  if (rootRef.value) observer.observe(rootRef.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  cancelAnimationFrame(rafId)
})
</script>

<style scoped>
.count-up {
  font-variant-numeric: tabular-nums;
}
</style>
