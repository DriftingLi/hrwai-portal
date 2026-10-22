// 估值会话续期（BFF 层，票 #32 遗留项）：access 快过期时在服务端轮换，并把新会话回写 Cookie。
//
// 挂载点有两个，缺一不可：
// - server/middleware/api-proxy.ts：/api/valuation/** 的每一次调用（浏览器侧取数、报告下载）；
// - server/routes/__portal__/valuation/session/index.get.ts：页面渲染时那次会话校验。
// 两个点都在「响应还没开始写」的时候动手，Cookie 一定带得出去；proxyRequest 只覆盖上游
// 真回了的响应头，估值接口的响应不带 set-cookie，所以早已设好的那枚不会被冲掉。
//
// 失败一律保留原会话。并发续期（同一枚 refresh 被两路同时用）时输的那一路会拿到 expired，
// 此刻若清 Cookie，用户就被自己的另一个请求踢下线了——所以只有上游亲自 401 才代表会话真的没了。
import type { H3Event } from 'h3'
import { setCookie } from 'h3'
import {
  VALUATION_SESSION_COOKIE,
  buildSessionCookieOptions,
  encodeValuationSession,
  readValuationSession,
  valuationSessionMaxAge,
  valuationSessionNeedsRefresh,
  type ValuationSession
} from './valuationSession'
import { rotateValuationTokens, type ValuationUpstreamDeps } from './valuationUpstream'

export interface EnsureFreshOptions {
  skewSeconds?: number
  nowSeconds?: number
  /** Cookie 的 Secure 属性（生产恒 true；dev http 放宽） */
  secure?: boolean
}

export interface EnsureFreshResult {
  session: ValuationSession | null
  rotated: boolean
}

/** 需要时续期并回写 Cookie；不需要续期时原样返回，不发任何上游请求 */
export async function ensureFreshValuationSession(
  event: H3Event,
  deps: ValuationUpstreamDeps,
  options: EnsureFreshOptions = {}
): Promise<EnsureFreshResult> {
  const session = readValuationSession(event)
  if (!session) return { session: null, rotated: false }
  if (!valuationSessionNeedsRefresh(session, options.nowSeconds, options.skewSeconds)) {
    return { session, rotated: false }
  }

  const outcome = await rotateValuationTokens(deps, session.refreshToken)
  if (!outcome.ok) return { session, rotated: false }

  const next: ValuationSession = {
    ...session,
    accessToken: outcome.accessToken,
    refreshToken: outcome.refreshToken
  }
  setCookie(
    event,
    VALUATION_SESSION_COOKIE,
    encodeValuationSession(next),
    buildSessionCookieOptions({
      maxAge: valuationSessionMaxAge(next),
      secure: options.secure ?? true
    })
  )
  return { session: next, rotated: true }
}
