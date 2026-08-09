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
