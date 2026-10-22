// @vitest-environment nuxt
// 整机评估页 SSR/组件测试（票 #32）：mock 数据访问层，断言「给定字典 → 页面渲染出什么」。
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

const dictionaries = {
  brands: [
    { id: 1, name: '合力', k_brand: 1.02, is_active: true },
    { id: 2, name: '林德', k_brand: 1.12, is_active: true }
  ],
  provinces: ['广东省', '江苏省'],
  conditionRatings: [
    { id: 1, rating: 'A', label: '优', base_coefficient: 1 },
    { id: 2, rating: 'B', label: '良', base_coefficient: 0.9 }
  ]
}

const apiMock = {
  getSession: vi.fn().mockResolvedValue({ user: null }),
  listBrands: vi.fn().mockResolvedValue(dictionaries.brands),
  listProvinces: vi.fn().mockResolvedValue(dictionaries.provinces),
  listConditionRatings: vi.fn().mockResolvedValue(dictionaries.conditionRatings),
  listVehicleTypes: vi.fn().mockResolvedValue([]),
  listSeries: vi.fn().mockResolvedValue([]),
  listTonnages: vi.fn().mockResolvedValue([]),
  listConfigTypes: vi.fn().mockResolvedValue([]),
  listMastTypes: vi.fn().mockResolvedValue([]),
  listMastHeights: vi.fn().mockResolvedValue([]),
  listCities: vi.fn().mockResolvedValue([]),
  createEvaluation: vi.fn(),
  logout: vi.fn()
}

vi.mock('~/composables/useValuationApi', () => ({ useValuationApi: () => apiMock }))

describe('整机残值评估页', () => {
  it('SSR 预取字典：品牌/省份/车况评级直接出现在表单里，且整机评估为当前子导航', async () => {
    const page = await import('~/pages/valuation/index.vue')
    const wrapper = await mountSuspended(page.default as any, { route: '/valuation' })
    const html = wrapper.html()

    expect(html).toContain('整机残值评估')
    expect(html).toContain('合力')
    expect(html).toContain('林德')
    expect(html).toContain('广东省')
    expect(html).toContain('优')
    expect(html).toContain('开始评估')
    // 未登录：子导航给的是登录入口
    expect(html).toContain('/valuation/login')
    expect(html).not.toContain('退出')
  })

  it('/valuation/** 输出 robots noindex（动态评估页不进搜索索引）', async () => {
    const page = await import('~/pages/valuation/index.vue')
    await mountSuspended(page.default as any, { route: '/valuation' })

    await vi.waitFor(
      () => {
        const robots = document.querySelector('meta[name="robots"]')?.getAttribute('content') || ''
        expect(robots).toContain('noindex')
      },
      { timeout: 3000 }
    )
  })
})
