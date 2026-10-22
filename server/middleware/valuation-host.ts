// 残值子域的根路径重定向：valuation.hrwai.cn/ → /valuation。
// 判据在 utils/valuationHost.ts（纯函数，单测覆盖），这里只做 h3 的接线。
//
// 主机名按「边缘自报 → 代理链 → 直连」的顺序取。第一版只读 Host，/ 一直回 200；
// 探针实测发现 EdgeOne Pages 把 Host 改写成了内部域名（x-forwarded-host 根本没有），
// 真实域名在 eo-pages-host 里——所以这一步不能省。
import { defineEventHandler, getRequestHeader, getRequestHost, getRequestURL, sendRedirect } from 'h3'
import { EDGE_HOST_HEADERS, valuationHostRedirect } from '../../utils/valuationHost'

/** 主机名候选，按可信度从高到低（边缘自报的那个才是用户看到的域名） */
export function hostCandidates(event: Parameters<typeof getRequestHost>[0]): string[] {
  const candidates: string[] = []
  for (const name of EDGE_HOST_HEADERS) {
    const value = getRequestHeader(event, name)
    if (value) candidates.push(value)
  }
  candidates.push(getRequestHost(event, { xForwardedHost: true }), getRequestHost(event))
  return candidates
}

export default defineEventHandler((event) => {
  const pathname = getRequestURL(event).pathname
  for (const host of hostCandidates(event)) {
    const target = valuationHostRedirect(host, pathname)
    if (target) return sendRedirect(event, target, 302)
  }
})
