// sitemap 静态路由清单（纯数据，便于单测；不含后端动态文章）。
// 分类归档页与车型详情页都从登记表生成，新增条目不用再改这里。
import { featuredCategoryKeys } from '~/api/featured'
import { SHOWCASE_MODELS } from '~/utils/showcase/models'

export interface SitemapUrl {
  loc: string
  lastmod?: string
}

export const STATIC_URLS: SitemapUrl[] = [
  { loc: '/' },
  { loc: '/showcase' },
  ...SHOWCASE_MODELS.map((model) => ({ loc: `/showcase/${model.slug}` })),
  { loc: '/news' },
  ...featuredCategoryKeys.map((key) => ({ loc: `/news/${key}` }))
]
