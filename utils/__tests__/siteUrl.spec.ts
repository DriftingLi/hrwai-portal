import { describe, it, expect } from 'vitest'
import { buildSubdomainUrl, buildSiteUrl } from '../siteUrl'

describe('buildSubdomainUrl', () => {
  it('www 前缀站点生成功能子域', () => {
    expect(buildSubdomainUrl('training', '/', 'https://www.example.com')).toBe(
      'https://training.example.com/'
    )
    expect(buildSubdomainUrl('valuation', '/history', 'https://www.example.com')).toBe(
      'https://valuation.example.com/history'
    )
  })

  it('无 www 前缀站点同样生成功能子域', () => {
    expect(buildSubdomainUrl('training', '/', 'https://example.com')).toBe(
      'https://training.example.com/'
    )
  })

  it('未配置站点地址回退为相对路径', () => {
    expect(buildSubdomainUrl('training', '/', '')).toBe('/')
    expect(buildSubdomainUrl('valuation', '/x', '')).toBe('/x')
  })

  it('协议覆盖：客户端跳转以当前页协议为准（生产 https 适配）', () => {
    // 站点配置为 http、当前页 https → 跳转 https（生产切 https 后的主场景）
    expect(buildSubdomainUrl('training', '/', 'http://www.example.com', 'https:')).toBe(
      'https://training.example.com/'
    )
    expect(buildSubdomainUrl('valuation', '/history', 'http://example.com', 'https:')).toBe(
      'https://valuation.example.com/history'
    )
    // 站点配置为 https、当前页 http（本地直连 http 调试）→ 跳转 http
    expect(buildSubdomainUrl('training', '/', 'https://www.example.com', 'http:')).toBe(
      'http://training.example.com/'
    )
  })

  it('协议覆盖在未配置站点地址时仍回退为相对路径', () => {
    expect(buildSubdomainUrl('training', '/', '', 'https:')).toBe('/')
  })
})

describe('buildSiteUrl', () => {
  it('拼接站点地址与路径（容忍重复斜杠）', () => {
    expect(buildSiteUrl('/', 'https://www.example.com/')).toBe('https://www.example.com/')
    expect(buildSiteUrl('/news', 'https://www.example.com')).toBe('https://www.example.com/news')
  })

  it('canonical 统一 www 固定版：裸域自动补 www', () => {
    expect(buildSiteUrl('/', 'https://example.com')).toBe('https://www.example.com/')
    expect(buildSiteUrl('/content/5', 'https://example.com')).toBe(
      'https://www.example.com/content/5'
    )
  })

  it('带端口的裸域补 www 且保留端口', () => {
    expect(buildSiteUrl('/', 'https://example.com:8443')).toBe(
      'https://www.example.com:8443/'
    )
  })

  it('IP / localhost 不加 www', () => {
    expect(buildSiteUrl('/', 'https://127.0.0.1')).toBe('https://127.0.0.1/')
    expect(buildSiteUrl('/', 'https://localhost:3000')).toBe('https://localhost:3000/')
  })

  it('未配置站点地址回退为相对路径', () => {
    expect(buildSiteUrl('/news', '')).toBe('/news')
  })
})
