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

// 提出来供用例按需改返回（docx 分支要换一份 fixture）；factory 外提是 vi.mock 提升的硬要求
const useFeaturedApiMock = vi.hoisted(() => ({
  getPublicDetail: vi.fn(),
  incrementView: vi.fn(),
  getPublicList: vi.fn()
}))

vi.mock('~/composables/useFeaturedApi', () => ({
  useFeaturedApi: () => useFeaturedApiMock
}))

describe('内容详情页 SSR 输出', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    useFeaturedApiMock.getPublicDetail.mockResolvedValue(detailFixture)
    useFeaturedApiMock.incrementView.mockResolvedValue({ content_id: 5, view_count: 11 })
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

// docx 正文（2026-11）：作者选「导入 Word」后，门户不再渲染 content，改在浏览器里
// 用 docx-preview 还原原始 Word。守两件：SSR 期不能崩（只认 DOM 的库不许在服务端跑）、
// 正文也不能两者都渲染（否则读者会看到一段空 content + 一份文档）。
describe('内容详情页 docx 正文', () => {
  it('content_type=docx：走 ClientOnly + DocxDocument，不渲染 markdown 正文', async () => {
    const docxFixture = {
      ...detailFixture,
      content_type: 'docx',
      content: '',
      docx_url: '/static/uploads/featured/docx/plan_1700000000000.docx'
    }
    vi.mocked(useFeaturedApiMock.getPublicDetail).mockResolvedValue(docxFixture as never)

    const page = await import('~/pages/content/[id].vue')
    // 用不同 id：useAsyncData 按 `featured-detail-<id>` 缓存，同 id 会复用上面两条用例的 markdown 结果
    const wrapper = await mountSuspended(page.default as any, { route: '/content/6' })
    const html = wrapper.html()

    // docx-preview 不在 SSR 期执行：正文区出的是加载骨架，且不出现 markdown 渲染结果
    expect(html).toContain('docx-document')
    expect(html).toContain('docx-skeleton')
    expect(html).not.toContain('<p>正文段落内容</p>')
    // Markdown 正文容器整体让位（断言 class 属性，避开模板注释里同名的文字）
    expect(html).not.toContain('class="markdown-body"')
  })
})
