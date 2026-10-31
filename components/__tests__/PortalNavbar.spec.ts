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

  it('/showcase 列表页：停在「3D展台」', async () => {
    expect(await activeLabels('/showcase')).toEqual(['3D展台'])
  })

  it('/showcase 车型详情页：仍停在「3D展台」', async () => {
    expect(await activeLabels('/showcase/explosion-proof-forklift')).toEqual(['3D展台'])
  })

  it('与内容精选无关的页面：回落到「首页」', async () => {
    expect(await activeLabels('/valuation')).toEqual(['首页'])
  })

  it('每次只有一个导航项被标为 active', async () => {
    for (const route of [
      '/',
      '/news',
      '/content/5',
      '/showcase',
      '/showcase/explosion-proof-forklift',
      '/valuation'
    ]) {
      expect(await activeLabels(route)).toHaveLength(1)
    }
  })

  it('「3D展台」固定在导航最右侧', async () => {
    const wrapper = await mountSuspended(PortalNavbar, {
      route: '/',
      props: { menuItems: portalNav }
    })
    const labels = wrapper.findAll('.nav-link').map((link) => link.text())
    expect(labels.at(-1)).toBe('3D展台')
  })
})

// 内容精选原先只能滚到首页区块，归档页没有点击入口；下拉是那条路径。
describe('内容精选下拉', () => {
  const EXPECTED = [
    { label: '总览', href: '/news' },
    { label: '公司动态', href: '/news/company' },
    { label: '行业新闻', href: '/news/industry' },
    { label: '产品资讯', href: '/news/product' },
    { label: '政策法规', href: '/news/news' },
    { label: '考情', href: '/news/exam' },
    { label: '公告', href: '/news/notice' }
  ]

  async function mountNav(route: string) {
    const wrapper = await mountSuspended(PortalNavbar, {
      route,
      props: { menuItems: portalNav }
    })
    const item = wrapper.findAll('.nav-item').find((li) => li.text().includes('内容精选'))
    if (!item) throw new Error('找不到内容精选导航项')
    return { wrapper, item }
  }

  it('默认收起', async () => {
    const { item } = await mountNav('/')
    expect(item.find('.nav-dropdown').classes()).not.toContain('open')
  })

  it('悬停展开，移开收起，子项是总览 + 六个分类', async () => {
    const { item } = await mountNav('/')

    await item.trigger('mouseenter')
    expect(item.find('.nav-dropdown').classes()).toContain('open')

    const links = item.findAll('.nav-dropdown-link')
    expect(links.map((l) => l.text())).toEqual(EXPECTED.map((e) => e.label))
    expect(links.map((l) => l.attributes('href'))).toEqual(EXPECTED.map((e) => e.href))

    await item.trigger('mouseleave')
    expect(item.find('.nav-dropdown').classes()).not.toContain('open')
  })

  it('键盘聚焦也展开（不能只有鼠标能用）', async () => {
    const { item } = await mountNav('/')
    await item.trigger('focusin')
    expect(item.find('.nav-dropdown').classes()).toContain('open')
  })

  it('分类页里对应子项高亮', async () => {
    const { item } = await mountNav('/news/company')
    await item.trigger('mouseenter')
    const active = item.findAll('.nav-dropdown-link').filter((l) => l.classes().includes('active'))
    expect(active.map((l) => l.text())).toEqual(['公司动态'])
  })

  it('移动端菜单平铺同样的七个子项（无 hover 也能进归档页）', async () => {
    const { wrapper } = await mountNav('/')
    await wrapper.find('.hamburger').trigger('click')

    const subLinks = wrapper.findAll('.mobile-sub-link')
    expect(subLinks.map((l) => l.text())).toEqual(EXPECTED.map((e) => e.label))
    expect(subLinks.map((l) => l.attributes('href'))).toEqual(EXPECTED.map((e) => e.href))
  })
})
