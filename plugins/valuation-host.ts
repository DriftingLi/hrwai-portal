// 残值子域的根路径兜底（浏览器侧）：SSR 那层看不到真实主机名时（边缘改写 Host），
// 由浏览器用 location.hostname 自己归位。两层的判据一致：valuation. 前缀 + 只收根路径。
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return
  if (window.location.pathname !== '/') return
  if (!window.location.hostname.toLowerCase().startsWith('valuation.')) return
  // replace：不要在历史里留下官网首页那一格
  return navigateTo('/valuation', { replace: true })
})
