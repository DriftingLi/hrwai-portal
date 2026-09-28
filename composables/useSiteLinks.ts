// 站点链接构造器：绑定 runtimeConfig.public 的站点地址与功能服务域根。
import { buildSubdomainUrl, buildSiteUrl } from '~/utils/siteUrl'

export function useSiteLinks() {
  const config = useRuntimeConfig()
  const siteBase = config.public.siteUrl as string
  // 功能服务域根：门户换域名后功能服务可能仍在原域，故独立配置（缺省跟随站点地址）
  const featureBase = (config.public.featureBase as string) || siteBase

  return {
    /** 功能子域链接（training. / valuation.）。
     * 客户端跳转以当前页协议为准（生产 https 下跨子域跳转保持 https，
     * 不依赖构建期配置的协议值）；SSR 侧沿用配置协议。 */
    subdomain: (sub: 'training' | 'valuation', path = '/') =>
      buildSubdomainUrl(
        sub,
        path,
        featureBase,
        import.meta.client ? (window.location.protocol as 'http:' | 'https:') : undefined
      ),
    /** 站点自身链接（canonical / OG / 内部跳转） */
    site: (path = '/') => buildSiteUrl(path, siteBase)
  }
}
