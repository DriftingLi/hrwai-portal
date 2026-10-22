// 登录回跳地址的白名单（票 #32）：只允许本域 /valuation/** 内的站内路径，
// 挡住 "//evil.com"、"/api/..." 与绝对 URL 这类开放重定向素材。
export const VALUATION_DEFAULT_REDIRECT = '/valuation/history'

export function sanitizeValuationRedirect(raw: unknown, fallback = VALUATION_DEFAULT_REDIRECT): string {
  const value = typeof raw === 'string' ? raw.trim() : ''
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback
  if (value !== '/valuation' && !value.startsWith('/valuation/') && !value.startsWith('/valuation?')) {
    return fallback
  }
  return value
}
