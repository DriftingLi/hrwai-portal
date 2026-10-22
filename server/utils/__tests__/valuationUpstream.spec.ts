import { describe, it, expect } from 'vitest'
import { buildUpstreamHeaders, loginValuation, logoutValuation, fetchValuationMe, resolveValuationUpstreamUrl, ValuationUpstreamError, type UpstreamRequestInit, type UpstreamResponse, type ValuationUpstreamFetch } from '../valuationUpstream'

const config = { base: 'http://backend:8080/', originToken: 'origin-secret' }

interface Call {
  url: string
  init: UpstreamRequestInit
}

/** 假上游：记录调用，按脚本返回 */
function fakeUpstream(respond: (call: Call) => UpstreamResponse | Promise<UpstreamResponse>) {
  const calls: Call[] = []
  const fetchImpl: ValuationUpstreamFetch = async (url, init) => {
    const call = { url, init }
    calls.push(call)
    return respond(call)
  }
  return { fetchImpl, calls }
}

const envelope = (data: unknown) => ({ code: 200, message: 'success', data })

describe('上游地址与请求头', () => {
  it('拼掉 base 尾部斜杠，路径以 / 开头', () => {
    expect(resolveValuationUpstreamUrl(config, '/api/valuation/auth/login')).toBe(
      'http://backend:8080/api/valuation/auth/login'
    )
    expect(resolveValuationUpstreamUrl({ base: 'http://x' }, 'api/y')).toBe('http://x/api/y')
  })

  it('回源 token 与既有代理同口径；有令牌时注入 Bearer', () => {
    expect(buildUpstreamHeaders(config)).toEqual({
      accept: 'application/json',
      'x-origin-token': 'origin-secret'
    })
    expect(buildUpstreamHeaders(config, 'access-token')).toEqual({
      accept: 'application/json',
      'x-origin-token': 'origin-secret',
      authorization: 'Bearer access-token'
    })
  })

  it('回源 token 为空时不带该头（不发空 token）', () => {
    expect(buildUpstreamHeaders({ base: 'http://x' })).toEqual({ accept: 'application/json' })
  })
})

describe('loginValuation', () => {
  it('按票面契约发 POST {account,password}，成功时收下双令牌与用户信息', async () => {
    const { fetchImpl, calls } = fakeUpstream(() => ({
      status: 200,
      json: envelope({
        token: 'access-1',
        refresh_token: 'refresh-1',
        user_id: 42,
        account: 'u42',
        username: '李四',
        role: 'hrwai_user'
      })
    }))

    const session = await loginValuation({ config, fetch: fetchImpl }, { account: 'u42', password: 'p@ss' })

    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe('http://backend:8080/api/valuation/auth/login')
    expect(calls[0]?.init.method).toBe('POST')
    expect(calls[0]?.init.headers['content-type']).toBe('application/json')
    expect(calls[0]?.init.headers['x-origin-token']).toBe('origin-secret')
    expect(JSON.parse(calls[0]?.init.body ?? '{}')).toEqual({ account: 'u42', password: 'p@ss' })
    expect(session).toEqual({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      userId: 42,
      account: 'u42',
      username: '李四',
      role: 'hrwai_user'
    })
  })

  it('401 原样上抛（凭证错误不区分账号是否存在）', async () => {
    const { fetchImpl } = fakeUpstream(() => ({
      status: 401,
      json: { code: 401, message: '账号或密码错误', data: null }
    }))
    await expect(loginValuation({ config, fetch: fetchImpl }, { account: 'a', password: 'b' })).rejects.toMatchObject({
      status: 401,
      message: '账号或密码错误'
    })
  })

  it('503（登录通道未装配）不能被误读成凭证错误', async () => {
    const { fetchImpl } = fakeUpstream(() => ({
      status: 503,
      json: { code: 500, message: '估值登录通道未装配' }
    }))
    await expect(loginValuation({ config, fetch: fetchImpl }, { account: 'a', password: 'b' })).rejects.toMatchObject({
      status: 503,
      message: '估值登录通道未装配'
    })
  })

  it('上游不可达映射成 502', async () => {
    const { fetchImpl } = fakeUpstream(() => {
      throw new Error('ECONNREFUSED')
    })
    await expect(loginValuation({ config, fetch: fetchImpl }, { account: 'a', password: 'b' })).rejects.toMatchObject({
      status: 502
    })
  })

  it('响应缺令牌时拒绝（不签一个没有凭证的会话）', async () => {
    const { fetchImpl } = fakeUpstream(() => ({
      status: 200,
      json: envelope({ refresh_token: 'r', user_id: 1 })
    }))
    const error = await loginValuation({ config, fetch: fetchImpl }, { account: 'a', password: 'b' }).catch(
      (e: unknown) => e
    )
    expect(error).toBeInstanceOf(ValuationUpstreamError)
    expect((error as ValuationUpstreamError).status).toBe(502)
  })
})

describe('logoutValuation', () => {
  it('带 refresh 与 Bearer 调登出，成功返回 true', async () => {
    const { fetchImpl, calls } = fakeUpstream(() => ({ status: 200, json: { code: 200, data: null } }))
    const ok = await logoutValuation({ config, fetch: fetchImpl }, {
      accessToken: 'access-1',
      refreshToken: 'refresh-1'
    })
    expect(ok).toBe(true)
    expect(calls[0]?.url).toBe('http://backend:8080/api/valuation/auth/logout')
    expect(calls[0]?.init.method).toBe('POST')
    expect(calls[0]?.init.headers.authorization).toBe('Bearer access-1')
    expect(JSON.parse(calls[0]?.init.body ?? '{}')).toEqual({ refresh_token: 'refresh-1' })
  })

  it('上游失败/不可达返回 false（登出不能反悔，调用方只留痕）', async () => {
    const failing = fakeUpstream(() => ({ status: 500, json: null }))
    expect(
      await logoutValuation({ config, fetch: failing.fetchImpl }, { accessToken: 'a', refreshToken: 'r' })
    ).toBe(false)

    const throwing = fakeUpstream(() => {
      throw new Error('boom')
    })
    expect(
      await logoutValuation({ config, fetch: throwing.fetchImpl }, { accessToken: 'a', refreshToken: 'r' })
    ).toBe(false)
  })
})

describe('fetchValuationMe', () => {
  it('200 时返回会话摘要（含脱敏后的用户字段）', async () => {
    const { fetchImpl, calls } = fakeUpstream(() => ({
      status: 200,
      json: envelope({ user_id: 9, account: 'u9', username: '王五', role: 'hrwai_user', phone: '138****' })
    }))
    const user = await fetchValuationMe({ config, fetch: fetchImpl }, 'access-9')
    expect(user).toEqual({ user_id: 9, account: 'u9', username: '王五', role: 'hrwai_user' })
    expect(calls[0]?.init.headers.authorization).toBe('Bearer access-9')
    expect(calls[0]?.url).toBe('http://backend:8080/api/valuation/auth/me')
  })

  it('401 视为令牌失效 → null（调用方清 Cookie）', async () => {
    const { fetchImpl } = fakeUpstream(() => ({ status: 401, json: { code: 401, message: '未认证' } }))
    expect(await fetchValuationMe({ config, fetch: fetchImpl }, 'stale')).toBeNull()
  })

  it('其它上游失败抛 502（调用方据此降级，而不是把人登出）', async () => {
    const { fetchImpl } = fakeUpstream(() => ({ status: 500, json: { code: 500, message: '查询失败' } }))
    await expect(fetchValuationMe({ config, fetch: fetchImpl }, 'access')).rejects.toMatchObject({
      status: 502,
      message: '查询失败'
    })
  })
})
