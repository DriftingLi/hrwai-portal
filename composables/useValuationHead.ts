// 估值页面的 head（票 #32）：/valuation/** 一律 noindex —— 动态评估页不该进搜索索引
// （服务端另经 nuxt.config 的 routeRules 输出 X-Robots-Tag，两层都在）。
export function useValuationHead(options: { title: string; description?: string }) {
  useSeoMeta({
    title: options.title,
    description:
      options.description ??
      '和润天下叉车残值评估：整机残值评估、电池 RUL 评估、历史评估记录与 PDF 报告下载。',
    robots: 'noindex, nofollow'
  })
}
