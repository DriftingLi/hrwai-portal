/**
 * 跨模块跳转 URL 构建（纯函数，便于单测）。
 * 门户独占 www 主域；功能子域 = 站点根域 + 子域前缀。
 * siteBase 为空（未配置 NUXT_PUBLIC_SITE_URL）时回退为相对路径，便于本地开发。
 * protocol 可选：客户端跳转时以当前页协议覆盖站点配置的协议——
 * 生产 https 下跨子域跳转保持 https，不依赖构建期 PORTAL_SITE_URL 的协议值。
 */
export function buildSubdomainUrl(
  sub: 'training' | 'valuation',
  path: string,
  siteBase: string,
  protocol?: 'http:' | 'https:'
): string {
  if (!siteBase) return path
  const m = siteBase.match(/^(https?:\/\/)(?:www\.)?([^/]+)/)
  if (!m) return path
  const joined = path.startsWith('/') ? path : '/' + path
  const scheme = protocol ? `${protocol}//` : m[1]
  return `${scheme}${sub}.${m[2]}${joined}`
}

/**
 * 站点自身 URL（canonical/OG 用）。
 * canonical 统一 www 固定版（SEO 决策）：非 www 站点地址自动补 www 前缀；
 * IP / localhost / 单段主机名不补。未配置时返回相对路径。
 */
export function buildSiteUrl(path: string, siteBase: string): string {
  if (!siteBase) return path
  const joined = path.startsWith('/') ? path : '/' + path
  return `${normalizeWww(siteBase).replace(/\/$/, '')}${joined}`
}

function normalizeWww(base: string): string {
  const m = base.match(/^(https?:\/\/)([^/]+)/)
  if (!m) return base
  const host = m[2]!
  if (host.startsWith('www.')) return base
  if (!host.includes('.') || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return base
  return `${m[1]}www.${host}`
}
