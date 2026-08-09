// 官网导航配置（门户自持，不再依赖 Vue SPA 的 navigation.ts）。
// 「内容精选」指向 /news 归档页（首页轮播仍保留，见 pages/index.vue）。
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
  { key: 'featured', label: '内容精选', path: '/news' },
  { key: 'contact', label: '加入我们', path: '/#footer' }
]
