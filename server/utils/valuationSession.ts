// 估值会话（BFF 层，票 #32）：令牌只落在 Nuxt 服务端。
//
// 为什么令牌进 httpOnly Cookie 而不是浏览器内存：localStorage / 页面变量都能被脚本读到，
// 而估值令牌带 aud=valuation —— 它一旦落到浏览器，「会话边界独立」就退化成「前端自己擦」。
// 这里把 access + refresh 封进本域会话 Cookie（httpOnly / Secure / SameSite=Lax / Path=/，
// **不设 Domain**，因此不会漏到父域），浏览器只持有一段不透明串；Authorization: Bearer
// 由服务端在代理时注入（server/middleware/api-proxy.ts）。
//
// 有效期与 access token 的 exp 对齐（后端默认 2h）：refresh 的自动续期要在服务端轮换并回写
// Cookie，是独立决定，本票不做（见 PR「未覆盖」），因此这里不让 Cookie 活得比 access 更久。
import type { H3Event } from 'h3'
import { getCookie } from 'h3'

/** 会话 Cookie 名（本域、无 Domain 属性；母域 hrwai.cn 看不到它） */
export const VALUATION_SESSION_COOKIE = 'hrwai_valuation_session'

/** access token 解不出 exp 时的兜底有效期（与后端 JWT_EXPIRES_HOURS 缺省 2h 一致） */
export const VALUATION_SESSION_FALLBACK_TTL = 2 * 60 * 60

/** 服务端持有的估值会话（浏览器永远看不到这些字段） */
export interface ValuationSession {
  accessToken: string
  refreshToken: string
  userId: number
  account: string
  username: string
  role: string
}

/** 可下发给页面的会话摘要（无令牌） */
export interface ValuationSessionUser {
  user_id: number
  account: string
  username: string
  role: string
}

/** 会话 Cookie 属性（严格对齐票面：httpOnly + Secure + SameSite=Lax + Path=/，无 Domain） */
export interface ValuationSessionCookieOptions {
  httpOnly: true
  secure: boolean
  sameSite: 'lax'
  path: '/'
  maxAge: number
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

/** 会话 → Cookie 值（base64url JSON；只做编码，不做加密——内容仍受 httpOnly 保护） */
export function encodeValuationSession(session: ValuationSession): string {
  const payload: ValuationSession = {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    userId: session.userId,
    account: session.account,
    username: session.username,
    role: session.role
  }
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

/** Cookie 值 → 会话；结构不完整或损坏时返回 null（当作未登录，不让坏 Cookie 变成 500） */
export function decodeValuationSession(raw: string | null | undefined): ValuationSession | null {
  const value = nonEmptyString(raw)
  if (!value) return null
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
    if (!parsed || typeof parsed !== 'object') return null
    const record = parsed as Record<string, unknown>
    const accessToken = nonEmptyString(record.accessToken)
    const refreshToken = nonEmptyString(record.refreshToken)
    const account = nonEmptyString(record.account)
    const role = nonEmptyString(record.role)
    if (!accessToken || !account || !role) return null
    const userId = typeof record.userId === 'number' && Number.isFinite(record.userId) ? record.userId : 0
    return {
      accessToken,
      refreshToken: refreshToken ?? '',
      userId,
      account,
      username: nonEmptyString(record.username) ?? '',
      role
    }
  } catch {
    return null
  }
}

/** 从请求里读会话（中间件与 BFF 路由共用这一处） */
export function readValuationSession(event: H3Event): ValuationSession | null {
  return decodeValuationSession(getCookie(event, VALUATION_SESSION_COOKIE))
}

/** 解析 JWT 的 exp（只解码不验签：签名校验在上游，这里只用来定 Cookie 寿命） */
export function accessTokenExpirySeconds(token: string): number | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const payloadPart = parts[1]
  if (!payloadPart) return null
  try {
    const payload: unknown = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'))
    if (!payload || typeof payload !== 'object') return null
    const exp = (payload as Record<string, unknown>).exp
    return typeof exp === 'number' && Number.isFinite(exp) ? exp : null
  } catch {
    return null
  }
}

/** Cookie 寿命：与 access token exp 对齐；解不出 exp 时用兜底值，最短 60s */
export function valuationSessionMaxAge(
  session: ValuationSession,
  nowSeconds = Math.floor(Date.now() / 1000)
): number {
  const exp = accessTokenExpirySeconds(session.accessToken)
  if (exp === null) return VALUATION_SESSION_FALLBACK_TTL
  const remaining = exp - nowSeconds
  return remaining > 60 ? remaining : VALUATION_SESSION_FALLBACK_TTL
}

/** 下发会话用的 Cookie 属性 */
export function buildSessionCookieOptions(policy: {
  maxAge: number
  secure: boolean
}): ValuationSessionCookieOptions {
  return {
    httpOnly: true,
    secure: policy.secure,
    sameSite: 'lax',
    path: '/',
    maxAge: policy.maxAge
  }
}

/** 清除会话用的 Cookie 属性（maxAge=0；属性必须与下发时一致才删得掉） */
export function buildClearedSessionCookieOptions(secure: boolean): ValuationSessionCookieOptions {
  return { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 0 }
}

/** 会话摘要（页面只拿这个；令牌不出服务端） */
export function toSessionUser(session: ValuationSession): ValuationSessionUser {
  return {
    user_id: session.userId,
    account: session.account,
    username: session.username,
    role: session.role
  }
}

/**
 * 从 Cookie 头里摘掉本期会话 Cookie（其余 Cookie 原样保留）。
 * 为什么必须摘：代理会把请求头一起转给上游，会话串里就是可用的令牌 —— 上游不需要它。
 * 返回 undefined 表示原请求没有 Cookie 头；返回空串表示摘完一条不剩（调用方要显式覆盖成空）。
 */
export function stripValuationSessionCookie(cookieHeader: string | undefined): string | undefined {
  if (cookieHeader === undefined) return undefined
  const kept = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .filter((part) => part.split('=')[0]?.trim() !== VALUATION_SESSION_COOKIE)
  return kept.join('; ')
}

/** 是否走估值接口前缀（只有这组前缀才注入 Bearer；别的 /api 不该看到估值令牌） */
export function isValuationApiPath(path: string): boolean {
  const clean = path.split('?')[0] ?? path
  return clean === '/api/valuation' || clean.startsWith('/api/valuation/')
}

/**
 * 浏览器不得直达的估值路径（代理层返回 404）：
 * - /auth/login 会签发令牌，直达就等于把令牌交给浏览器；
 * - /auth/logout 由 BFF 统一处理（要 refresh token）；
 * - /admin/* 是易道管理后台的接口，本仓不引用（票面决策补充），一并挡在门外。
 */
export function isBlockedValuationProxyPath(path: string): boolean {
  const clean = path.split('?')[0] ?? path
  if (clean === '/api/valuation/auth/login' || clean === '/api/valuation/auth/logout') return true
  return clean.startsWith('/api/valuation/admin/')
}
