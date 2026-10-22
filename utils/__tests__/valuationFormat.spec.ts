import { describe, it, expect } from 'vitest'
import {
  formatConfidence,
  formatInteger,
  formatMastHeight,
  formatPercent,
  formatTonnage,
  formatWan,
  formatWanCurrency,
  residualRate
} from '../valuationFormat'

describe('金额（万元口径，与旧 SPA 一致）', () => {
  it('元 → 万元字符串', () => {
    expect(formatWan(250000)).toBe('25.00')
    expect(formatWan(12345, 1)).toBe('1.2')
    expect(formatWanCurrency(250000)).toBe('¥25.00 万')
  })

  it('非法值与空值返回占位符', () => {
    expect(formatWan(null)).toBe('-')
    expect(formatWan(undefined)).toBe('-')
    expect(formatWan(Number.NaN)).toBe('-')
    expect(formatWanCurrency(Number.POSITIVE_INFINITY)).toBe('-')
  })
})

describe('比例', () => {
  it('残值率只在原价有效时给出', () => {
    expect(residualRate(150000, 250000)).toBe(60)
    expect(residualRate(1, 0)).toBeNull()
    expect(residualRate(undefined, 1)).toBeNull()
  })

  it('置信度按 0~1 转百分比', () => {
    expect(formatPercent(92.34)).toBe('92.3%')
    expect(formatConfidence(0.92)).toBe('92.0%')
    expect(formatPercent(null)).toBe('-')
  })

  it('整数千分位；吨位/门架高度的显示口径', () => {
    expect(formatInteger(1234567)).toBe('1,234,567')
    expect(formatInteger(null)).toBe('-')
    expect(formatTonnage(3)).toBe('3 吨')
    expect(formatTonnage(2.5)).toBe('2.5 吨')
    expect(formatTonnage(0)).toBe('-')
    expect(formatMastHeight(4500)).toBe('4500 mm')
    expect(formatMastHeight(0)).toBe('无')
  })
})
