// @vitest-environment nuxt
// 顶部导航「位置指示条」的归属：锁住按路由固定高亮的契约。
// 背景：指示条在首页随滚动切换，但内容精选区块（/news 归档 + /content 文章详情）
// 必须固定停在「内容精选」，不能被滚动或具体文章带偏。
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import PortalNavbar from '~/components/PortalNavbar.vue'
import { portalNav } from '~/config/portalNav'

/** 在指定路由下挂载导航，返回被标为 active 的导航项文案 */
async function activeLabels(route: string): Promise<string[]> {
  const wrapper = await mountSuspended(PortalNavbar, {
    route,
    props: { menuItems: portalNav }
  })
  return wrapper
    .findAll('.nav-link')
    .filter((link) => link.classes().includes('active'))
    .map((link) => link.text())
}

describe('顶部导航位置指示条', () => {
  it('首页：停在「首页」', async () => {
    expect(await activeLabels('/')).toEqual(['首页'])
  })

  it('/news 归档页：停在「内容精选」', async () => {
    expect(await activeLabels('/news')).toEqual(['内容精选'])
  })

  it('/news 分类子页：仍停在「内容精选」', async () => {
    expect(await activeLabels('/news/company')).toEqual(['内容精选'])
    expect(await activeLabels('/news/industry')).toEqual(['内容精选'])
  })

  it('/content 文章详情页：同属内容精选区块', async () => {
    expect(await activeLabels('/content/5')).toEqual(['内容精选'])
  })

  it('与内容精选无关的页面：回落到「首页」', async () => {
    expect(await activeLabels('/valuation')).toEqual(['首页'])
  })

  it('每次只有一个导航项被标为 active', async () => {
    for (const route of ['/', '/news', '/content/5', '/valuation']) {
      expect(await activeLabels(route)).toHaveLength(1)
    }
  })
})
