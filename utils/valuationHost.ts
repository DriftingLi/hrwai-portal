// 残值子域的入口归位（门户票 #32 后续）：valuation.hrwai.cn 绑定的是整个 Nuxt 应用，
// 根路径 / 会落到官网首页，而用户来这里是要用工具。
// 纯函数便于单测：返回要 302 到的路径，不需要重定向时返回 null。
//
// 2026-10-22 线上探针实测（EdgeOne Pages）：边缘**不改** x-forwarded-host，而是把 Host 改写成
// 内部域名（pages-pro-*.pages-scf-gz-pro.qcloudteo.com），用户实际访问的域名放在它自己的
// eo-pages-host 里。⇒ 判读主机名必须先看 EDGE_HOST_HEADERS，只看 Host 永远等不到 valuation.*。
export const VALUATION_HOST_PREFIX = 'valuation.'
export const VALUATION_TOOL_PATH = '/valuation'

/**
 * 边缘自报的「用户实际访问的域名」头（按优先级）。
 * eo-pages-host 是 EdgeOne Pages 的实测字段；x-forwarded-host 留给其它反代/自建场景。
 */
export const EDGE_HOST_HEADERS = ['eo-pages-host', 'x-forwarded-host'] as const

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
