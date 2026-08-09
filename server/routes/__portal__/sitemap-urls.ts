// sitemap 数据源：静态路由 + 全部已发布精选内容（经公开列表接口分页拉取）。
// 构建期由 @nuxtjs/sitemap 调用；后端不可达时降级为静态路由，不阻断构建。
import { $fetch } from 'ofetch'
import type { Wrapped } from '~/api/featured'

interface SitemapUrl {
  loc: string
  lastmod?: string
}

// 公开列表接口的 data 形状
interface FeaturedListData {
  items: Array<{ content_id: number; published_at?: string | null }>
  total: number
}

const STATIC_URLS: SitemapUrl[] = [
  { loc: '/' },
  { loc: '/dispatch' },
  { loc: '/news' },
  { loc: '/news/company' },
  { loc: '/news/industry' },
  { loc: '/news/product' },
  { loc: '/news/news' }
]

export default defineEventHandler(async (event) => {
  const base = (useRuntimeConfig(event).apiInternalBase as string).replace(/\/$/, '')
  const urls: SitemapUrl[] = [...STATIC_URLS]

  try {
    // 分页拉取全部已发布内容（与公开列表接口口径一致）
    const pageSize = 100
    const first = await $fetch<Wrapped<FeaturedListData>>(`${base}/api/featured-contents`, {
      query: { page: 1, page_size: pageSize }
    })
    const total = Number(first?.data?.total) || 0
    const pages = Math.max(1, Math.ceil(total / pageSize))
    for (let page = 1; page <= pages; page++) {
      const data =
        page === 1
          ? first.data
          : await $fetch<Wrapped<FeaturedListData>>(`${base}/api/featured-contents`, {
              query: { page, page_size: pageSize }
            }).then((r) => r.data)
      for (const item of data.items) {
        urls.push({
          loc: `/content/${item.content_id}`,
          ...(item.published_at ? { lastmod: item.published_at.slice(0, 10) } : {})
        })
      }
    }
  } catch {
    // 后端不可达：仅输出静态路由
  }

  return urls
})
