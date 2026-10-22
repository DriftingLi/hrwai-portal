// @vitest-environment nuxt
// 电池 RUL 输入页测试（票 #32）：断言输入面渲染 + 「载入示例数据」后的可提交反馈。
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { nextTick } from 'vue'

const apiMock = {
  getSession: vi.fn().mockResolvedValue({ user: null }),
  createBatteryEvaluation: vi.fn(),
  logout: vi.fn()
}

vi.mock('~/composables/useValuationApi', () => ({ useValuationApi: () => apiMock }))

describe('电池 RUL 评估页', () => {
  it('渲染三种电池类型、循环 JSON 输入与最少循环数提示', async () => {
    const page = await import('~/pages/valuation/battery/index.vue')
    const wrapper = await mountSuspended(page.default as any, { route: '/valuation/battery' })
    const html = wrapper.html()

    expect(html).toContain('电池健康度（RUL）评估')
    expect(html).toContain('磷酸铁锂（LFP）')
    expect(html).toContain('三元锂（NCM）')
    expect(html).toContain('至少 10 条')
    // 初始没有数据，提交按钮禁用
    expect(wrapper.find('[data-test="submit"]').attributes('disabled')).toBeDefined()
  })

  it('载入示例数据后识别出 15 个循环，提交按钮可用', async () => {
    const page = await import('~/pages/valuation/battery/index.vue')
    const wrapper = await mountSuspended(page.default as any, { route: '/valuation/battery' })

    await wrapper.find('[data-test="load-sample"]').trigger('click')
    await nextTick()

    expect(wrapper.html()).toContain('已识别 15 个循环')
    expect(wrapper.find('[data-test="submit"]').attributes('disabled')).toBeUndefined()
  })
})
