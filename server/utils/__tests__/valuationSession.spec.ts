import { describe, it, expect } from 'vitest'
import {
  VALUATION_SESSION_COOKIE,
  VALUATION_SESSION_FALLBACK_TTL,
  accessTokenExpirySeconds,
  buildClearedSessionCookieOptions,
  buildSessionCookieOptions,
  decodeValuationSession,
  encodeValuationSession,
  isBlockedValuationProxyPath,
  isValuationApiPath,
  stripValuationSessionCookie,
  toSessionUser,
  valuationSessionMaxAge,
  valuationSessionNeedsRefresh,
  type ValuationSession
} from '../valuationSession'

const session: ValuationSession = {
  accessToken: 'header.payload.sig',
  refreshToken: 'refresh.payload.sig',
  userId: 7,
  account: 'u7',
  username: '张三',
  role: 'hrwai_user'
}

/** 造一支只有 exp 的 JWT（本模块只解码不验签） */
function jwtWithExp(exp: number): string {
  const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url')
  return `header.${payload}.sig`
}

describe('会话 Cookie 编解码', () => {
  it('编码后可原样解回', () => {
    expect(decodeValuationSession(encodeValuationSession(session))).toEqual(session)
  })

  it('空值/损坏/结构不全一律当未登录，不抛异常', () => {
    expect(decodeValuationSession(undefined)).toBeNull()
    expect(decodeValuationSession('')).toBeNull()
    expect(decodeValuationSession('not-base64-json')).toBeNull()
    expect(decodeValuationSession(Buffer.from('{"account":"u7"}').toString('base64url'))).toBeNull()
    expect(decodeValuationSession(Buffer.from('[]').toString('base64url'))).toBeNull()
  })

  it('Cookie 名是本域会话 Cookie（不含父域域名信息）', () => {
    expect(VALUATION_SESSION_COOKIE).toBe('hrwai_valuation_session')
  })
})

describe('Cookie 属性对齐票面', () => {
  it('httpOnly + Secure + SameSite=Lax + Path=/，且不设 Domain（不会漏到父域）', () => {
    expect(buildSessionCookieOptions({ maxAge: 600, secure: true })).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 600
    })
    expect('domain' in buildSessionCookieOptions({ maxAge: 600, secure: true })).toBe(false)
  })

  it('清除用的属性与下发一致（maxAge=0）', () => {
    expect(buildClearedSessionCookieOptions(true)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0
    })
  })
})

describe('有效期与 access token exp 对齐', () => {
  it('解出 exp 时用剩余寿命当 Cookie 寿命', () => {
    const now = 1_700_000_000
    expect(valuationSessionMaxAge({ ...session, accessToken: jwtWithExp(now + 3600) }, now)).toBe(3600)
  })

  it('解不出 exp / 已过期附近回退兜底寿命（不签一个马上失效的 Cookie）', () => {
    expect(valuationSessionMaxAge(session, 1)).toBe(VALUATION_SESSION_FALLBACK_TTL)
    expect(valuationSessionMaxAge({ ...session, accessToken: jwtWithExp(1000) }, 1000)).toBe(
      VALUATION_SESSION_FALLBACK_TTL
    )
  })

  it('非 JWT（或损坏）返回 null，不抛异常', () => {
    expect(accessTokenExpirySeconds('opaque-token')).toBeNull()
    expect(accessTokenExpirySeconds('a.b')).toBeNull()
    expect(accessTokenExpirySeconds('a.@@@.c')).toBeNull()
  })
})

describe('Cookie 头脱敏', () => {
  it('只摘本期会话 Cookie，其余 Cookie 原样保留', () => {
    expect(stripValuationSessionCookie('a=1; hrwai_valuation_session=zzz; b=2')).toBe('a=1; b=2')
  })

  it('没有 Cookie 头返回 undefined；摘完一条不剩返回空串（让调用方显式覆盖成空头）', () => {
    expect(stripValuationSessionCookie(undefined)).toBeUndefined()
    expect(stripValuationSessionCookie('hrwai_valuation_session=zzz')).toBe('')
  })
})

describe('路径口径', () => {
  it('只有 /api/valuation 前缀算估值接口（查询串不影响判定）', () => {
    expect(isValuationApiPath('/api/valuation')).toBe(true)
    expect(isValuationApiPath('/api/valuation/evaluations?page=1')).toBe(true)
    expect(isValuationApiPath('/api/featured-contents')).toBe(false)
    expect(isValuationApiPath('/api/valuationx')).toBe(false)
    expect(isValuationApiPath('/__portal__/valuation/session')).toBe(false)
  })

  it('浏览器不得直达：auth/login、auth/logout、admin/*；其余估值端点放行', () => {
    expect(isBlockedValuationProxyPath('/api/valuation/auth/login')).toBe(true)
    expect(isBlockedValuationProxyPath('/api/valuation/auth/logout')).toBe(true)
    expect(isBlockedValuationProxyPath('/api/valuation/admin/brands')).toBe(true)
    expect(isBlockedValuationProxyPath('/api/valuation/admin/brands/1')).toBe(true)
    expect(isBlockedValuationProxyPath('/api/valuation/evaluations')).toBe(false)
    expect(isBlockedValuationProxyPath('/api/valuation/auth/me')).toBe(false)
  })
})

describe('续期时机', () => {
  const now = 1_700_000_000
  const withExp = (exp: number, refreshToken = 'refresh.payload.sig') => ({
    accessToken: jwtWithExp(exp),
    refreshToken
  })

  it('剩余寿命低于 skew 才续期', () => {
    expect(valuationSessionNeedsRefresh(withExp(now + 119), now, 120)).toBe(true)
    expect(valuationSessionNeedsRefresh(withExp(now + 121), now, 120)).toBe(false)
  })

  it('已过期的 access 也算要续期（隔夜回来第一次请求就换）', () => {
    expect(valuationSessionNeedsRefresh(withExp(now - 3600), now, 120)).toBe(true)
  })

  it('没有 refresh token 时不续期（没有可换的东西）', () => {
    expect(valuationSessionNeedsRefresh(withExp(now, ''), now, 120)).toBe(false)
  })

  it('解不出 exp 时不续期（宁可用到上游 401，也不在每次请求上轮换）', () => {
    expect(valuationSessionNeedsRefresh({ accessToken: 'opaque', refreshToken: 'r' }, now, 120)).toBe(false)
  })
})

describe('会话摘要', () => {
  it('只下发给页面非令牌字段', () => {
    const user = toSessionUser(session)
    expect(user).toEqual({ user_id: 7, account: 'u7', username: '张三', role: 'hrwai_user' })
    expect(JSON.stringify(user)).not.toContain(session.accessToken)
    expect(JSON.stringify(user)).not.toContain(session.refreshToken)
  })
})
