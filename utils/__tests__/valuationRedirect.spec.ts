import { describe, it, expect } from 'vitest'
import { VALUATION_DEFAULT_REDIRECT, sanitizeValuationRedirect } from '../valuationRedirect'

describe('登录回跳白名单', () => {
  it('放行 /valuation/** 站内路径（含查询串）', () => {
    expect(sanitizeValuationRedirect('/valuation/history')).toBe('/valuation/history')
    expect(sanitizeValuationRedirect('/valuation/report/12')).toBe('/valuation/report/12')
    expect(sanitizeValuationRedirect('/valuation/history?type=battery&page=2')).toBe(
      '/valuation/history?type=battery&page=2'
    )
    expect(sanitizeValuationRedirect('/valuation')).toBe('/valuation')
  })

  it('挡开放重定向：协议相对、绝对 URL、站外路径、反斜杠变体', () => {
    expect(sanitizeValuationRedirect('//evil.example')).toBe(VALUATION_DEFAULT_REDIRECT)
    expect(sanitizeValuationRedirect('https://evil.example')).toBe(VALUATION_DEFAULT_REDIRECT)
    expect(sanitizeValuationRedirect('/api/auth/login')).toBe(VALUATION_DEFAULT_REDIRECT)
    expect(sanitizeValuationRedirect('/\\evil.example')).toBe(VALUATION_DEFAULT_REDIRECT)
    expect(sanitizeValuationRedirect('javascript:alert(1)')).toBe(VALUATION_DEFAULT_REDIRECT)
    expect(sanitizeValuationRedirect(undefined)).toBe(VALUATION_DEFAULT_REDIRECT)
    expect(sanitizeValuationRedirect(['/valuation/history'])).toBe(VALUATION_DEFAULT_REDIRECT)
  })
})
