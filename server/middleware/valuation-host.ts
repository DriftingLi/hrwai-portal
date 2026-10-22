// 残值子域的根路径重定向：valuation.hrwai.cn/ → /valuation。
// 判据在 utils/valuationHost.ts（纯函数，单测覆盖），这里只做 h3 的接线。
//
// 主机名取多路来源：Host 头（常规）与 X-Forwarded-Host（边缘/反代改写 Host 时）。
// 线上第一版只读 Host，结果 / 在 EdgeOne 后面一直 200 回官网首页——两手都判才稳。
import { defineEventHandler, getRequestHost, getRequestHeader, getRequestURL, sendRedirect } from 'h3'
import { valuationHostRedirect } from '../../utils/valuationHost'

export default defineEventHandler((event) => {
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
