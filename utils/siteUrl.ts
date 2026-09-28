/**
 * 跨模块跳转 URL 构建（纯函数，便于单测）。
 * featureBase 是**功能服务所在的域根**，不是门户自身域名——门户换域名后
 * 功能服务（training./valuation.）可能仍留在原域，因此两者分开配置；
 * 缺失时回退为相对路径，便于本地开发。
 * protocol 可选：客户端跳转时以当前页协议覆盖配置的协议——
 * 生产 https 下跨子域跳转保持 https，不依赖构建期配置的协议值。
 */
export function buildSubdomainUrl(
  sub: 'training' | 'valuation',
  path: string,
  featureBase: string,
  protocol?: 'http:' | 'https:'
): string {
  if (!featureBase) return path
  const m = featureBase.match(/^(https?:\/\/)(?:www\.)?([^/]+)/)
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
