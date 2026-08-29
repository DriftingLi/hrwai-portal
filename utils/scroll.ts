/**
 * 平滑滚动到页内锚点元素（首页各板块「进入板块/联系我们」等按钮共用）。
 */
export function scrollToId(id: string) {
  if (typeof document === 'undefined') return
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}
