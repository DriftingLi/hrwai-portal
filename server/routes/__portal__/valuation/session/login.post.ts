// 估值登录（BFF，票 #32）：浏览器只提交账号密码；令牌由这里收进 httpOnly 会话 Cookie。
import { createError, readBody, setCookie } from 'h3'
import {
  VALUATION_SESSION_COOKIE,
  buildSessionCookieOptions,
  encodeValuationSession,
  toSessionUser,
  valuationSessionMaxAge
} from '../../../../utils/valuationSession'
import { ValuationUpstreamError, loginValuation } from '../../../../utils/valuationUpstream'
import { valuationCookieSecure, valuationUpstreamDeps } from '../../../../utils/valuationRuntime'

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event).catch(() => null)
  const account = typeof body?.account === 'string' ? body.account.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!account || !password) {
    throw createError({ statusCode: 400, statusMessage: '账号与密码不能为空' })
  }

  try {
    const session = await loginValuation(valuationUpstreamDeps(event), { account, password })
    setCookie(
      event,
      VALUATION_SESSION_COOKIE,
      encodeValuationSession(session),
      buildSessionCookieOptions({
        maxAge: valuationSessionMaxAge(session),
        secure: valuationCookieSecure(event)
      })
    )
    return { user: toSessionUser(session) }
  } catch (error) {
    if (error instanceof ValuationUpstreamError) {
      throw createError({ statusCode: error.status, statusMessage: error.message })
    }
    throw error
  }
})
