// @vitest-environment nuxt
// 评估详情/报告页测试（票 #32）：断言「给定详情 → 页面出现什么文本/下载链接」。
import { describe, it, expect, vi } from 'vitest'
import { registerEndpoint } from '@nuxt/test-utils/runtime'

// 受保护页面（history / report）走 valuation-auth 路由中间件：这里把会话端点桩成「已登录」，
// 页面才能拿到自己的路由参数（未登录时中间件会先跳到 /valuation/login）。
registerEndpoint('/__portal__/valuation/session', () => ({
  user: { user_id: 1, account: 'u1', username: '测试用户', role: 'hrwai_user' }
}))
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
  dimension_scores: [
    { label: '出厂时间', value: 62 },
    { label: '使用强度', value: 80 }
  ],
  suggestions: ['建议补齐维保记录以支撑价格'],
  lambda_electric: 0.12,
  lambda_combustion: 0.15,
  decay_anchor: 0.93
}

const batteryRecord = {
  id: 3,
  battery_type: 'lfp',
  battery_model: '48V-630Ah',
  cycle_count: 12,
  rul_cycles: 860,
  soh_percent: 88.5,
  confidence: 0.91,
  confidence_low: 780,
  confidence_high: 940,
  report_pdf_path: 'reports/battery_report_3.pdf',
  created_at: '2026-10-02T10:00:00.000000',
  updated_at: '2026-10-02T10:00:00.000000',
  suggestions: ['继续保持浅充浅放'],
  feature_importance: [
    { index: 0, name: '恒流电压均值', group: '恒流电压', weight: 0.2, normalized: 0.8 }
  ]
}

const apiMock = {
  getSession: vi.fn().mockResolvedValue({ user: { user_id: 1, account: 'u1', username: '张三', role: 'hrwai_user' } }),
  getEvaluation: vi.fn().mockResolvedValue(wholeRecord),
  getBatteryEvaluation: vi.fn().mockResolvedValue(batteryRecord),
  logout: vi.fn()
}

vi.mock('~/composables/useValuationApi', () => ({ useValuationApi: () => apiMock }))

describe('整机评估报告页', () => {
  it('渲染残值/系数/维度/建议/输入参数，并给出流式下载入口（不再自链到详情）', async () => {
    const page = await import('~/pages/valuation/report/[id].vue')
    const wrapper = await mountSuspended(page.default as any, { route: '/valuation/report/12' })
    const html = wrapper.html()

    expect(html).toContain('整机评估报告 #12')
    expect(html).toContain('预估残值')
    expect(html).toContain('¥15.00 万')
    expect(html).toContain('60.0%')
    expect(html).toContain('0.580')
    expect(html).toContain('出厂时间')
    expect(html).toContain('建议补齐维保记录以支撑价格')
    expect(html).toContain('广东省')
    expect(html).toContain('/api/valuation/evaluations/12/report')
    // 详情页不重复渲染「查看完整报告」自链
    expect(html).not.toContain('查看完整报告')
  })
})

describe('电池评估报告页', () => {
  it('渲染 RUL/SOH/置信区间/特征重要性与电池报告下载入口', async () => {
    const page = await import('~/pages/valuation/battery/report/[id].vue')
    const wrapper = await mountSuspended(page.default as any, {
      route: '/valuation/battery/report/3'
    })
    const html = wrapper.html()

    expect(html).toContain('电池评估报告 #3')
    expect(html).toContain('磷酸铁锂（LFP）')
    expect(html).toContain('48V-630Ah')
    expect(html).toContain('860')
    expect(html).toContain('88.5%')
    expect(html).toContain('恒流电压均值')
    expect(html).toContain('/api/valuation/battery/evaluations/3/report')
  })
})
