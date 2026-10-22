// 残值子域的根路径重定向：valuation.hrwai.cn/ → /valuation。
// 判据在 utils/valuationHost.ts（纯函数，单测覆盖），这里只做 h3 的接线。
//
// 主机名取多路来源：Host 头（常规）与 X-Forwarded-Host（边缘/反代改写 Host 时）。
// 线上第一版只读 Host，结果 / 在 EdgeOne 后面一直 200 回官网首页——两手都判才稳。
import { defineEventHandler, getQuery, getRequestHeader, getRequestHost, getRequestURL, sendRedirect } from 'h3'
import { valuationHostRedirect } from '../../utils/valuationHost'

/** 诊断探针（临时）：带 ?__hostprobe=1 时把「边缘给了哪些主机线索」原样回出来 */
function hostProbe(event: Parameters<typeof getRequestHost>[0]) {
  const picked: Record<string, string> = {}
  for (const [name, value] of Object.entries(event.node.req.headers)) {
    if (!/host|forward|orig|eo-|real-ip|via|server|x-nws/i.test(name)) continue
    picked[name] = Array.isArray(value) ? value.join(',') : String(value ?? '')
  }
  return {
    picked,
    host: getRequestHost(event),
    hostWithXfh: getRequestHost(event, { xForwardedHost: true }),
    url: getRequestURL(event).href
  }
}

export default defineEventHandler((event) => {
  if (getQuery(event).__hostprobe === '1') return hostProbe(event)

  const pathname = getRequestURL(event).pathname
  const candidates = [
    getRequestHost(event, { xForwardedHost: true }),
    getRequestHost(event),
    getRequestHeader(event, 'x-forwarded-host')
  ]
  for (const host of candidates) {
    const target = valuationHostRedirect(host, pathname)
    if (target) return sendRedirect(event, target, 302)
  }
})
