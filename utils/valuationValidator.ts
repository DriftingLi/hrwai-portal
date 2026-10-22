// 整机残值评估的前端校验（纯函数）：口径与旧 SPA frontend/src/utils/valuationValidator.ts
// 以及后端 model/evaluation.go 的 Validate() 逐条对齐——搬到门户仓后这三处不能各说各话。
// 拆出来是为了能单测：页面只负责把表单状态摊平成 ValidatableForm 再问结果。

const CURRENT_YEAR = new Date().getFullYear()

export interface ValidationResult {
  valid: boolean
  message?: string
}

/** 提交前的表单快照（未选 = undefined，与旧 SPA 的状态模型一致） */
export interface ValidatableForm {
  brand?: string
  vehicle_type?: string
  series?: string
  tonnage?: number
  config_type?: string
  mast_type?: string
  mast_height_mm?: number
  factory_year?: number
  sale_year?: number
  usage_hours?: number
  province?: string
  city?: string
  condition_rating?: string
}

function isNonEmpty(value: string | undefined | null): value is string {
  return !!value && value.trim().length > 0
}

function requiredString(value: string | undefined | null, label: string): ValidationResult {
  return isNonEmpty(value) ? { valid: true } : { valid: false, message: `请选择${label}` }
}

function tonnageCheck(value: number | undefined | null): ValidationResult {
  if (value == null || Number.isNaN(value)) return { valid: false, message: '请选择吨位' }
  if (value <= 0) return { valid: false, message: '吨位必须大于 0' }
  if (value > 100) return { valid: false, message: '吨位超出合理范围' }
  return { valid: true }
}

/** 门架高度允许 0（表示「无」） */
function mastHeightCheck(value: number | undefined | null): ValidationResult {
  if (value == null || Number.isNaN(value)) return { valid: false, message: '请选择门架高度' }
  if (value === 0) return { valid: true }
  if (value < 0) return { valid: false, message: '门架高度不能为负数' }
  if (value > 20000) return { valid: false, message: '门架高度超出合理范围' }
  return { valid: true }
}

function factoryYearCheck(value: number | undefined | null): ValidationResult {
  if (value == null) return { valid: false, message: '请填写出厂年份' }
  if (!Number.isInteger(value)) return { valid: false, message: '年份必须为整数' }
  if (value < 1900 || value > CURRENT_YEAR) {
    return { valid: false, message: `出厂年份应在 1900~${CURRENT_YEAR} 之间` }
  }
  return { valid: true }
}

function saleYearCheck(sale: number | undefined | null, factory: number | undefined | null): ValidationResult {
  if (sale == null) return { valid: false, message: '请填写成交年份' }
  if (!Number.isInteger(sale)) return { valid: false, message: '年份必须为整数' }
  if (factory != null && sale < factory) return { valid: false, message: '成交年份不能早于出厂年份' }
  if (sale > CURRENT_YEAR) return { valid: false, message: `成交年份不能晚于 ${CURRENT_YEAR}` }
  return { valid: true }
}

function usageHoursCheck(value: number | undefined | null): ValidationResult {
  if (value == null || Number.isNaN(value)) return { valid: false, message: '请填写累计使用工时' }
  if (value < 0) return { valid: false, message: '使用工时不能为负数' }
  if (value > 100000) return { valid: false, message: '使用工时超出合理范围' }
  return { valid: true }
}

function conditionRatingCheck(value: string | undefined | null): ValidationResult {
  if (!value || !['A', 'B', 'C', 'D', 'E'].includes(value)) {
    return { valid: false, message: '请选择车况评级' }
  }
  return { valid: true }
}

/**
 * 整体校验：按字段顺序返回第一个失败项（与旧 SPA 同一顺序——
 * 用户先看到的永远是最靠前的那个空，而不是随机一个）。
 */
export function validateEvaluationForm(form: ValidatableForm): ValidationResult {
  const checks: Array<() => ValidationResult> = [
    () => requiredString(form.brand, '品牌'),
    () => requiredString(form.vehicle_type, '车辆类型'),
    () => requiredString(form.series, '系列'),
    () => tonnageCheck(form.tonnage),
    () => requiredString(form.config_type, '配置类型'),
    () => requiredString(form.mast_type, '门架类型'),
    () => mastHeightCheck(form.mast_height_mm),
    () => factoryYearCheck(form.factory_year),
    () => saleYearCheck(form.sale_year, form.factory_year),
    () => usageHoursCheck(form.usage_hours),
    () => requiredString(form.province, '所在省份'),
    () => requiredString(form.city, '所在城市'),
    () => conditionRatingCheck(form.condition_rating)
  ]
  for (const check of checks) {
    const result = check()
    if (!result.valid) return result
  }
  return { valid: true }
}
