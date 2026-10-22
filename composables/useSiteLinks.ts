// 站点链接构造器：绑定 runtimeConfig.public 的站点地址与功能服务域根。
import { buildServiceUrl, buildSiteUrl } from '~/utils/siteUrl'

export function useSiteLinks() {
  const config = useRuntimeConfig()
  const siteBase = config.public.siteUrl as string
  // 训练站与残值评估**分属两个域族**（易道 / 和润），各自独立配置。
  // 旧实现假定两者共用一个 featureBase，切换后会把残值链到易道域名下的旧 SPA。
  const trainingBase = config.public.trainingBase as string
  const valuationBase = config.public.valuationBase as string

  return {
    /** 训练/讲师等易道侧功能入口 */
    training: (path = '/') => buildServiceUrl(trainingBase, path),
    /** 残值评估入口（和润侧；当前是门户同域的 /valuation 路径） */
    valuation: (path = '/') => buildServiceUrl(valuationBase, path),
    /** 站点自身链接（canonical / OG / 内部跳转） */
    site: (path = '/') => buildSiteUrl(path, siteBase)
  }
}
