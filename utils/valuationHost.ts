// 残值子域的入口归位（门户票 #32 后续）：valuation.hrwai.cn 绑定的是整个 Nuxt 应用，
// 根路径 / 会落到官网首页，而用户来这里是要用工具。
// 纯函数便于单测：返回要 302 到的路径，不需要重定向时返回 null。
//
// 2026-10-22 线上复核：站点在 EdgeOne 边缘函数后面，Host 头不一定是用户看到的那一个
// （边缘可能改写 Host 而把真实域名放进 x-forwarded-host，也可能反过来）。因此归一化时
// 同时接受「端口」「逗号分隔的代理链」两种形态，中间件把两个来源都交给这里判定。
export const VALUATION_HOST_PREFIX = 'valuation.'
export const VALUATION_TOOL_PATH = '/valuation'

/** 取代理链里的第一个主机名，去掉端口，转小写 */
export function normalizeHost(host: string | null | undefined): string {
  const first = String(host ?? '').split(',')[0] ?? ''
  return first.trim().toLowerCase().replace(/:\d+$/, '')
}

export function valuationHostRedirect(
  host: string | null | undefined,
  pathname: string
): string | null {
  if (!normalizeHost(host).startsWith(VALUATION_HOST_PREFIX)) return null
  // 只收根路径：工具页内部的深链（/valuation/history 等）必须原样通过。
  if (pathname !== '/') return null
  return VALUATION_TOOL_PATH
}
