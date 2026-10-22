// @vitest-environment nuxt
// 估值登录页测试（票 #32）：登录失败时把服务端文案显示出来，且提交的是 BFF 会话端点。
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { nextTick } from 'vue'

const loginMock = vi.fn()

const apiMock = {
  getSession: vi.fn().mockResolvedValue({ user: null }),
  login: loginMock,
  logout: vi.fn()
}

vi.mock('~/composables/useValuationApi', () => ({ useValuationApi: () => apiMock }))

function fetchError(message: string, statusCode = 401) {
  return Object.assign(new Error(`[POST] "/__portal__/valuation/session/login": ${statusCode}`), {
    statusCode,
    data: { statusCode, statusMessage: message, message }
  })
}

describe('估值登录页', () => {
  it('渲染账号/密码输入与登录按钮', async () => {
    const page = await import('~/pages/valuation/login.vue')
    const wrapper = await mountSuspended(page.default as any, { route: '/valuation/login' })
    const html = wrapper.html()

    expect(html).toContain('登录估值工作区')
    expect(html).toContain('账号')
    expect(html).toContain('密码')
    expect(wrapper.find('[data-test="submit"]').text()).toContain('登录')
  })

  it('登录失败显示服务端文案（不显示 ofetch 原始串），且账号已去空白', async () => {
    loginMock.mockRejectedValueOnce(fetchError('账号或密码错误'))
    const page = await import('~/pages/valuation/login.vue')
    const wrapper = await mountSuspended(page.default as any, { route: '/valuation/login' })

    await wrapper.find('[data-test="account"]').setValue('  demo  ')
    await wrapper.find('[data-test="password"]').setValue('bad')
    await wrapper.find('form').trigger('submit')
    await nextTick()
    await vi.waitFor(() => {
      expect(wrapper.html()).toContain('账号或密码错误')
    })

    expect(loginMock).toHaveBeenCalledWith({ account: 'demo', password: 'bad' })
    expect(wrapper.html()).not.toContain('[POST]')
  })
})
