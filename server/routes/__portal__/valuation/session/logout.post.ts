// 估值登出（BFF，票 #32）：先清本域 Cookie，再尽力吊销上游那支 refresh。
// 没有 refresh（或上游吊销失败）只留日志——登出不能因为上游异常而「反悔」。
import { deleteCookie } from 'h3'
import {
  VALUATION_SESSION_COOKIE,
  buildClearedSessionCookieOptions,
  readValuationSession
} from '../../../../utils/valuationSession'
import { logoutValuation } from '../../../../utils/valuationUpstream'
import { valuationCookieSecure, valuationUpstreamDeps } from '../../../../utils/valuationRuntime'

export default defineEventHandler(async (event) => {
  const session = readValuationSession(event)
  deleteCookie(
    event,
    VALUATION_SESSION_COOKIE,
    buildClearedSessionCookieOptions(valuationCookieSecure(event))
  )

  if (!session) return { ok: true, revoked: false }
  if (!session.refreshToken) {
    console.warn('[valuation] 会话里没有 refresh token，登出只清本地会话')
    return { ok: true, revoked: false }
  }

  const revoked = await logoutValuation(valuationUpstreamDeps(event), session)
  if (!revoked) {
    console.warn('[valuation] 上游登出失败，本地会话已清除')
  }
  return { ok: true, revoked }
})
