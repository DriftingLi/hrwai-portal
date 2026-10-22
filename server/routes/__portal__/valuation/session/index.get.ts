// 当前估值会话（BFF，票 #32）：页面用它决定「登录 / 已登录 / 显示账号」。
// 不返回任何令牌，只返回可下发的会话摘要。
import { deleteCookie } from 'h3'
import {
  VALUATION_SESSION_COOKIE,
  buildClearedSessionCookieOptions,
  toSessionUser
} from '../../../../utils/valuationSession'
import { fetchValuationMe } from '../../../../utils/valuationUpstream'
import { ensureFreshValuationSession } from '../../../../utils/valuationRefresh'
import { valuationCookieSecure, valuationUpstreamDeps } from '../../../../utils/valuationRuntime'

export default defineEventHandler(async (event) => {
  // 页面渲染时的那一次会话校验也是续期时机：access 快过期就在这里轮换，
  // 免得「打开页面还是登录态，点进历史页却 401」。
  const { session } = await ensureFreshValuationSession(event, valuationUpstreamDeps(event), {
    secure: valuationCookieSecure(event)
  })
  if (!session) return { user: null }

  try {
    const user = await fetchValuationMe(valuationUpstreamDeps(event), session.accessToken)
    if (!user) {
      // 上游 401：Cookie 里的令牌已经不可用，顺手清掉，避免下次再走一遍
      deleteCookie(
        event,
        VALUATION_SESSION_COOKIE,
        buildClearedSessionCookieOptions(valuationCookieSecure(event))
      )
      return { user: null }
    }
    return { user }
  } catch {
    // 上游不可达：乐观保留登录态（把网络抖动当登出会让人莫名丢会话）
    return { user: toSessionUser(session) }
  }
})
