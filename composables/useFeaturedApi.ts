// 请求上下文感知的精选内容 API：
// SSR 端直连后端内部地址（apiInternalBase，与 sitemap 数据源同模式，无 origin/端口依赖）；
// 客户端保持同源相对路径，经 /api 代理中间件转发后端。
import { featuredApi } from '~/api/featured'

export function useFeaturedApi() {
  const config = useRuntimeConfig()
  const baseURL = import.meta.server
    ? (config.apiInternalBase as string).replace(/\/$/, '')
    : undefined

  return {
    getPublicList: (params?: Parameters<typeof featuredApi.getPublicList>[0]) =>
      featuredApi.getPublicList(params, baseURL),
    getPublicDetail: (id: number, noView = true) => featuredApi.getPublicDetail(id, noView, baseURL),
    incrementView: (id: number) => featuredApi.incrementView(id, baseURL)
  }
}
