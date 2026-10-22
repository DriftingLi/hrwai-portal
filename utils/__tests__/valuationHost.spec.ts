import { describe, it, expect } from 'vitest'
import { normalizeHost, valuationHostRedirect } from '../valuationHost'

describe('valuationHostRedirect', () => {
  it('残值子域根路径重定向到工具页', () => {
    expect(valuationHostRedirect('valuation.hrwai.cn', '/')).toBe('/valuation')
  })

  it('工具页内部路径原样通过', () => {
    expect(valuationHostRedirect('valuation.hrwai.cn', '/valuation/history')).toBeNull()
    expect(valuationHostRedirect('valuation.hrwai.cn', '/valuation/login')).toBeNull()
  })

  it('官网域与其他子域不重定向', () => {
    expect(valuationHostRedirect('www.hrwai.cn', '/')).toBeNull()
    expect(valuationHostRedirect('hrwai.cn', '/')).toBeNull()
  })

  it('大小写与空值', () => {
    expect(valuationHostRedirect('VALUATION.hrwai.cn', '/')).toBe('/valuation')
    expect(valuationHostRedirect('', '/')).toBeNull()
    expect(valuationHostRedirect(null, '/')).toBeNull()
  })

  it('带端口 / 代理链（EdgeOne 改写 Host 时的形态）', () => {
    expect(valuationHostRedirect('valuation.hrwai.cn:443', '/')).toBe('/valuation')
    expect(valuationHostRedirect('valuation.hrwai.cn, 10.0.0.1:8080', '/')).toBe('/valuation')
  })
})

describe('normalizeHost', () => {
  it('取代理链首段、去端口、转小写', () => {
    expect(normalizeHost(' Example.COM:8443, proxy ')).toBe('example.com')
  })
})
