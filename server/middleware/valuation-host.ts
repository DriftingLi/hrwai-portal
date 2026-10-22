// 残值子域的根路径重定向：valuation.hrwai.cn/ → /valuation。
// 判据在 utils/valuationHost.ts（纯函数，单测覆盖），这里只做 h3 的接线。
import { getRequestHost, getRequestURL, sendRedirect } from 'h3'
import { valuationHostRedirect } from '../../utils/valuationHost'

export default defineEventHandler((event) => {
  const target = valuationHostRedirect(getRequestHost(event), getRequestURL(event).pathname)
  if (target) return sendRedirect(event, target, 302)
})