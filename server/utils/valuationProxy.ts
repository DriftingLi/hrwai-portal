// 代理头的估值策略（票 #32）：把「哪些请求头该注入/该抹掉」从中间件里拿出来单点，
// 这样 /api 代理的行为可以被 vitest 直接断言，而不是只能靠读中间件。
//
// 四条口径：
// 1. 只有 /api/valuation/** 才注入 Bearer —— 估值令牌不该出现在其它上游接口上；
// 2. 估值路径上浏览器自带的 Authorization 一律抹掉：凭证的唯一来源是服务端会话，
//    否则「浏览器侧不接触令牌」可以被一条手写请求绕过；
// 3. 会话 Cookie 不能转给上游（它就是可用的令牌），其余 Cookie 原样保留；
// 4. 浏览器 Origin 一律抹掉：BFF 到后端是服务端到服务端，上游请求的来源是本服务，
//    而非浏览器。若原样透传，估值域经回源域名访问后端时 Origin≠Host，会被后端 CORS
//    当成跨域请求查白名单，和润域不在名单里 → 403（gin-contrib/cors AbortWithStatus）。
//    抹掉后后端 CORS 直接放行，走正常鉴权，且不必扩大后端 CORS 面。
import { buildProxyHeaders } from './originToken'
import { isValuationApiPath, stripValuationSessionCookie, type ValuationSession } from './valuationSession'

export interface ValuationProxyInput {
  path: string
  originToken?: string
  /** 原始的 Cookie 请求头（可能 undefined） */
  cookieHeader?: string
  session: ValuationSession | null
}

export interface ValuationProxyPlan {
  /** 要补到上游请求上的头（可为空对象） */
  headers: Record<string, string>
  /** 要从转发请求里删除的请求头（小写名） */
  dropRequestHeaders: string[]
}

export function planValuationProxy(input: ValuationProxyInput): ValuationProxyPlan {
  const headers: Record<string, string> = {}
  const dropRequestHeaders = ['x-origin-token', 'origin']

  const origin = buildProxyHeaders(input.originToken)
  if (origin) Object.assign(headers, origin)

  if (isValuationApiPath(input.path)) {
    // 浏览器永远不被采信为估值凭证来源
    dropRequestHeaders.push('authorization')
    if (input.session) {
      headers.authorization = `Bearer ${input.session.accessToken}`
    }
    const stripped = stripValuationSessionCookie(input.cookieHeader)
    // 显式覆盖成空串：只摘掉会话 Cookie 后若一条不剩，也要让上游收不到原始头
    if (stripped !== undefined) headers.cookie = stripped
  }

  return { headers, dropRequestHeaders }
}
