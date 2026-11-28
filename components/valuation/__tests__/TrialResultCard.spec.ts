// @vitest-environment nuxt
import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type {
  DisabledTrialResult,
  NeedsInfoTrialResult,
  PricedTrialResult,
  TrialCandidate
} from '~/api/valuation'
import TrialResultCard from '~/components/valuation/TrialResultCard.vue'

const candidate = (id: number, originalPrice: number): TrialCandidate => ({
  id,
  brand: '合力',
  vehicle_type: '电动平衡重',
  series: 'H 系列',
  tonnage: 3,
  config_type: '标准',
  mast_type: '三级门架',
  mast_height_mm: 4500,
  earliest_factory_year: 2010,
  original_price: originalPrice,
  updated_at: '2026-11-28T00:00:00Z'
})

const priced: PricedTrialResult = {
  status: 'priced',
  input: {
    brand: '合力',
    vehicle_type: '电动平衡重',
    tonnage: 3,
    factory_year: 2019,
    usage_hours: 1200
  },
  candidates: [candidate(1, 90000), candidate(2, 110000)],
  assumptions: ['工时未知，按已批准的低工时情景计算'],
  missing_fields: ['mast_type'],
  interval: { min: 30000, max: 45000, mid: 37500, width: 15000, width_ratio: 0.4 },
  width_ratio: 0.4,
  snapshot: {
    hash: 'snapshot-hash',
    sha7: 'abc1234',
    formula_version: 'valuation-v2',
    formula_hash: 'formula-hash',
    policy: 'demo',
    policy_version: 'trial-v1'
  }
}

describe('TrialResultCard', () => {
  it('priced 展示试算依据与区间，且不提供报告入口', async () => {
    const wrapper = await mountSuspended(TrialResultCard, { props: { result: priced } })

    expect(wrapper.get('[data-test="trial-card"]').attributes('data-status')).toBe('priced')
    expect(wrapper.text()).toContain('参考试算')
    expect(wrapper.text()).toContain('¥3.00 ~ ¥4.50 万')
    expect(wrapper.text()).toContain('¥1.50 万')
    expect(wrapper.text()).toContain('¥9.00 ~ ¥11.00 万')
    expect(wrapper.text()).toContain('H 系列 · 标准 · 三级门架')
    expect(wrapper.text()).toContain('1,200 小时')
    expect(wrapper.text()).toContain('工时未知，按已批准的低工时情景计算')
    expect(wrapper.text()).toContain('门架类型')
    expect(wrapper.text()).toContain('valuation-v2')
    expect(wrapper.text()).toContain('abc1234')
    expect(wrapper.text()).toContain('trial-v1')
    expect(wrapper.text()).not.toContain('报告')
    expect(wrapper.findAll('a')).toHaveLength(0)
  })

  it('stale 保留旧快照并明确提示需要主动重算', async () => {
    const wrapper = await mountSuspended(TrialResultCard, {
      props: { result: priced, stale: true, requestId: 'trial-request-1' }
    })

    expect(wrapper.get('[data-test="trial-card"]').attributes('data-stale')).toBe('true')
    expect(wrapper.get('[data-test="trial-card"]').attributes('data-request-id')).toBe('trial-request-1')
    expect(wrapper.text()).toContain('草稿已修改')
    expect(wrapper.text()).toContain('这张卡保留的是修改前的试算快照')
    expect(wrapper.text()).toContain('¥3.00 ~ ¥4.50 万')
  })

  it('出厂年份范围显示为区间而非两个孤立数字', async () => {
    const wrapper = await mountSuspended(TrialResultCard, {
      props: {
        result: {
          ...priced,
          input: { ...priced.input, factory_year: undefined, factory_year_min: 2018, factory_year_max: 2020 }
        }
      }
    })

    expect(wrapper.text()).toContain('2018–2020 年')
    expect(wrapper.text()).not.toContain('2018 年')
  })

  it('needs_info 明确暂不给价并优先展示可缩小范围的待补项', async () => {
    const result: NeedsInfoTrialResult = {
      status: 'needs_info',
      message: '目前还无法给出可靠区间',
      missing_fields: ['factory_year_or_range', 'tonnage']
    }
    const wrapper = await mountSuspended(TrialResultCard, { props: { result } })

    expect(wrapper.get('[data-test="trial-card"]').attributes('data-status')).toBe('needs_info')
    expect(wrapper.text()).toContain('暂不给价')
    expect(wrapper.text()).toContain('目前还无法给出可靠区间')
    expect(wrapper.findAll('.trial-followup li').map((item) => item.text())).toEqual([
      '出厂年份或年份范围',
      '吨位'
    ])
    expect(wrapper.text()).not.toContain('参考残值区间')
    expect(wrapper.findAll('a')).toHaveLength(0)
  })

  it('disabled 遵从 FL 的关闭策略，不在门户侧绕过', async () => {
    const result: DisabledTrialResult = {
      status: 'disabled',
      message: '参考试算仍在验证，暂未开放'
    }
    const wrapper = await mountSuspended(TrialResultCard, { props: { result } })

    expect(wrapper.get('[data-test="trial-card"]').attributes('data-status')).toBe('disabled')
    expect(wrapper.text()).toContain('参考试算暂未开放')
    expect(wrapper.text()).toContain('参考试算仍在验证，暂未开放')
    expect(wrapper.text()).not.toContain('参考残值区间')
    expect(wrapper.findAll('a, button')).toHaveLength(0)
  })
})
