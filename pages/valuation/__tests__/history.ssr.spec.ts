// @vitest-environment nuxt
// 评估历史页测试（票 #32）：断言「给定上游列表 → 页面出现什么行/链接」。
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

const wholeRecord = {
  id: 12,
  created_at: '2026-10-01T10:00:00.000000',
  updated_at: '2026-10-01T10:00:00.000000',
  brand: '合力',
  vehicle_type: '电动平衡重',
  series: 'H 系列',
  tonnage: 3,
  config_type: '标准',
  mast_type: '三级门架',
  mast_height_mm: 4500,
  factory_year: 2019,
  sale_year: 2024,
  usage_hours: 1200,
  original_paint: true,
  province: '广东省',
  city: '广州市',
  has_license_plate: true,
  has_registration_certificate: false,
  has_maintenance_records: true,
  condition_rating: 'B',
  original_price: 250000,
  estimated_value: 150000,
  k_time: 0.62,
  k_hours: 0.95,
  k_brand: 1.02,
  k_condition: 0.9,
  k_market: 1,
  k_time_adjusted: 0.58,
  confidence_low: 140000,
  confidence_high: 160000,
  dimension_scores: [],
  suggestions: [],
  lambda_electric: 0.12,
  lambda_combustion: 0.15,
  decay_anchor: 0.93
}

const batteryRow = {
  id: 3,
  battery_type: 'lfp',
  battery_model: '48V-630Ah',
  cycle_count: 12,
  rul_cycles: 860,
  soh_percent: 88.5,
  confidence: 0.91,
  confidence_low: 780,
  confidence_high: 940,
  created_at: '2026-10-02T10:00:00.000000'
}

const apiMock = {
  getSession: vi.fn().mockResolvedValue({ user: { user_id: 1, account: 'u1', username: '张三', role: 'hrwai_user' } }),
  listEvaluations: vi.fn().mockResolvedValue({ total: 1, page: 1, page_size: 10, list: [wholeRecord] }),
  listBatteryEvaluations: vi.fn().mockResolvedValue({ total: 1, items: [batteryRow] }),
  logout: vi.fn()
}

vi.mock('~/composables/useValuationApi', () => ({ useValuationApi: () => apiMock }))

describe('评估历史页', () => {
  it('整机历史：行内含编号/品牌/残值（万元）/残值率，并给出详情与 PDF 下载入口', async () => {
    const page = await import('~/pages/valuation/history/index.vue')
    const wrapper = await mountSuspended(page.default as any, { route: '/valuation/history' })
    const html = wrapper.html()

    expect(html).toContain('评估历史')
    expect(html).toContain('#12')
    expect(html).toContain('合力')
    expect(html).toContain('电动平衡重')
    // 150000 元 → 15.00 万元；150000/250000 → 60.0%
    expect(html).toContain('15.00')
    expect(html).toContain('60.0%')
    expect(html).toContain('/valuation/report/12')
    expect(html).toContain('/api/valuation/evaluations/12/report')
  })

  it('电池历史（?type=battery）：渲染电池类型/RUL/SOH 与电池报告入口', async () => {
    const page = await import('~/pages/valuation/history/index.vue')
    const wrapper = await mountSuspended(page.default as any, {
      route: '/valuation/history?type=battery'
    })
    const html = wrapper.html()

    expect(html).toContain('磷酸铁锂（LFP）')
    expect(html).toContain('48V-630Ah')
    expect(html).toContain('860')
    expect(html).toContain('88.5%')
    expect(html).toContain('/valuation/battery/report/3')
    expect(html).toContain('/api/valuation/battery/evaluations/3/report')
  })
})
