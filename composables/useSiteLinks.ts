// 站点链接构造器：绑定 runtimeConfig.public.siteUrl 的跨模块跳转链接。
import { buildSubdomainUrl, buildSiteUrl } from '~/utils/siteUrl'

export function useSiteLinks() {
  const config = useRuntimeConfig()
  const siteBase = config.public.siteUrl as string

  return {
    /** 功能子域链接（training. / valuation.） */
    subdomain: (sub: 'training' | 'valuation', path = '/') =>
      buildSubdomainUrl(sub, path, siteBase),
    /** 站点自身链接（canonical / OG / 内部跳转） */
    site: (path = '/') => buildSiteUrl(path, siteBase)
  }
}
