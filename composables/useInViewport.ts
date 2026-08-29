import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue'

/**
 * 目标元素是否在视口内的响应式标记（IntersectionObserver 实现）。
 * 用于离屏暂停轮播自动播放、rAF 动画等运行时开销。
 *
 * 不支持 IntersectionObserver 的环境视为始终可见（兜底不暂停）。
 */
export function useInViewport(
  target: Ref<HTMLElement | null>,
  options?: IntersectionObserverInit
) {
  const isActive = ref(false)
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    if (typeof IntersectionObserver === 'undefined') {
      isActive.value = true
      return
    }
    observer = new IntersectionObserver(
      (entries) => {
        isActive.value = entries.some((e) => e.isIntersecting)
      },
      options ?? { threshold: 0 }
    )
    if (target.value) observer.observe(target.value)
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
  })

  return { isActive }
}
