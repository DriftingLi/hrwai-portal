// 请求上下文感知的估值 API（票 #32）：
// SSR 用 useRequestFetch 把原始请求头（含 httpOnly 会话 Cookie）带到本地 /api 调用，
// 客户端就是普通同源 $fetch —— 两条路径都经同一个 BFF，令牌只出现在服务端。
import { createValuationApi, type ValuationFetcher } from '~/api/valuation'

export function useValuationApi() {
  const requestFetch = useRequestFetch()

  const fetcher: ValuationFetcher = (path, init = {}) =>
    requestFetch<unknown>(path, {
      method: init.method ?? 'GET',
      ...(init.query ? { query: init.query } : {}),
      ...(init.body !== undefined ? { body: init.body } : {})
    })

  return createValuationApi(fetcher)
}
