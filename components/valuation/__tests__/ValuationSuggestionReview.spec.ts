// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ValuationSuggestionReview from '~/components/valuation/ValuationSuggestionReview.vue'
import type { ValuationSuggestionResult } from '~/api/valuation'

function result(patches: ValuationSuggestionResult['patches']): ValuationSuggestionResult {
  return {
    schema_version: 1,
    patches,
    supplements: { usage_hours: '仪表显示 0 小时' },
    questions: ['是否有保养记录？'],
    draft_version: 2
  }
}

describe('模型建议复核卡', () => {
  it('冲突候选展示真实目录身份，必须由用户点选且不预选最高价', async () => {
    const wrapper = mount(ValuationSuggestionReview, {
      props: {
        result: result({
          tonnage: {
            state: 'candidate',
            candidates: [
              { id: 'tonnage:3', label: '3 吨', value: 3, source: 'user' },
              { id: 'tonnage:3.5', label: '3.5 吨', value: 3.5, source: 'dictionary' }
            ]
          }
        })
      }
    })

    expect(wrapper.text()).toContain('需你点选')
    expect(wrapper.text()).toContain('不会自动选择价高或排第一的候选')
    expect(wrapper.findAll('[data-test^="candidate-tonnage-"]')).toHaveLength(2)
    expect(wrapper.get('[data-test="candidate-tonnage-3.5"]').text()).toContain('tonnage:3.5')
    expect(wrapper.emitted('choose')).toBeUndefined()

    await wrapper.get('[data-test="candidate-tonnage-3.5"]').trigger('click')
    expect(wrapper.emitted('choose')).toEqual([['tonnage', 3.5]])
  })

  it('补充、问题与明确的 0/false 原样展示', () => {
    const wrapper = mount(ValuationSuggestionReview, {
      props: {
        result: result({
          usage_hours: { state: 'value', value: 0 },
          has_registration_certificate: { state: 'value', value: false },
          original_paint: { state: 'value', value: true }
        })
      }
    })

    expect(wrapper.text()).toContain('累计工时：0 小时')
    expect(wrapper.text()).toContain('有特种设备登记证：否')
    expect(wrapper.text()).toContain('原厂原漆：是')
    expect(wrapper.text()).toContain('仪表显示 0 小时')
    expect(wrapper.text()).toContain('是否有保养记录？')
    expect(wrapper.text()).toContain('不会触发正式评估、参考试算、改价或存档')
  })
})
