// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ValuationConversation from '~/components/valuation/ValuationConversation.vue'
import { createDraftFields, type DraftFields } from '~/utils/valuationConversation'
import type { EvaluationRequest } from '~/api/valuation'

let serverFields: DraftFields = createDraftFields()
let serverVersion = 0
let serverHistory: DraftFields[] = []

const apiMock = {
  createConversationDraft: vi.fn(async () => {
    serverVersion = 1
    return { id: 'draft-1', draft_version: serverVersion, updated_at: new Date().toISOString(), fields: serverFields }
  }),
  getConversationDraft: vi.fn(async () => ({
    id: 'draft-1', draft_version: serverVersion, updated_at: new Date().toISOString(), fields: serverFields
  })),
  updateConversationDraft: vi.fn(async (_id: string, body: { draft_version: number; fields: Partial<DraftFields> }) => {
    expect(body.draft_version).toBe(serverVersion)
    serverHistory.push(serverFields)
    serverVersion += 1
    serverFields = { ...serverFields, ...body.fields }
    return { id: 'draft-1', draft_version: serverVersion, updated_at: new Date().toISOString(), fields: serverFields }
  }),
  undoConversationDraft: vi.fn(async () => {
    serverFields = serverHistory.pop() ?? serverFields
    return { id: 'draft-1', draft_version: ++serverVersion, updated_at: new Date().toISOString(), fields: serverFields }
  }),
  deleteConversationDraft: vi.fn(async () => ({ deleted: true })),
  createConversationOperation: vi.fn(async (body: { operation_id: string; request: EvaluationRequest }) => ({
    id: body.operation_id,
    status: 'succeeded',
    evaluation: {
      ...body.request,
      id: 88,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      original_price: 120000,
      k_time: 0.9,
      k_hours: 1,
      k_brand: 1,
      k_condition: 0.9,
      k_market: 1,
      k_time_adjusted: 0.9,
      estimated_value: 33600,
      confidence_low: 30600,
      confidence_high: 36600,
      dimension_scores: [{ label: '车况', value: 80 }],
      suggestions: ['保留保养记录'],
      lambda_electric: 1,
      lambda_combustion: 1,
      decay_anchor: 0
    }
  })),
  getConversationOperation: vi.fn(),
  getEvaluation: vi.fn(),
  listVehicleTypes: vi.fn(async () => [{ id: 1, name: '电动平衡重式', power_type: 'electric', earliest_factory_year: 2000 }]),
  listSeries: vi.fn(async () => [{ id: 1, brand: '合力', name: 'H 系列', earliest_factory_year: 2000 }]),
  listTonnages: vi.fn(async () => [{ id: 1, value: 3 }]),
  listConfigTypes: vi.fn(async () => [{ id: 1, name: '标准' }]),
  getEarliestFactoryYear: vi.fn(async () => 2000),
  listMastTypes: vi.fn(async () => [{ id: 1, name: '两级门架' }]),
  listMastHeights: vi.fn(async () => [{ id: 1, value_mm: 3000 }, { id: 2, value_mm: 0 }]),
  listCities: vi.fn(async () => ['苏州市'])
}

vi.mock('~/composables/useValuationApi', () => ({ useValuationApi: () => apiMock }))

const props = {
  brands: [{ id: 1, name: '合力', k_brand: 1, is_active: true }],
  provinces: ['江苏省'],
  conditionRatings: [{ id: 1, rating: 'B', label: '良好', base_coefficient: 0.9 }]
}

async function mountPage() {
  const wrapper = await mountSuspended(ValuationConversation, { props, route: '/valuation/conversation' })
  await flushPromises()
  await vi.waitFor(() => expect(wrapper.get('[data-test="draft-version"]').text()).toContain('1'))
  return wrapper
}

async function loadDemo(wrapper: Awaited<ReturnType<typeof mountPage>>) {
  if (wrapper.get('[data-test="toggle-draft"]').attributes('aria-expanded') === 'false') {
    await wrapper.get('[data-test="toggle-draft"]').trigger('click')
    await flushPromises()
  }
  await wrapper.get('[data-test="load-demo"]').trigger('click')
  await flushPromises()
  await vi.waitFor(() => expect(wrapper.get('[data-test="review"]').attributes('disabled')).toBeUndefined())
}

async function confirm(wrapper: Awaited<ReturnType<typeof mountPage>>) {
  await wrapper.get('[data-test="review"]').trigger('click')
  expect(wrapper.get('[data-test="confirm"]').attributes('disabled')).toBeDefined()
  await wrapper.get('[data-test="acknowledge"]').setValue(true)
  await Promise.all([
    wrapper.get('[data-test="confirm"]').trigger('click'),
    wrapper.get('[data-test="confirm"]').trigger('click')
  ])
  await flushPromises()
}

describe('对话内联评估组件', () => {
  beforeEach(() => {
    sessionStorage.clear()
    serverFields = createDraftFields()
    serverVersion = 0
    serverHistory = []
    vi.clearAllMocks()
  })

  it('A 布局支持折叠草稿、字典点选、直接编辑，消息仅存内存', async () => {
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('估值助手')
    expect(wrapper.get('[data-test="toggle-draft"]').attributes('aria-expanded')).toBe('false')

    await wrapper.get('[data-test="toggle-draft"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-test="draft-editor"]').attributes('hidden')).toBeUndefined()
    expect(wrapper.get('[data-test="vehicle_type-dictionary"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="series-dictionary"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="factory_year-dictionary"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="brand-dictionary"]').findAll('option')).toHaveLength(2)
    const brand = wrapper.get('[data-test="brand-dictionary"]').element as HTMLSelectElement
    brand.value = '合力'
    brand.dispatchEvent(new Event('change'))
    await flushPromises()
    expect(serverFields.brand).toMatchObject({ status: 'value', value: '合力', source: 'dictionary' })

    await wrapper.get('[data-test="usage_hours"]').setValue('0')
    await flushPromises()
    expect(serverFields.usage_hours).toMatchObject({ status: 'value', value: 0 })

    await wrapper.get('[data-test="message-input"]').setValue('0 小时，没有登记证')
    await wrapper.get('[data-test="message-form"]').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('0 小时，没有登记证')
    expect(sessionStorage.getItem('hrwai:valuation-conversation:draft:v1')).not.toContain('没有登记证')
    expect(apiMock.createConversationOperation).not.toHaveBeenCalled()

    await wrapper.get('[data-test="toggle-draft"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test="draft-editor"]').exists()).toBe(false)
  })

  it('完整版本经明确核对后确认，重复点击只创建一条结果并复用报告入口', async () => {
    const wrapper = await mountPage()
    await loadDemo(wrapper)
    await confirm(wrapper)

    expect(apiMock.createConversationOperation).toHaveBeenCalledTimes(1)
    expect(wrapper.findAll('section.result-card')).toHaveLength(1)
    expect(wrapper.text()).toContain('评估完成')
    expect(wrapper.find('a[href="/api/valuation/evaluations/88/report"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/valuation/report/88"]').exists()).toBe(true)
  })

  it('完整草稿加载后共享级联字典各级同时可用', async () => {
    const wrapper = await mountPage()
    await loadDemo(wrapper)
    await vi.waitFor(() => {
      expect(wrapper.get('[data-test="vehicle_type-dictionary"]').findAll('option').map((option) => option.text())).toContain('电动平衡重式')
      expect(wrapper.get('[data-test="series-dictionary"]').findAll('option').map((option) => option.text())).toContain('H 系列')
      expect(wrapper.get('[data-test="tonnage-dictionary"]').findAll('option').map((option) => option.text())).toContain('3 吨')
      expect(wrapper.get('[data-test="config_type-dictionary"]').findAll('option').map((option) => option.text())).toContain('标准')
      expect(wrapper.get('[data-test="mast_type-dictionary"]').findAll('option').map((option) => option.text())).toContain('两级门架')
      expect(wrapper.get('[data-test="mast_height_mm-dictionary"]').findAll('option').map((option) => option.text())).toContain('3000 mm')
      expect(wrapper.get('[data-test="city-dictionary"]').findAll('option').map((option) => option.text())).toContain('苏州市')
    })
  })

  it('撤回恢复修改前的工时，不生成正式记录', async () => {
    const wrapper = await mountPage()
    await loadDemo(wrapper)
    await wrapper.get('[data-test="usage_hours"]').setValue('6200')
    await flushPromises()
    expect(serverFields.usage_hours).toMatchObject({ status: 'value', value: 6200 })
    await wrapper.get('[data-test="undo"]').trigger('click')
    await flushPromises()
    expect(serverFields.usage_hours).toMatchObject({ status: 'value', value: 4800 })
    expect(apiMock.createConversationOperation).not.toHaveBeenCalled()
  })

  it('明确未知与工时范围保持未核对状态，改为具体 0 小时后恢复可确认', async () => {
    const wrapper = await mountPage()
    await loadDemo(wrapper)
    await wrapper.get('[data-test="condition_rating-unknown"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-test="review"]').attributes('disabled')).toBeDefined()

    await wrapper.get('[data-test="usage_hours-unknown"]').trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '只知道工时范围')!.trigger('click')
    await wrapper.get('[data-test="usage-min"]').setValue(0)
    await wrapper.get('[data-test="usage-max"]').setValue(100)
    await wrapper.get('[data-test="save-range"]').trigger('click')
    await flushPromises()
    expect(serverFields.usage_hours).toMatchObject({ status: 'range', min: 0, max: 100 })
    expect(wrapper.get('[data-test="review"]').attributes('disabled')).toBeDefined()

    const rating = wrapper.get('[data-test="condition_rating-dictionary"]').element as HTMLSelectElement
    rating.value = 'B'
    rating.dispatchEvent(new Event('change'))
    await wrapper.get('[data-test="usage_hours"]').setValue('0')
    await flushPromises()
    expect(serverFields.condition_rating).toMatchObject({ status: 'value', value: 'B' })
    expect(serverFields.usage_hours).toMatchObject({ status: 'value', value: 0 })
    await vi.waitFor(() => expect(wrapper.get('[data-test="review"]').attributes('disabled')).toBeUndefined())
  })

  it('核对后修改草稿会撤销勾选并禁止按旧版本确认', async () => {
    const wrapper = await mountPage()
    await loadDemo(wrapper)
    await wrapper.get('[data-test="review"]').trigger('click')
    await wrapper.get('[data-test="acknowledge"]').setValue(true)
    expect((wrapper.get('[data-test="acknowledge"]').element as HTMLInputElement).checked).toBe(true)
    await wrapper.get('[data-test="usage_hours"]').setValue('6200')
    await flushPromises()
    expect((wrapper.get('[data-test="acknowledge"]').element as HTMLInputElement).checked).toBe(false)
    expect(wrapper.get('[data-test="confirm"]').attributes('disabled')).toBeDefined()
    expect(apiMock.createConversationOperation).not.toHaveBeenCalled()
  })

  it('纠错重估追加新卡，旧卡保留当时的工时输入', async () => {
    const wrapper = await mountPage()
    await loadDemo(wrapper)
    await confirm(wrapper)
    expect(wrapper.get('[data-test="result-snapshot-88"]').text()).toContain('4800 小时')

    await wrapper.get('[data-test="toggle-draft"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-test="usage_hours"]').setValue('6200')
    await flushPromises()
    await vi.waitFor(() => expect(wrapper.get('[data-test="review"]').attributes('disabled')).toBeUndefined())
    await confirm(wrapper)

    expect(wrapper.findAll('section.result-card')).toHaveLength(2)
    expect(wrapper.get('[data-test="result-snapshot-88"]').text()).toContain('4800 小时')
    expect(wrapper.get('[data-test="result-snapshot-88"]').text()).not.toContain('6200')
    expect(apiMock.createConversationOperation).toHaveBeenCalledTimes(2)
  })
})
