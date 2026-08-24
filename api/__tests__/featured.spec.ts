// 数据访问层单元测试：mock $fetch，断言请求 URL/参数与响应转换（契约唯一边界）。
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { $fetch } from 'ofetch'
import { featuredApi, categoryLabel, featuredCategoryKeys, featuredCategoryOptions } from '../featured'

vi.mock('ofetch', () => ({ $fetch: vi.fn() }))

const mockedFetch = vi.mocked($fetch)

/** 后端统一包装结构（与真实响应一致） */
const wrapped = <T>(data: T) => ({ code: 200, message: 'success', data })

describe('featuredApi', () => {
  beforeEach(() => {
    mockedFetch.mockReset()
  })

  it('getPublicList 携带分页与分类参数并解包 data', async () => {
    mockedFetch.mockResolvedValue(wrapped({ items: [], page: 1, pages: 1, total: 0 }))
    const res = await featuredApi.getPublicList({ page: 2, page_size: 10, category: 'company' })
    expect(mockedFetch).toHaveBeenCalledWith('/api/featured-contents', {
      query: { page: 2, page_size: 10, category: 'company' }
    })
    expect(res.total).toBe(0)
  })

  it('getPublicDetail 默认带 no_view=1（SSR 路径不计阅读量）并解包 data', async () => {
    mockedFetch.mockResolvedValue(wrapped({ content_id: 5 }))
    const res = await featuredApi.getPublicDetail(5)
    expect(mockedFetch).toHaveBeenCalledWith('/api/featured-content/5', {
      query: { no_view: 1 }
    })
    expect(res.content_id).toBe(5)
  })

  it('getPublicDetail(noView=false) 不带 no_view 参数', async () => {
    mockedFetch.mockResolvedValue(wrapped({ content_id: 5 }))
    await featuredApi.getPublicDetail(5, false)
    expect(mockedFetch).toHaveBeenCalledWith('/api/featured-content/5', {
      query: undefined
    })
  })

  it('incrementView 用 POST 调用客户端计数端点并解包 data', async () => {
    mockedFetch.mockResolvedValue(wrapped({ content_id: 5, view_count: 9 }))
    const res = await featuredApi.incrementView(5)
    expect(mockedFetch).toHaveBeenCalledWith('/api/featured-content/5/view', {
      method: 'POST'
    })
    expect(res.view_count).toBe(9)
  })
})

describe('categoryLabel', () => {
  it('四类映射正确', () => {
    expect(categoryLabel('company')).toBe('公司动态')
    expect(categoryLabel('industry')).toBe('行业新闻')
    expect(categoryLabel('product')).toBe('产品资讯')
    expect(categoryLabel('news')).toBe('政策法规')
  })

  it('未知分类回退「资讯」', () => {
    expect(categoryLabel('unknown')).toBe('政策法规')
    expect(categoryLabel('')).toBe('政策法规')
  })

  it('分类 key 与选项结构一致', () => {
    expect(featuredCategoryOptions.map((o) => o.value)).toEqual([...featuredCategoryKeys])
  })
})
