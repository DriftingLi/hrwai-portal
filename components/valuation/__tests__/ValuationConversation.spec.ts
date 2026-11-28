// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ValuationConversation from '~/components/valuation/ValuationConversation.vue'
import { createDraftFields, type DraftFields } from '~/utils/valuationConversation'
import type { EvaluationRequest, TrialPolicy, TrialRequest, TrialResult } from '~/api/valuation'

let serverFields: DraftFields = createDraftFields()
let serverVersion = 0
let serverHistory: DraftFields[] = []

function upstreamDraft(version: number, fields: DraftFields) {
  return {
    id: 'draft-1', version, status: 'editing' as const,
    updated_at: new Date().toISOString(), expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    supplemental: {}, can_undo: serverHistory.length > 0, can_submit: false,
    fields: Object.fromEntries(Object.entries(fields).map(([key, field]) => {
      const common = { ...(field.evidence ? { evidence: field.evidence } : {}), ...(field.source ? { source: field.source } : {}) }
      if (field.status === 'range') return [key, { state: 'range', range: { min: field.min, max: field.max }, ...common }]
      if (field.status === 'candidate') return [key, { state: 'candidate', candidates: field.candidates?.map((value) => ({ value })), ...common }]
      return [key, { state: field.status, ...(field.status === 'value' ? { value: field.value } : {}), ...common }]
    }))
  }
}

function trialResult(request: TrialRequest): TrialResult {
  return {
    status: 'priced',
    request_id: request.request_id,
    snapshot_id: 'frozen-snapshot',
    input: request,
    assumptions: ['按冻结目录候选计算'],
    candidates: [{
      id: 1,
      brand: String(request.brand),
      vehicle_type: String(request.vehicle_type),
      series: 'H 系列',
      tonnage: Number(request.tonnage),
      config_type: '标准',
      mast_type: '两级门架',
      mast_height_mm: 3000,
      earliest_factory_year: 2010,
      original_price: 90000,
      updated_at: '2026-11-28T00:00:00Z'
    }],
    missing_fields: [],
    interval: { min: 30000, max: 45000, mid: 37500, width: 15000, width_ratio: 0.4 },
    width_ratio: 0.4,
    snapshot: {
      hash: 'frozen-snapshot',
      sha7: 'frozen1',
      formula_version: 'valuation-v2',
      formula_hash: 'formula-hash',
      policy: request.policy,
      policy_version: 'trial-v1'
    }
  }
}

const apiMock = {
  estimateTrial: vi.fn(async (request: TrialRequest) => trialResult(request)),
  createConversationDraft: vi.fn(async () => {
    serverVersion = 1
    return upstreamDraft(serverVersion, serverFields)
  }),
  getConversationDraft: vi.fn(async () => upstreamDraft(serverVersion, serverFields)),
  updateConversationDraft: vi.fn(async (_id: string, body: { base_version: number; fields: Partial<DraftFields> }) => {
    expect(body.base_version).toBe(serverVersion)
    serverHistory.push(serverFields)
    serverVersion += 1
    serverFields = { ...serverFields, ...body.fields }
    return upstreamDraft(serverVersion, serverFields)
  }),
  undoConversationDraft: vi.fn(async (_id: string, body: { base_version: number }) => {
    expect(body.base_version).toBe(serverVersion)
    serverFields = serverHistory.pop() ?? serverFields
    serverHistory = []
    serverVersion += 1
    return upstreamDraft(serverVersion, serverFields)
  }),
  deleteConversationDraft: vi.fn(async () => ({ deleted: true })),
  suggestConversationDraft: vi.fn(async (body: { operation_id: string }) => ({
    id: `op:draft-1:${body.operation_id}`,
    operation_id: `op:draft-1:${body.operation_id}`,
    status: 'pending'
  })),
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
  getConversationOperation: vi.fn(async (id: string) => id.startsWith('op:')
    ? {
        id, status: 'succeeded',
        result: { schema_version: 1, patches: {}, supplements: {}, questions: [], draft_version: serverVersion }
      }
    : { id, status: 'succeeded' }),
  getEvaluation: vi.fn(),
  listVehicleTypes: vi.fn(async () => [{ id: 1, name: '电动平衡重式', power_type: 'electric', earliest_factory_year: 2000 }]),
  listSeries: vi.fn(async () => [{ id: 1, brand: '林德', name: 'E系列', earliest_factory_year: 2000 }]),
  listTonnages: vi.fn(async () => [{ id: 1, value: 2 }]),
  listConfigTypes: vi.fn(async () => [{ id: 1, name: '磷酸铁锂(LFP)' }]),
  getEarliestFactoryYear: vi.fn(async () => 2000),
  listMastTypes: vi.fn(async () => [{ id: 1, name: '两级门架' }]),
  listMastHeights: vi.fn(async () => [{ id: 1, value_mm: 3000 }, { id: 2, value_mm: 0 }]),
  listCities: vi.fn(async () => ['苏州'])
}

vi.mock('~/composables/useValuationApi', () => ({ useValuationApi: () => apiMock }))

const props = {
  brands: [{ id: 1, name: '林德', k_brand: 1, is_active: true }],
  provinces: ['江苏'],
  conditionRatings: [{ id: 1, rating: 'B', label: '良好', base_coefficient: 0.9 }]
}

async function mountPage(expectedVersion = 1, trialEnabled = false, trialPolicy: TrialPolicy = 'demo') {
  const wrapper = await mountSuspended(ValuationConversation, {
    props: { ...props, trialEnabled, trialPolicy },
    route: '/valuation/conversation'
  })
  await flushPromises()
  await vi.waitFor(() => expect(wrapper.get('[data-test="draft-version"]').text()).toContain(String(expectedVersion)))
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

async function openDraft(wrapper: Awaited<ReturnType<typeof mountPage>>) {
  if (wrapper.get('[data-test="toggle-draft"]').attributes('aria-expanded') === 'false') {
    await wrapper.get('[data-test="toggle-draft"]').trigger('click')
    await flushPromises()
  }
}

async function fillTrialMinimum(wrapper: Awaited<ReturnType<typeof mountPage>>, withYear = true) {
  await openDraft(wrapper)
  for (const [key, value] of [['brand', '林德'], ['vehicle_type', '电动平衡重式'], ['tonnage', '2']] as const) {
    await wrapper.get(`[data-test="${key}"]`).setValue(value)
    await flushPromises()
  }
  if (withYear) {
    await wrapper.get('[data-test="factory_year"]').setValue('2020')
    await flushPromises()
  }
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
    apiMock.estimateTrial.mockReset()
    apiMock.estimateTrial.mockImplementation(async (request: TrialRequest) => trialResult(request))
    apiMock.suggestConversationDraft.mockReset()
    apiMock.suggestConversationDraft.mockImplementation(async (body: { operation_id: string }) => ({
      id: `op:draft-1:${body.operation_id}`, operation_id: `op:draft-1:${body.operation_id}`, status: 'pending'
    }))
    apiMock.getConversationOperation.mockReset()
    apiMock.getConversationOperation.mockImplementation(async (id: string) => id.startsWith('op:')
      ? { id, status: 'succeeded', result: { schema_version: 1, patches: {}, supplements: {}, questions: [], draft_version: serverVersion } }
      : { id, status: 'succeeded' })
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
    brand.value = '林德'
    brand.dispatchEvent(new Event('change'))
    await flushPromises()
    expect(serverFields.brand).toMatchObject({ status: 'value', value: '林德', source: 'dictionary' })

    await wrapper.get('[data-test="usage_hours"]').setValue('0')
    await flushPromises()
    expect(serverFields.usage_hours).toMatchObject({ status: 'value', value: 0 })

    apiMock.getConversationOperation.mockResolvedValueOnce({
      id: 'op:test', status: 'succeeded',
      result: {
        schema_version: 1,
        patches: {
          usage_hours: { state: 'value', value: 0 },
          has_registration_certificate: { state: 'value', value: false }
        },
        supplements: {}, questions: [], draft_version: 3
      }
    })
    await wrapper.get('[data-test="message-input"]').setValue('0 小时，没有登记证')
    await wrapper.get('[data-test="message-form"]').trigger('submit')
    await flushPromises()
    await vi.waitFor(() => expect(wrapper.find('[data-test="suggestion-review"]').exists()).toBe(true), { timeout: 3000 })
    expect(wrapper.text()).toContain('0 小时，没有登记证')
    expect(sessionStorage.getItem('hrwai:valuation-conversation:draft:v1')).not.toContain('没有登记证')
    expect(apiMock.suggestConversationDraft).toHaveBeenCalledWith('draft-1', {
      operation_id: expect.any(String), base_version: 3, text: '0 小时，没有登记证'
    })
    expect(serverFields.usage_hours).toMatchObject({ status: 'value', value: 0 })
    expect(serverFields.has_registration_certificate).toMatchObject({ status: 'value', value: false })
    expect((wrapper.get('[data-test="message-input"]').element as HTMLInputElement).value).toBe('')
    expect(wrapper.get('[data-test="suggestion-review"]').text()).toContain('累计工时：0 小时')
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
      expect(wrapper.get('[data-test="series-dictionary"]').findAll('option').map((option) => option.text())).toContain('E系列')
      expect(wrapper.get('[data-test="tonnage-dictionary"]').findAll('option').map((option) => option.text())).toContain('2 吨')
      expect(wrapper.get('[data-test="config_type-dictionary"]').findAll('option').map((option) => option.text())).toContain('磷酸铁锂(LFP)')
      expect(wrapper.get('[data-test="mast_type-dictionary"]').findAll('option').map((option) => option.text())).toContain('两级门架')
      expect(wrapper.get('[data-test="mast_height_mm-dictionary"]').findAll('option').map((option) => option.text())).toContain('3000 mm')
      expect(wrapper.get('[data-test="city-dictionary"]').findAll('option').map((option) => option.text())).toContain('苏州')
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

  it('刷新后仍按服务端 can_undo 撤回最近一次修改', async () => {
    const wrapper = await mountPage()
    await loadDemo(wrapper)
    await wrapper.get('[data-test="usage_hours"]').setValue('6200')
    await flushPromises()
    wrapper.unmount()

    const restored = await mountPage(3)
    await restored.get('[data-test="toggle-draft"]').trigger('click')
    await flushPromises()
    expect(restored.get('[data-test="draft-version"]').text()).toContain('3')
    expect(restored.get('[data-test="undo"]').attributes('disabled')).toBeUndefined()
    await restored.get('[data-test="undo"]').trigger('click')
    await flushPromises()
    expect(serverFields.usage_hours).toMatchObject({ status: 'value', value: 4800 })
    expect(restored.get('[data-test="undo"]').attributes('disabled')).toBeDefined()
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

  it('建议额度耗尽保留输入与草稿，可切手动且不再请求模型', async () => {
    apiMock.suggestConversationDraft.mockRejectedValueOnce(Object.assign(new Error('额度耗尽'), { statusCode: 429 }))
    const wrapper = await mountPage()
    await wrapper.get('[data-test="message-input"]').setValue('第九次：0 小时')
    await wrapper.get('[data-test="message-form"]').trigger('submit')
    await flushPromises()

    expect((wrapper.get('[data-test="message-input"]').element as HTMLInputElement).value).toBe('第九次：0 小时')
    expect(wrapper.get('[data-test="suggestion-status"]').text()).toContain('建议额度已耗尽')
    expect(wrapper.get('[data-test="suggestion-quota"]').text()).toContain('估算剩余 0 / 8')
    expect(wrapper.get('[data-test="draft-version"]').text()).toContain('1')
    expect(wrapper.get('[data-test="suggestion-submit"]').attributes('disabled')).toBeDefined()

    await openDraft(wrapper)
    await wrapper.get('[data-test="usage_hours"]').setValue('0')
    await flushPromises()
    expect(serverFields.usage_hours).toMatchObject({ status: 'value', value: 0 })
    expect(apiMock.suggestConversationDraft).toHaveBeenCalledTimes(1)
  })

  it('模型建议不自动触发参考试算，用户可主动按新草稿重算', async () => {
    apiMock.getConversationOperation.mockResolvedValueOnce({
      id: 'op:test', status: 'succeeded',
      result: {
        schema_version: 1,
        patches: {
          brand: { state: 'value', value: '林德' },
          vehicle_type: { state: 'value', value: '电动平衡重式' },
          tonnage: { state: 'value', value: 2 },
          factory_year: { state: 'value', value: 2020 }
        },
        supplements: {}, questions: [], draft_version: 1
      }
    })
    const wrapper = await mountPage(1, true)
    await wrapper.get('[data-test="message-input"]').setValue('林德 2 吨 2020 年')
    await wrapper.get('[data-test="message-form"]').trigger('submit')
    await flushPromises()
    await vi.waitFor(() => expect(wrapper.find('[data-test="suggestion-review"]').exists()).toBe(true), { timeout: 3000 })

    expect(apiMock.estimateTrial).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="trial-card"]').exists()).toBe(false)
    expect(apiMock.createConversationOperation).not.toHaveBeenCalled()

    await wrapper.get('[data-test="recalculate-trial"]').trigger('click')
    await flushPromises()
    expect(apiMock.estimateTrial).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => expect(wrapper.find('[data-test="trial-card"]').exists()).toBe(true))
    expect(wrapper.get('[data-test="trial-card"]').attributes('data-status')).toBe('priced')
  })

  it('试算默认关闭：完整草稿也不显示入口、不请求 FL', async () => {
    const wrapper = await mountPage()
    await loadDemo(wrapper)

    expect(wrapper.find('[data-test="trial-results"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="recalculate-trial"]').exists()).toBe(false)
    expect(apiMock.estimateTrial).not.toHaveBeenCalled()
  })

  it('开启后首次达到最低输入即自动出卡，不生成正式记录或报告入口', async () => {
    const wrapper = await mountPage(1, true)
    await fillTrialMinimum(wrapper)
    await vi.waitFor(() => expect(wrapper.findAll('[data-test="trial-card"]')).toHaveLength(1))

    expect(apiMock.estimateTrial).toHaveBeenCalledWith(expect.objectContaining({
      brand: '林德',
      vehicle_type: '电动平衡重式',
      tonnage: 2,
      factory_year: 2020,
      policy: 'demo',
      request_id: expect.any(String)
    }))
    expect(apiMock.estimateTrial.mock.calls[0]![0]).not.toHaveProperty('snapshot_id')
    expect(wrapper.get('[data-test="trial-card"]').attributes('data-status')).toBe('priced')
    expect(wrapper.get('[data-test="trial-card"]').text()).toContain('¥3.00 ~ ¥4.50 万')
    expect(wrapper.findAll('[data-test="trial-card"] a, [data-test="trial-card"] button')).toHaveLength(0)
    expect(apiMock.createConversationOperation).not.toHaveBeenCalled()
  })

  it('非法年份不消耗自动机会，修正后自动试算', async () => {
    const wrapper = await mountPage(1, true)
    await fillTrialMinimum(wrapper, false)
    await wrapper.get('[data-test="factory_year"]').setValue('1899')
    await flushPromises()
    expect(apiMock.estimateTrial).not.toHaveBeenCalled()

    await wrapper.get('[data-test="factory_year"]').setValue('2020')
    await vi.waitFor(() => expect(wrapper.findAll('[data-test="trial-card"]')).toHaveLength(1))
    expect(wrapper.get('[data-test="trial-card"]').attributes('data-status')).toBe('priced')
  })

  it('倒置年份范围不消耗机会；修正后自动出卡，改草稿标旧卡 stale 并沿快照追加新卡', async () => {
    const wrapper = await mountPage(1, true, 'pilot')
    await fillTrialMinimum(wrapper, false)
    await wrapper.get('[data-test="factory_year-range-toggle"]').trigger('click')
    await wrapper.get('[data-test="factory_year-min"]').setValue('2020')
    await wrapper.get('[data-test="factory_year-max"]').setValue('2010')
    await wrapper.get('[data-test="factory_year-save-range"]').trigger('click')
    await flushPromises()
    expect(apiMock.estimateTrial).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('请填写有效的最小和最大值')

    await wrapper.get('[data-test="factory_year-min"]').setValue('2018')
    await wrapper.get('[data-test="factory_year-max"]').setValue('2020')
    await wrapper.get('[data-test="factory_year-save-range"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.findAll('[data-test="trial-card"]')).toHaveLength(1))
    expect(apiMock.estimateTrial.mock.calls[0]![0]).toMatchObject({
      factory_year_min: 2018,
      factory_year_max: 2020,
      policy: 'pilot'
    })
    const firstRequestId = wrapper.get('[data-test="trial-card"]').attributes('data-request-id')
    expect(wrapper.get('[data-test="trial-card"]').text()).toContain('2018–2020 年')

    await wrapper.get('[data-test="usage_hours"]').setValue('6200')
    await flushPromises()
    await vi.waitFor(() => expect(wrapper.get('[data-test="trial-card"]').attributes('data-stale')).toBe('true'))
    expect(apiMock.estimateTrial).toHaveBeenCalledTimes(1)

    await wrapper.get('[data-test="recalculate-trial"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.findAll('[data-test="trial-card"]')).toHaveLength(2))
    expect(apiMock.estimateTrial.mock.calls[1]![0]).toMatchObject({
      usage_hours: 6200,
      policy: 'pilot',
      snapshot_id: 'frozen-snapshot',
      request_id: expect.any(String)
    })
    const cards = wrapper.findAll('[data-test="trial-card"]')
    expect(cards[0]!.attributes('data-request-id')).toBe(firstRequestId)
    expect(cards[0]!.attributes('data-stale')).toBe('true')
    expect(cards[0]!.text()).toContain('2018–2020 年')
    expect(cards[1]!.attributes('data-stale')).toBe('false')
    expect(cards[1]!.attributes('data-request-id')).not.toBe(firstRequestId)
  })

  it.each([
    ['needs_info', { status: 'needs_info' as const, message: '目录区间仍过宽', missing_fields: ['mast_type'] }],
    ['disabled', { status: 'disabled' as const, message: '当前组合尚未开放参考试算' }]
  ])('页面真实呈现 FL 的 %s 三态结果', async (status, result) => {
    apiMock.estimateTrial.mockResolvedValueOnce(result)
    const wrapper = await mountPage(1, true)
    await loadDemo(wrapper)
    await vi.waitFor(() => expect(wrapper.findAll('[data-test="trial-card"]')).toHaveLength(1))

    expect(wrapper.get('[data-test="trial-card"]').attributes('data-status')).toBe(status)
    expect(wrapper.get('[data-test="trial-card"]').text()).toContain(result.message)
    expect(wrapper.findAll('[data-test="trial-card"] a, [data-test="trial-card"] button')).toHaveLength(0)
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
