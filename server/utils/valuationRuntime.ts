// 估值 BFF 的运行时装配（票 #32）：把 Nitro 的 runtimeConfig / 请求协议收成两处，
// 其余逻辑留在纯函数里（valuationSession / valuationUpstream / valuationProxy），便于单测。
import type { H3Event } from 'h3'
import { getRequestProtocol } from 'h3'
import { fetchUpstream, type ValuationUpstreamConfig } from './valuationUpstream'

/**
 * 会话 Cookie 的 Secure 策略：生产恒为 true；只有「dev 且当前请求是 http」才放宽，
 * 否则本机 http://localhost:3000 登录后浏览器存不下 Cookie，开发面直接不可用。
 */
export function valuationCookieSecure(event: H3Event): boolean {
  return !(import.meta.dev && getRequestProtocol(event) === 'http')
}

/** 从 runtimeConfig 取上游目标（与既有 /api 代理同一个 base 与回源 token） */
export function valuationUpstreamDeps(event: H3Event): {
  config: ValuationUpstreamConfig
  fetch: typeof fetchUpstream
} {
  const runtime = useRuntimeConfig(event)
  return {
    config: {
      base: String(runtime.apiInternalBase || ''),
      originToken: String(runtime.apiOriginToken || '')
    },
    fetch: fetchUpstream
  }
}
