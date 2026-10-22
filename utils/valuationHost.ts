// 残值子域的入口归位（门户票 #32 后续）：valuation.hrwai.cn 绑定的是整个 Nuxt 应用，
// 根路径 / 会落到官网首页，而用户来这里是要用工具。
// 纯函数便于单测：返回要 302 到的路径，不需要重定向时返回 null。
export const VALUATION_HOST_PREFIX = 'valuation.'
export const VALUATION_TOOL_PATH = '/valuation'

export function valuationHostRedirect(host: string, pathname: string): string | null {
  const h = (host || '').toLowerCase()
  if (!h.startsWith(VALUATION_HOST_PREFIX)) return null
  // 只收根路径：工具页内部的深链（/valuation/history 等）必须原样通过。
  if (pathname !== '/') return null
  return VALUATION_TOOL_PATH
}