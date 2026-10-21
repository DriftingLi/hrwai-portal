// 后端 API 与静态资源代理。
// SSR 与浏览器 hydration 共用同源路径：/api/** 与 /static/** 转发到后端内部地址
// （runtimeConfig.apiInternalBase，部署时经 NUXT_API_INTERNAL_BASE 覆盖）。
//
// 回源鉴权（票 FL#1746）：源站 nginx 只有在 X-Origin-Token 命中时才采信 EdgeOne 传来的
// EO-Connecting-IP（真实客户端 IP）；否则退回「按边缘节点取 IP」。token 走部署环境变量
// （NUXT_API_ORIGIN_TOKEN），**不入仓**（本仓库是公开仓）。
import { proxyRequest } from 'h3'
import { buildProxyHeaders } from '../utils/originToken'

export default defineEventHandler(async (event) => {
  const path = event.path
  if (!path.startsWith('/api/') && !path.startsWith('/static/')) {
    return
  }
  const config = useRuntimeConfig(event)
  const base = (config.apiInternalBase as string).replace(/\/$/, '')
  try {
    return await proxyRequest(event, base + path, {
      headers: buildProxyHeaders(config.apiOriginToken as string)
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
