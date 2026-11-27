import { describe, expect, it } from 'vitest'
import { featuredCategoryKeys } from '~/api/featured'
import { STATIC_URLS } from '../staticUrls'

describe('sitemap 静态路由', () => {
  it('收录全部内容分类归档页（含考情/公告，新增分类自动带上）', () => {
    const locs = STATIC_URLS.map((u) => u.loc)
    for (const key of featuredCategoryKeys) {
      expect(locs).toContain(`/news/${key}`)
    }
  })

  it('包含门户主页与内容精选总览', () => {
    const locs = STATIC_URLS.map((u) => u.loc)
    expect(locs).toContain('/')
    expect(locs).toContain('/news')
  })
})
