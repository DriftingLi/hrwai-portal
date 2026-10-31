// 三维展台车型登记表。
// 新增车型：往 SHOWCASE_MODELS 里追加一条，并把静态预览图放到 public/images/showcase/。
// 列表卡片、详情页与 sitemap 都从这里读取，不需要再改页面本身。
export interface ShowcaseSpec {
  label: string
  value: string
  unit?: string
}

export type ShowcaseViewer = 'forklift'

export interface ShowcaseModel {
  /** 路由片段：/showcase/<slug> */
  slug: string
  /** 卡片 / 详情页副标题使用的完整车型名 */
  name: string
  /** 详情页 H1 使用的短名 */
  shortName: string
  category: string
  summary: string
  description: string
  seoTitle: string
  seoDescription: string
  preview: string
  previewAlt: string
  cardSpecs: ShowcaseSpec[]
  detailSpecs: ShowcaseSpec[]
  viewer: ShowcaseViewer
}

export const SHOWCASE_MODELS: readonly ShowcaseModel[] = [
  {
    slug: 'explosion-proof-forklift',
    name: '防爆蓄电池叉车',
    shortName: '防爆叉车',
    category: '防爆叉车',
    summary: '1.5 吨级防爆蓄电池叉车，适用于爆炸性气体环境下的物料搬运作业。',
    description:
      '1.5 吨防爆蓄电池叉车，按实车比例程序化建模。拖拽旋转或切换预设视角，从各个方向核验车身曲面、护顶架与门架结构。',
    seoTitle: '防爆叉车三维展台',
    seoDescription:
      '1.5 吨防爆蓄电池叉车三维互动展台：按实车比例程序化建模，支持任意旋转、缩放与正面、侧面、前后 3/4、车尾等预设视角，用于核验车身比例与门架结构。',
    preview: '/images/showcase/explosion-proof-forklift-preview.webp',
    previewAlt: '防爆蓄电池叉车静态外观预览',
    cardSpecs: [
      { label: '额定载荷', value: '1,500', unit: 'kg' },
      { label: '防爆标志', value: 'Ex d IIB T4 Gb' }
    ],
    detailSpecs: [
      { label: '整车尺寸（长 × 宽，含货叉）', value: '3,720 × 1,250', unit: 'mm' },
      { label: '护顶架高', value: '2,140', unit: 'mm' },
      { label: '额定载荷', value: '1,500', unit: 'kg' },
      { label: '防爆标志', value: 'Ex d IIB T4 Gb' }
    ],
    viewer: 'forklift'
  }
]

export function findShowcaseModel(
  slug: string | string[] | undefined
): ShowcaseModel | undefined {
  const key = Array.isArray(slug) ? slug[0] : slug
  if (!key) return undefined
  return SHOWCASE_MODELS.find((model) => model.slug === key)
}
