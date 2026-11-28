import type { EvaluationRequest } from '~/api/valuation'
import type { DraftField, DraftFieldKey, DraftFields, DraftFieldStatus } from '~/utils/valuationConversation'

export const conversationUpstreamKeys = new Set<DraftFieldKey>([
  'brand', 'vehicle_type', 'series', 'tonnage', 'config_type', 'mast_type', 'province'
])

export function conversationDraftSummary(fields: DraftFields): string {
  const brand = fields.brand.value
  const tonnage = fields.tonnage.value
  const hours = fields.usage_hours.value
  if (brand === undefined && tonnage === undefined && hours === undefined) return '尚未填写车辆信息'
  return [brand, tonnage === undefined ? undefined : `${tonnage} 吨`, hours === undefined ? undefined : `${hours} 小时`]
    .filter((part) => part !== undefined).join(' · ')
}

export function countExplicitFields(fields: DraftFields, keys: ReadonlyArray<{ key: DraftFieldKey }>): number {
  return keys.filter(({ key }) => fields[key].status === 'value').length
}

export interface ConversationDictionarySource {
  brands: Array<{ name: string }>
  provinces: string[]
  conditionRatings: Array<{ rating: string; label: string }>
  vehicleTypes: string[]
  seriesOptions: Array<{ name: string }>
  tonnages: number[]
  configTypes: Array<{ name: string }>
  mastTypeOptions: Array<{ name: string }>
  mastHeightOptions: Array<{ value_mm: number }>
  cities: string[]
  factoryYearOptions: number[]
}

export function conversationDictionaryOptions(key: DraftFieldKey, source: ConversationDictionarySource): Array<string | number> {
  switch (key) {
    case 'brand': return source.brands.map((item) => item.name)
    case 'vehicle_type': return source.vehicleTypes
    case 'series': return source.seriesOptions.map((item) => item.name)
    case 'tonnage': return source.tonnages
    case 'config_type': return source.configTypes.map((item) => item.name)
    case 'mast_type': return source.mastTypeOptions.map((item) => item.name)
    case 'mast_height_mm': return source.mastHeightOptions.map((item) => item.value_mm)
    case 'factory_year':
    case 'sale_year': return source.factoryYearOptions
    case 'province': return source.provinces
    case 'city': return source.cities
    case 'condition_rating': return [...source.conditionRatings].sort((a, b) => a.rating.localeCompare(b.rating)).map((item) => item.rating)
    default: return []
  }
}

export function conversationOptionLabel(
  key: DraftFieldKey,
  option: string | number,
  conditionRatings: ConversationDictionarySource['conditionRatings']
): string {
  if (key === 'tonnage') return `${option} 吨`
  if (key === 'mast_height_mm') return option === 0 ? '无' : `${option} mm`
  if (key === 'factory_year' || key === 'sale_year') return `${option} 年`
  if (key === 'condition_rating') return conditionRatings.find((item) => item.rating === option)?.label ?? String(option)
  return String(option)
}

export const draftStatusLabels: Record<DraftFieldStatus, string> = {
  missing: '未提供',
  unknown: '明确未知',
  value: '已明确',
  range: '范围',
  candidate: '待确认候选'
}

export function formatConversationField(key: DraftFieldKey, current: DraftField): string {
  if (current.status === 'missing') return '未提供'
  if (current.status === 'unknown') return '明确未知'
  if (current.status === 'range') return `${current.min ?? '?'}–${current.max ?? '?'} 小时（范围）`
  if (current.status === 'candidate') return current.candidates?.length ? `待确认：${current.candidates.join(' / ')}` : '待确认候选'
  if (typeof current.value === 'boolean') return current.value ? '是' : '否'
  if (key === 'tonnage') return `${current.value} 吨`
  if (key === 'usage_hours') return `${current.value} 小时`
  if (key === 'mast_height_mm') return current.value === 0 ? '无' : `${current.value} mm`
  if (key === 'factory_year' || key === 'sale_year') return `${current.value} 年`
  return String(current.value ?? '')
}

export interface ValuationConversationField {
  key: DraftFieldKey
  label: string
  kind: 'text' | 'number' | 'boolean' | 'rating'
}

export const valuationConversationFieldGroups: Array<{
  title: string
  fields: ValuationConversationField[]
}> = [
  {
    title: '车辆与规格',
    fields: [
      { key: 'brand', label: '品牌', kind: 'text' },
      { key: 'vehicle_type', label: '车辆类型', kind: 'text' },
      { key: 'series', label: '系列', kind: 'text' },
      { key: 'tonnage', label: '吨位', kind: 'number' },
      { key: 'config_type', label: '配置类型', kind: 'text' },
      { key: 'mast_type', label: '门架类型', kind: 'text' },
      { key: 'mast_height_mm', label: '门架高度（mm）', kind: 'number' },
      { key: 'factory_year', label: '出厂年份', kind: 'number' }
    ]
  },
  {
    title: '使用与区域',
    fields: [
      { key: 'sale_year', label: '估价成交年份', kind: 'number' },
      { key: 'usage_hours', label: '累计工时', kind: 'number' },
      { key: 'province', label: '省份', kind: 'text' },
      { key: 'city', label: '城市', kind: 'text' }
    ]
  },
  {
    title: '车况与资料',
    fields: [
      { key: 'condition_rating', label: '车况评级', kind: 'rating' },
      { key: 'original_paint', label: '原厂原漆', kind: 'boolean' },
      { key: 'has_license_plate', label: '有车牌', kind: 'boolean' },
      { key: 'has_registration_certificate', label: '有特种设备登记证', kind: 'boolean' },
      { key: 'has_maintenance_records', label: '有保养记录', kind: 'boolean' }
    ]
  }
]

export const valuationConversationFields = valuationConversationFieldGroups.flatMap((group) => group.fields)

export const valuationConversationDemo: EvaluationRequest = {
  brand: '林德',
  vehicle_type: '电动平衡重式',
  series: 'E系列',
  tonnage: 2,
  config_type: '磷酸铁锂(LFP)',
  mast_type: '两级门架',
  mast_height_mm: 3000,
  factory_year: 2021,
  sale_year: new Date().getFullYear(),
  usage_hours: 4800,
  original_paint: true,
  province: '江苏',
  city: '苏州',
  has_license_plate: true,
  has_registration_certificate: false,
  has_maintenance_records: true,
  condition_rating: 'B'
}
