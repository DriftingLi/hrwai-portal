// 后端 API 与静态资源代理。
// SSR 与浏览器 hydration 共用同源路径：/api/** 与 /static/** 转发到后端内部地址
// （runtimeConfig.apiInternalBase，部署时经 NUXT_API_INTERNAL_BASE 覆盖）。
//
// 回源鉴权（票 FL#1746）：源站 nginx 只有在 X-Origin-Token 命中时才采信 EdgeOne 传来的
// EO-Connecting-IP（真实客户端 IP）；否则退回「按边缘节点取 IP」。token 走部署环境变量
// （NUXT_API_ORIGIN_TOKEN），**不入仓**（本仓库是公开仓）。
//
// 估值会话（票 #32）：浏览器不持有估值令牌，只持有 httpOnly 会话 Cookie。代理在转发
// /api/valuation/** 时从该 Cookie 取出 access token 注入 Authorization: Bearer，并把会话
// Cookie 从转发头里摘掉（它就是可用的令牌，上游不需要）。凭证策略单点在
// server/utils/valuationProxy.ts，本文件只做装配。
import { createError, getRequestHeader, proxyRequest } from 'h3'
import { isBlockedValuationProxyPath, isValuationApiPath, readValuationSession } from '../utils/valuationSession'
import { planValuationProxy } from '../utils/valuationProxy'
import { ensureFreshValuationSession } from '../utils/valuationRefresh'
import { valuationCookieSecure, valuationUpstreamDeps } from '../utils/valuationRuntime'

export default defineEventHandler(async (event) => {
  const path = event.path
  if (!path.startsWith('/api/') && !path.startsWith('/static/')) {
    return
  }

  // 浏览器不得直达的估值路径（票 #32）：/auth/login 会签发令牌，直达即把令牌交给浏览器；
  // /admin/* 属易道管理后台，本仓不引用。挡在代理层，而不是只靠「页面别写错」。
  if (isBlockedValuationProxyPath(path)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const config = useRuntimeConfig(event)
  const base = (config.apiInternalBase as string).replace(/\/$/, '')

  // 估值路径：access 快过期就先在服务端轮换（新会话回写 Cookie，浏览器仍然只持有一枚不透明串）。
  // 必须发生在 proxyRequest 之前——那时响应头还没写，Cookie 一定带得出去。
  let session = readValuationSession(event)
  if (isValuationApiPath(path) && session) {
    session = (
      await ensureFreshValuationSession(event, valuationUpstreamDeps(event), {
        secure: valuationCookieSecure(event)
      })
    ).session
  }

  const plan = planValuationProxy({
    path,
    originToken: config.apiOriginToken as string,
    cookieHeader: getRequestHeader(event, 'cookie'),
    session
  })

  // 抹掉浏览器不该自带的头：回源 token 只能来自部署环境变量；估值路径的 Authorization
  // 只能来自服务端会话（否则「浏览器不接触令牌」能被一条手写请求绕过）。
  for (const name of plan.dropRequestHeaders) {
    delete event.node.req.headers[name]
  }

  try {
    return await proxyRequest(event, base + path, {
      headers: Object.keys(plan.headers).length ? plan.headers : undefined
    })
  } catch {
    // 后端不可达时返回 502，避免预渲染/页面因上游异常整体 500
    throw createError({
      statusCode: 502,
      statusMessage: '上游服务暂不可用',
      message: 'upstream unavailable'
    })
  }
})
