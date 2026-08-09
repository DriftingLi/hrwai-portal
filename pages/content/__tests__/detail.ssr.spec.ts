// @vitest-environment nuxt
// 详情页组件级测试（ticket 04）：mock 数据访问层，断言 SSR 输出 HTML 含标题/meta/上下一篇。
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

const detailFixture = {
  content_id: 5,
  title: 'SSR 测试文章',
  summary: '摘要',
  cover_image: '/static/uploads/featured/a.webp',
  category: 'company',
  category_label: '公司动态',
  source: '测试来源',
  status: 1,
  view_count: 10,
  sort_order: 0,
  created_at: '2026-08-01T10:00:00.000000',
  updated_at: '2026-08-01T10:00:00.000000',
  published_at: '2026-08-02T10:00:00.000000',
  content: '# 正文标题\n\n正文段落内容',
  related: [
    {
      content_id: 7,
      title: '相关文章甲',
      summary: '相关摘要',
      cover_image: '',
      category: 'company',
      source: '',
      status: 1,
      view_count: 1,
      sort_order: 0,
      created_at: '',
      updated_at: '',
      published_at: '2026-08-01T10:00:00.000000'
    }
  ],
  prev: { content_id: 4, title: '上一篇测试', category: 'company', published_at: '2026-08-03T10:00:00.000000' },
  next: { content_id: 6, title: '下一篇测试', category: 'company', published_at: '2026-07-30T10:00:00.000000' }
}

vi.mock('~/composables/useFeaturedApi', () => ({
  useFeaturedApi: () => ({
    getPublicDetail: vi.fn().mockResolvedValue(detailFixture),
    incrementView: vi.fn().mockResolvedValue({ content_id: 5, view_count: 11 }),
    getPublicList: vi.fn()
  })
}))

describe('内容详情页 SSR 输出', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
  })

  it('渲染文章标题/正文/分类/来源与上下一篇/相关资讯，hydration 后计数 +1', async () => {
    const page = await import('~/pages/content/[id].vue')
    const html = await mountSuspended(page.default as any, {
      route: '/content/5'
    })

    expect(html.html()).toContain('SSR 测试文章')
    expect(html.html()).toContain('公司动态')
    expect(html.html()).toContain('测试来源')
    expect(html.html()).toContain('<h1>正文标题</h1>')
    expect(html.html()).toContain('<p>正文段落内容</p>')
    expect(html.html()).toContain('上一篇测试')
    expect(html.html()).toContain('下一篇测试')
    expect(html.html()).toContain('相关文章甲')
    // SSR 展示快照 10 → onMounted 后计数端点返回 11
    expect(html.html()).toContain('阅读 11')
  })

  it('输出文章级 head（title/description/canonical），需等待 unhead 异步应用', async () => {
    const page = await import('~/pages/content/[id].vue')
    await mountSuspended(page.default as any, {
      route: '/content/5'
    })

    await vi.waitFor(
      () => {
        const title = document.querySelector('title')?.textContent || ''
        expect(title).toContain('SSR 测试文章')

        const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href')
        expect(canonical).toContain('/content/5')
        const description = document.querySelector('meta[name="description"]')?.getAttribute('content')
        expect(description).toBe('摘要')
      },
      { timeout: 3000 }
    )
  })
})
