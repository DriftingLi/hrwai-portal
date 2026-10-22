// @vitest-environment nuxt
// 降级路径（票 #32）：字典接口不可用时，评估页仍要渲染表单并给出提示，而不是 500。
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

const apiMock = {
  getSession: vi.fn().mockResolvedValue({ user: null }),
  listBrands: vi.fn().mockRejectedValue(new Error('upstream unavailable')),
  listProvinces: vi.fn().mockRejectedValue(new Error('upstream unavailable')),
  listConditionRatings: vi.fn().mockRejectedValue(new Error('upstream unavailable')),
  logout: vi.fn()
}

vi.mock('~/composables/useValuationApi', () => ({ useValuationApi: () => apiMock }))

describe('整机评估页（字典不可用）', () => {
  it('仍渲染表单与提交按钮，并提示字典暂不可用', async () => {
    const page = await import('~/pages/valuation/index.vue')
    const wrapper = await mountSuspended(page.default as any, { route: '/valuation' })
    const html = wrapper.html()

    expect(html).toContain('字典数据暂时不可用')
    expect(html).toContain('提交评估')
    expect(html).toContain('请选择品牌')
  })
})
