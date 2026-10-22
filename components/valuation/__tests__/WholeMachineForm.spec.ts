// @vitest-environment nuxt
// 整机填报卡片的「能不能提交」回归锁：字段齐了按钮必须可点，提交要发出完整 payload。
//
// 背景（2026-10-22）：搬进门户后表单状态里漏了 sale_year，而校验器要求成交年份——
// 于是按钮永远置灰、用户点不动。校验器本身没错，错的是接线，所以这一层必须按
// 「真实填一遍表」来测，而不是只测校验函数。
import { describe, it, expect, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import WholeMachineForm from '~/components/valuation/WholeMachineForm.vue'

const record = { id: 99, estimated_value: 100000, confidence_low: 90000, confidence_high: 110000 }

const apiMock = {
  listVehicleTypes: vi.fn(async () => [
    { id: 1, name: '内燃平衡重式', power_type: 'ic', earliest_factory_year: 2000 }
  ]),
  listSeries: vi.fn(async () => [
    { id: 1, brand: '林德', name: 'H系列', earliest_factory_year: 2000 }
  ]),
  listTonnages: vi.fn(async () => [{ id: 1, value: 3 }]),
  listConfigTypes: vi.fn(async () => [{ id: 1, name: '手波/进口发动机' }]),
  getEarliestFactoryYear: vi.fn(async () => 2005),
  listMastTypes: vi.fn(async () => [{ id: 1, name: '两级门架' }]),
  listMastHeights: vi.fn(async () => [{ id: 1, value_mm: 3000 }]),
  listCities: vi.fn(async () => ['广州']),
  createEvaluation: vi.fn(async (_payload: Record<string, unknown>) => record)
}

vi.mock('~/composables/useValuationApi', () => ({ useValuationApi: () => apiMock }))

const props = {
  brands: [{ id: 1, name: '林德', k_brand: 1.1, is_active: true }],
  provinces: ['广东'],
  conditionRatings: [{ id: 1, rating: 'B', label: '良好', base_coefficient: 0.9 }]
}

type Wrapper = Awaited<ReturnType<typeof mountSuspended>>

/**
 * 选一项：级联是异步的，先等目标 option 真的渲染出来再选。
 * 不用 setValue——number 选项在本环境里选不中；这里走真实用户路径：设值 + 派发 change。
 */
async function set(wrapper: Wrapper, test: string, value: string | number) {
  const selector = `[data-test="${test}"]`
  await vi.waitFor(() => {
    const values = wrapper
      .get(selector)
      .findAll('option')
      .map((option: { element: Element }) => (option.element as HTMLOptionElement).value)
    expect(values).toContain(String(value))
  })
  const el = wrapper.get(selector).element as HTMLSelectElement
  el.value = String(value)
  el.dispatchEvent(new Event('change'))
  await flushPromises()
}

async function fill(wrapper: Wrapper) {
  await set(wrapper, 'brand', '林德')
  await set(wrapper, 'vehicle-type', '内燃平衡重式')
  await set(wrapper, 'series', 'H系列')
  await set(wrapper, 'tonnage', 3)
  await set(wrapper, 'config-type', '手波/进口发动机')
  await set(wrapper, 'mast-type', '两级门架')
  await set(wrapper, 'mast-height', 3000)
  await set(wrapper, 'factory-year', 2019)
  await set(wrapper, 'province', '广东')
  await set(wrapper, 'city', '广州')
  await wrapper.get('[data-test="usage-hours"]').setValue(5000)
  await wrapper.get('[data-test="rating-B"]').trigger('click')
  await flushPromises()
}

describe('整机填报卡片', () => {
  it('必填项填齐后提交按钮可点，且提交的是完整 payload', async () => {
    const wrapper = await mountSuspended(WholeMachineForm, { props })

    // 起来的时候按钮必须是禁用的（必填项还没填）
    expect(wrapper.get('[data-test="submit"]').attributes('disabled')).toBeDefined()

    await fill(wrapper)
    expect(wrapper.get('[data-test="submit"]').attributes('disabled')).toBeUndefined()

    await wrapper.trigger('submit')
    await flushPromises()

    expect(apiMock.createEvaluation).toHaveBeenCalledTimes(1)
    const payload = apiMock.createEvaluation.mock.calls[0]![0]
    expect(payload).toMatchObject({
      brand: '林德',
      vehicle_type: '内燃平衡重式',
      series: 'H系列',
      tonnage: 3,
      config_type: '手波/进口发动机',
      mast_type: '两级门架',
      mast_height_mm: 3000,
      factory_year: 2019,
      usage_hours: 5000,
      original_paint: true,
      province: '广东',
      city: '广州',
      condition_rating: 'B'
    })
    // 成交年份不进界面，但必须随提交带上（缺了它校验器会判「请填写成交年份」）
    expect(payload.sale_year).toBe(new Date().getFullYear())
    expect(wrapper.emitted('evaluated')?.[0]?.[0]).toEqual(record)
  })

  it('「重置」把表单清回初始态（按钮重新禁用）', async () => {
    const wrapper = await mountSuspended(WholeMachineForm, { props })
    await fill(wrapper)
    expect(wrapper.get('[data-test="submit"]').attributes('disabled')).toBeUndefined()

    const reset = wrapper.findAll('button').find((btn) => btn.text() === '重置')
    await reset!.trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="submit"]').attributes('disabled')).toBeDefined()
  })
})
