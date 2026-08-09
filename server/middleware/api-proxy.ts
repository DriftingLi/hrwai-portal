// 后端 API 与静态资源代理。
// SSR 与浏览器 hydration 共用同源路径：/api/** 与 /static/** 转发到后端内部地址
// （runtimeConfig.apiInternalBase，部署时经 NUXT_API_INTERNAL_BASE 覆盖）。
import { proxyRequest } from 'h3'

export default defineEventHandler(async (event) => {
  const path = event.path
  if (!path.startsWith('/api/') && !path.startsWith('/static/')) {
    return
  }
  const base = (useRuntimeConfig(event).apiInternalBase as string).replace(/\/$/, '')
  try {
    return await proxyRequest(event, base + path)
  } catch {
    // 后端不可达时返回 502，避免预渲染/页面因上游异常整体 500
    throw createError({
      statusCode: 502,
      statusMessage: '上游服务暂不可用',
      message: 'upstream unavailable'
    })
  }
})
