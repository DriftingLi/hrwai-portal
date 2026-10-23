// 官网导航配置（门户自持，不再依赖 Vue SPA 的 navigation.ts）。
// 「内容精选」与其它项一致指向首页区块锚点（/news 归档页仍可直接访问）。
export interface PortalNavItem {
  key: string
  label: string
  path: string
}

export const portalNav: PortalNavItem[] = [
  { key: 'home', label: '首页', path: '/' },
  { key: 'about', label: '关于我们', path: '/#about' },
  { key: 'products', label: '核心服务', path: '/#products' },
  { key: 'cooperation', label: '合作模式', path: '/#cooperation' },
  { key: 'service', label: '服务保障', path: '/#service' },
  { key: 'featured', label: '内容精选', path: '/#featured' },
  { key: 'contact', label: '加入我们', path: '/#footer' }
]
