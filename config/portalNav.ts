// 官网导航配置（门户自持，不再依赖 Vue SPA 的 navigation.ts）。
// 「内容精选」指向首页区块锚点（滚动到内容精选板块），同时带一个下拉：
// 归档页 /news 在首页板块为空时没有入口，下拉里给「总览 + 各分类」一条点击路径。
import { featuredCategoryKeys, categoryLabel } from '~/api/featured'

export interface PortalNavChild {
  key: string
  label: string
  path: string
}

export interface PortalNavItem {
  key: string
  label: string
  path: string
  /** 悬停/聚焦时展开的子项（仅桌面端；移动端平铺展示） */
  children?: PortalNavChild[]
}

/** 内容精选下拉：总览（/news）+ 四个分类归档页 */
const featuredChildren: PortalNavChild[] = [
  { key: 'featured-all', label: '总览', path: '/news' },
  ...featuredCategoryKeys.map((key) => ({
    key: `featured-${key}`,
    label: categoryLabel(key),
    path: `/news/${key}`
  }))
]

export const portalNav: PortalNavItem[] = [
  { key: 'home', label: '首页', path: '/' },
  { key: 'about', label: '关于我们', path: '/#about' },
  { key: 'products', label: '核心服务', path: '/#products' },
  { key: 'cooperation', label: '合作模式', path: '/#cooperation' },
  { key: 'service', label: '服务保障', path: '/#service' },
  { key: 'featured', label: '内容精选', path: '/#featured', children: featuredChildren },
  { key: 'contact', label: '加入我们', path: '/#footer' }
]
