import { describe, it, expect } from 'vitest'
import { formatDate } from '../formatDate'

describe('formatDate', () => {
  it('格式化 ISO 日期为 YYYY-MM-DD', () => {
    expect(formatDate('2026-08-01T10:00:00.000000')).toBe('2026-08-01')
  })

  it('空值与非法输入返回空串', () => {
    expect(formatDate('')).toBe('')
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
    expect(formatDate('not-a-date')).toBe('')
  })
})
