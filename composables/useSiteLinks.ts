// 站点链接构造器：绑定 runtimeConfig.public.siteUrl 的跨模块跳转链接。
import { buildSubdomainUrl, buildSiteUrl } from '~/utils/siteUrl'

export function useSiteLinks() {
  const config = useRuntimeConfig()
  const siteBase = config.public.siteUrl as string

  return {
    /** 功能子域链接（training. / valuation.）。
     * 客户端跳转以当前页协议为准（生产 https 下跨子域跳转保持 https，
     * 不依赖构建期 PORTAL_SITE_URL 的协议值）；SSR 侧沿用站点配置协议。 */
    subdomain: (sub: 'training' | 'valuation', path = '/') =>
      buildSubdomainUrl(
        sub,
        path,
        siteBase,
        import.meta.client ? (window.location.protocol as 'http:' | 'https:') : undefined
      ),
    /** 站点自身链接（canonical / OG / 内部跳转） */
    site: (path = '/') => buildSiteUrl(path, siteBase)
  }
}
