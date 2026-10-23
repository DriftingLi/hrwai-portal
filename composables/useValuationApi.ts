// 请求上下文感知的估值 API（票 #32）：
// SSR 用 useRequestFetch 把原始请求头（含 httpOnly 会话 Cookie）带到本地 /api 调用，
// 客户端就是普通同源 $fetch —— 两条路径都经同一个 BFF，令牌只出现在服务端。
import { createValuationApi, type ValuationFetcher } from '~/api/valuation'

// 本适配层拿到的路径是运行时拼出来的（含动态 id），不参与 Nuxt typed routes 推导。
// Nuxt 4.6 起 typed $fetch 会按具体路由推导出 method（动态路径退化为只认 'get'），
// 直接传 requestFetch 会让 POST 调用报 TS2769；这里用本地签名把同一份实现接住，
// 保留 method/query/body 的静态约束，只放弃「按路由推导」这一层。
type PortalFetch = (
  path: string,
  opts?: { method: 'get' | 'post', query?: Record<string, unknown>, body?: unknown }
) => Promise<unknown>

export function useValuationApi() {
  const requestFetch = useRequestFetch() as unknown as PortalFetch

  const fetcher: ValuationFetcher = (path, init = {}) =>
    requestFetch(path, {
      // 数据层按 HTTP 惯例用大写 method，这里映射成 $fetch 接受的小写字面量。
      method: init.method === 'POST' ? 'post' : 'get',
      ...(init.query ? { query: init.query } : {}),
      ...(init.body !== undefined ? { body: init.body } : {})
    })

  return createValuationApi(fetcher)
}
