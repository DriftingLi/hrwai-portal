// 精选内容公开接口客户端（门户唯一数据访问 seam）。
// 页面组件不直接调用 $fetch，统一经本层取数；契约变更只影响本层测试。
import { $fetch } from 'ofetch'

/** 精选内容分类中文标签 */
export const featuredCategoryLabels: Record<string, string> = {
  company: '公司动态',
  industry: '行业新闻',
  product: '产品资讯',
  news: '政策法规'
}

/** 分类 key 列表（归档页路由 /news/[category] 用） */
export const featuredCategoryKeys = ['company', 'industry', 'product', 'news'] as const

/** 分类下拉选项（表单/页签用） */
export const featuredCategoryOptions = featuredCategoryKeys.map((key) => ({
  value: key,
  label: featuredCategoryLabels[key]
}))

/** 分类中文标签（未知分类回退「政策法规」，兼容旧 news 别名） */
export function categoryLabel(category: string): string {
  if (category === 'news') return '政策法规'
  return featuredCategoryLabels[category] || '政策法规'
}

/** 列表项（不含 content 正文，与后端 featuredToListDict 口径一致） */
export interface FeaturedContent {
  content_id: number
  title: string
  summary: string
  cover_image: string
  category: string
  category_label: string
  source: string
  status: number
  view_count: number
  sort_order: number
  created_at: string
  updated_at: string
  published_at?: string | null
}

/** 分页结果 */
export interface FeaturedPage {
  items: FeaturedContent[]
  page: number
  pages: number
  total: number
}

/** 详情（含正文 markdown + 相关资讯 + 上/下一篇） */
export interface FeaturedDetail extends FeaturedContent {
  content: string
  related?: FeaturedContent[]
  prev?: { content_id: number; title: string; category: string; published_at?: string | null } | null
  next?: { content_id: number; title: string; category: string; published_at?: string | null } | null
}

/** 列表参数 */
export interface FeaturedListParams {
  page?: number
  page_size?: number
  category?: string
  sort?: 'latest' | 'hot'
}

/** 后端统一响应包装：{ code, message, data } */
export interface Wrapped<T> {
  code: number
  message: string
  data: T
}

/** 解包后端统一响应结构（code=200 成功） */
async function unwrap<T>(promise: Promise<Wrapped<T>>): Promise<T> {
  const res = await promise
  return res.data
}

/**
 * baseURL 说明：
 * 客户端默认相对路径（同源 /api，走代理中间件）；SSR 端需显式传入请求 origin
 * （相对路径无法在 SSR fetch 中解析），由 useFeaturedApi composable 绑定。
 */
export const featuredApi = {
  /** 公开列表（仅已发布） */
  getPublicList(params: FeaturedListParams = {}, baseURL?: string) {
    return unwrap(
      $fetch<Wrapped<FeaturedPage>>('/api/featured-contents', {
        query: params,
        ...(baseURL ? { baseURL } : {})
      })
    )
  },

  /**
   * 公开详情。
   * noView=true（SSR/爬虫路径）时带 no_view=1，后端不计阅读量；
   * 真实浏览器请调用 incrementView 计数。
   */
  getPublicDetail(id: number, noView = true, baseURL?: string) {
    return unwrap(
      $fetch<Wrapped<FeaturedDetail>>(`/api/featured-content/${id}`, {
        query: noView ? { no_view: 1 } : undefined,
        ...(baseURL ? { baseURL } : {})
      })
    )
  },

  /** 客户端阅读量计数（hydration 后由真实浏览器调用） */
  incrementView(id: number, baseURL?: string) {
    return unwrap(
      $fetch<Wrapped<{ content_id: number; view_count: number }>>(
        `/api/featured-content/${id}/view`,
        { method: 'POST', ...(baseURL ? { baseURL } : {}) }
      )
    )
  }
}
