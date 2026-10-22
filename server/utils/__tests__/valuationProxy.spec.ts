import { describe, it, expect } from 'vitest'
import { planValuationProxy } from '../valuationProxy'
import type { ValuationSession } from '../valuationSession'

const session: ValuationSession = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  userId: 7,
  account: 'u7',
  username: '张三',
  role: 'hrwai_user'
}

describe('代理头策略（估值）', () => {
  it('估值接口：注入 Bearer，并把浏览器自带的 Authorization 抹掉', () => {
    const plan = planValuationProxy({
      path: '/api/valuation/evaluations?page=1',
      originToken: 'origin-secret',
      cookieHeader: 'hrwai_valuation_session=abc; other=1',
      session
    })
    expect(plan.headers).toEqual({
      'x-origin-token': 'origin-secret',
      authorization: 'Bearer access-token',
      cookie: 'other=1'
    })
    expect(plan.dropRequestHeaders).toContain('authorization')
    expect(plan.dropRequestHeaders).toContain('x-origin-token')
  })

  it('未登录时估值接口不注入 Bearer（匿名提交仍可走），但会话 Cookie 依然不外泄', () => {
    const plan = planValuationProxy({
      path: '/api/valuation/evaluations',
      cookieHeader: 'hrwai_valuation_session=abc',
      session: null
    })
    expect(plan.headers).not.toHaveProperty('authorization')
    expect(plan.headers.cookie).toBe('')
    expect(plan.headers).not.toHaveProperty('x-origin-token')
  })

  it('非估值接口：不注入 Bearer，也不动 Cookie（估值令牌不外溢到别处）', () => {
    const plan = planValuationProxy({
      path: '/api/featured-contents',
      cookieHeader: 'hrwai_valuation_session=abc; a=1',
      session
    })
    expect(plan.headers).toEqual({})
    expect(plan.headers).not.toHaveProperty('cookie')
    expect(plan.dropRequestHeaders).not.toContain('authorization')
  })

  it('浏览器伪造 x-origin-token 一律抹掉（回源 token 只能来自部署环境变量）', () => {
    const plan = planValuationProxy({ path: '/api/featured-contents', session: null })
    expect(plan.dropRequestHeaders).toContain('x-origin-token')
    expect(plan.headers).not.toHaveProperty('x-origin-token')
  })

  it('请求没有 Cookie 头时不补一个空 Cookie 头', () => {
    const plan = planValuationProxy({ path: '/api/valuation/evaluations', session })
    expect(plan.headers).not.toHaveProperty('cookie')
    expect(plan.headers.authorization).toBe('Bearer access-token')
  })
})
