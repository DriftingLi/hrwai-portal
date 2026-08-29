/**
 * 用户是否请求减少动画（prefers-reduced-motion）。
 * 所有自动播放/入场动画/视差效果统一以此为开关。
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
