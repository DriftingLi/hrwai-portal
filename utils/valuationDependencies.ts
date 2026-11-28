/** 整机字典依赖图唯一真源：旧表单清空下游、对话草稿重验候选都使用这里。 */
export type ValuationDependencyKey =
  | 'brand' | 'vehicle_type' | 'series' | 'tonnage' | 'config_type'
  | 'mast_type' | 'mast_height_mm' | 'factory_year' | 'province' | 'city'

const DOWNSTREAM: Partial<Record<ValuationDependencyKey, ValuationDependencyKey[]>> = {
  brand: ['vehicle_type', 'series', 'tonnage', 'config_type', 'mast_type', 'mast_height_mm', 'factory_year'],
  vehicle_type: ['series', 'tonnage', 'config_type', 'mast_type', 'mast_height_mm', 'factory_year'],
  series: ['tonnage', 'config_type', 'mast_type', 'mast_height_mm', 'factory_year'],
  tonnage: ['config_type', 'mast_type', 'mast_height_mm', 'factory_year'],
  config_type: ['mast_type', 'mast_height_mm'],
  mast_type: ['mast_height_mm'],
  province: ['city']
}

export function downstreamValuationFields(key: string): ValuationDependencyKey[] {
  return DOWNSTREAM[key as ValuationDependencyKey] ?? []
}

export function dependentValuationFields(key: string): ValuationDependencyKey[] {
  return [...new Set(downstreamValuationFields(key).flatMap((child) => [child, ...dependentValuationFields(child)]))]
}
