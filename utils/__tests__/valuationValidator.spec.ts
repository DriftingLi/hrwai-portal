// 校验口径单测：与旧 SPA / 后端 Validate() 对齐的那几条硬规则，改了必须红。
import { describe, it, expect } from 'vitest'
import { validateEvaluationForm, type ValidatableForm } from '../valuationValidator'

const currentYear = new Date().getFullYear()

const base: ValidatableForm = {
  brand: '合力',
  vehicle_type: '平衡重式叉车',
  series: 'H2000',
  tonnage: 3,
  config_type: '手波/国产发动机',
  mast_type: '二级门架',
  mast_height_mm: 3000,
  factory_year: 2019,
  sale_year: currentYear,
  usage_hours: 5000,
  province: '广东省',
  city: '广州市',
  condition_rating: 'B'
}

describe('validateEvaluationForm', () => {
  it('完整表单通过', () => {
    expect(validateEvaluationForm(base)).toEqual({ valid: true })
  })

  it('按字段顺序返回第一个失败项', () => {
    expect(validateEvaluationForm({ ...base, brand: undefined }).message).toBe('请选择品牌')
    expect(validateEvaluationForm({ ...base, brand: undefined, series: '' }).message).toBe('请选择品牌')
  })

  it('门架高度 0 表示「无」，合法', () => {
    expect(validateEvaluationForm({ ...base, mast_height_mm: 0 })).toEqual({ valid: true })
  })

  it('吨位为 0 视为未选，不是「0 吨」', () => {
    expect(validateEvaluationForm({ ...base, tonnage: 0 }).message).toBe('吨位必须大于 0')
    expect(validateEvaluationForm({ ...base, tonnage: undefined }).message).toBe('请选择吨位')
  })

  it('出厂年份不能晚于今年，成交年份不能早于出厂年份', () => {
    expect(validateEvaluationForm({ ...base, factory_year: currentYear + 1 }).message).toBe(
      `出厂年份应在 1900~${currentYear} 之间`
    )
    expect(validateEvaluationForm({ ...base, factory_year: 2020, sale_year: 2019 }).message).toBe(
      '成交年份不能早于出厂年份'
    )
  })

  it('工时上限 100000', () => {
    expect(validateEvaluationForm({ ...base, usage_hours: -1 }).message).toBe('使用工时不能为负数')
    expect(validateEvaluationForm({ ...base, usage_hours: 100001 }).message).toBe('使用工时超出合理范围')
  })

  it('车况评级只认 A-E', () => {
    expect(validateEvaluationForm({ ...base, condition_rating: 'F' }).message).toBe('请选择车况评级')
  })
})
