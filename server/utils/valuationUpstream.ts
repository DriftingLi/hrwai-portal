// 估值上游调用（BFF 层，票 #32）：登录 / 登出 / 当前用户。
//
// 只用后端既有契约（FL 仓，不可改）：
// - POST /api/valuation/auth/login  {account,password} ⇒ {token,refresh_token,user_id,account,username,role}
// - POST /api/valuation/auth/logout {refresh_token}（Bearer 兜底）
// - GET  /api/valuation/auth/me     （需 Bearer）
// 本文件刻意不依赖 Nitro 全局（useRuntimeConfig 等）：路由负责取配置，这里只做
// 「给定输入 → 发出什么上游请求 / 得到什么会话」，因此可以被 vitest 直接测。
import { buildProxyHeaders } from './originToken'
import type { ValuationSession, ValuationSessionUser } from './valuationSession'

/** 上游目标（base 为 NUXT_API_INTERNAL_BASE，originToken 为 NUXT_API_ORIGIN_TOKEN） */
export interface ValuationUpstreamConfig {
  base: string
  originToken?: string
}

export interface UpstreamRequestInit {
  method: 'GET' | 'POST'
  headers: Record<string, string>
  body?: string
}

export interface UpstreamResponse {
  status: number
  json: unknown
}

/** 可注入的 fetch 形状（测试用假实现替换，生产用 fetchUpstream） */
export type ValuationUpstreamFetch = (url: string, init: UpstreamRequestInit) => Promise<UpstreamResponse>

/** 生产实现：读文本再解析，避免上游 204/非 JSON 时 json() 直接抛异常 */
export const fetchUpstream: ValuationUpstreamFetch = async (url, init) => {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) })
  const text = await res.text().catch(() => '')
  let json: unknown = null
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      json = null
    }
  }
  return { status: res.status, json }
}

/** 上游失败：status 直接映射到 BFF 响应状态码（401/503 原样，其余统一 502） */
export class ValuationUpstreamError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ValuationUpstreamError'
    this.status = status
  }
}

export interface ValuationUpstreamDeps {
  config: ValuationUpstreamConfig
  fetch: ValuationUpstreamFetch
}

/** 后端统一响应包装 {code,message,data}（code 200 为成功，与门户其它接口同口径） */
interface Envelope {
  code?: number
  message?: string
  data?: unknown
}

export function readEnvelope(json: unknown): Envelope | null {
  if (!json || typeof json !== 'object') return null
  return json as Envelope
}

export function resolveValuationUpstreamUrl(config: ValuationUpstreamConfig, path: string): string {
  const base = (config.base || '').replace(/\/$/, '')
  const suffix = path.startsWith('/') ? path : '/' + path
  return `${base}${suffix}`
}

/** 上游请求头：回源 token 与既有代理同一口径；有令牌时注入 Authorization: Bearer */
export function buildUpstreamHeaders(
  config: ValuationUpstreamConfig,
  accessToken?: string
): Record<string, string> {
  const headers: Record<string, string> = { accept: 'application/json' }
  const origin = buildProxyHeaders(config.originToken)
  if (origin) Object.assign(headers, origin)
  if (accessToken) headers.authorization = `Bearer ${accessToken}`
  return headers
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export interface ValuationLoginCredentials {
  account: string
  password: string
}

/**
 * 登录：调上游 /api/valuation/auth/login，把响应里的双令牌收进会话。
 * 上游错误按票面口径原样上抛（401 凭证错误 / 503 通道未装配），其余上游异常统一 502。
 */
export async function loginValuation(
  deps: ValuationUpstreamDeps,
  credentials: ValuationLoginCredentials
): Promise<ValuationSession> {
  const url = resolveValuationUpstreamUrl(deps.config, '/api/valuation/auth/login')
  let response: UpstreamResponse
  try {
    response = await deps.fetch(url, {
      method: 'POST',
      headers: { ...buildUpstreamHeaders(deps.config), 'content-type': 'application/json' },
      body: JSON.stringify({ account: credentials.account, password: credentials.password })
    })
  } catch {
    throw new ValuationUpstreamError(502, '估值服务暂不可用')
  }

  const envelope = readEnvelope(response.json)
  if (response.status !== 200 || !envelope || envelope.code !== 200) {
    // 与主站同口径：验密失败不区分「账号不存在」，避免账号枚举
    if (response.status === 401) {
      throw new ValuationUpstreamError(401, envelope?.message || '账号或密码错误')
    }
    if (response.status === 503) {
      throw new ValuationUpstreamError(503, envelope?.message || '估值登录通道暂不可用')
    }
    throw new ValuationUpstreamError(502, envelope?.message || '估值登录失败')
  }

  const data = (envelope.data ?? null) as Record<string, unknown> | null
  if (!data || typeof data !== 'object') {
    throw new ValuationUpstreamError(502, '估值登录响应格式错误')
  }
  const accessToken = asString(data.token)
  if (!accessToken) {
    throw new ValuationUpstreamError(502, '估值登录响应缺少令牌')
  }
  return {
    accessToken,
    refreshToken: asString(data.refresh_token),
    userId: asNumber(data.user_id),
    account: asString(data.account) || credentials.account,
    username: asString(data.username),
    role: asString(data.role) || 'hrwai_user'
  }
}

/**
 * 登出：吊销上游那支 refresh（需要 refresh token；没有就只清本地会话，由调用方留痕）。
 * 返回是否吊销成功——清 Cookie 不能因为吊销失败而中断（主站同口径）。
 */
export async function logoutValuation(
  deps: ValuationUpstreamDeps,
  session: Pick<ValuationSession, 'accessToken' | 'refreshToken'>
): Promise<boolean> {
  const url = resolveValuationUpstreamUrl(deps.config, '/api/valuation/auth/logout')
  try {
    const response = await deps.fetch(url, {
      method: 'POST',
      headers: { ...buildUpstreamHeaders(deps.config, session.accessToken), 'content-type': 'application/json' },
      body: JSON.stringify({ refresh_token: session.refreshToken })
    })
    return response.status >= 200 && response.status < 300
  } catch {
    return false
  }
}

/**
 * 当前用户：校验会话是否仍被上游认可。
 * 返回 null = 令牌已失效（上游 401，调用方应清 Cookie）；上游不可达则抛错，
 * 让调用方降级成「乐观视为已登录」，而不是把一次网络抖动当成登出。
 */
export async function fetchValuationMe(
  deps: ValuationUpstreamDeps,
  accessToken: string
): Promise<ValuationSessionUser | null> {
  const url = resolveValuationUpstreamUrl(deps.config, '/api/valuation/auth/me')
  let response: UpstreamResponse
  try {
    response = await deps.fetch(url, { method: 'GET', headers: buildUpstreamHeaders(deps.config, accessToken) })
  } catch {
    throw new ValuationUpstreamError(502, '估值服务暂不可用')
  }
  if (response.status === 401) return null
  const envelope = readEnvelope(response.json)
  if (response.status !== 200 || !envelope || envelope.code !== 200) {
    throw new ValuationUpstreamError(502, envelope?.message || '估值用户查询失败')
  }
  const data = (envelope.data ?? null) as Record<string, unknown> | null
  if (!data || typeof data !== 'object') {
    throw new ValuationUpstreamError(502, '估值用户响应格式错误')
  }
  return {
    user_id: asNumber(data.user_id),
    account: asString(data.account),
    username: asString(data.username),
    role: asString(data.role)
  }
}
