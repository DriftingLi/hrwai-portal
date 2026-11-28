import { describe, expect, it, vi } from 'vitest'
import type { EvaluationRequest } from '~/api/valuation'
import {
  createDraftFields,
  type ConversationDraft,
  type DraftFields
} from '~/utils/valuationConversation'
import { createValuationConversationController } from '../useValuationConversation'
import { normalizeConversationDraft } from '~/utils/valuationConversation'
import type { UpstreamConversationDraft, ValuationSuggestionResult } from '~/api/valuation'
import { ValuationApiError } from '~/api/valuation'
import { validateEvaluationForm } from '~/utils/valuationValidator'
import { draftValues } from '~/utils/valuationConversation'

const currentYear = new Date().getFullYear()
const completeValues: EvaluationRequest = {
  brand: '合力',
  vehicle_type: '电动平衡重式',
  series: 'H 系列',
  tonnage: 3,
  config_type: '标准',
  mast_type: '两级门架',
  mast_height_mm: 0,
  factory_year: 2021,
  sale_year: currentYear,
  usage_hours: 0,
  original_paint: false,
  province: '江苏',
  city: '苏州',
  has_license_plate: false,
  has_registration_certificate: false,
  has_maintenance_records: false,
  condition_rating: 'B'
}

function upstreamDraft(version: number, fields: DraftFields = createDraftFields(), nowMs = Date.now()) {
  const wireFields = Object.fromEntries(Object.entries(fields).map(([key, field]) => {
    const common = { ...(field.evidence ? { evidence: field.evidence } : {}), ...(field.source ? { source: field.source } : {}) }
    if (field.status === 'range') return [key, { state: 'range', range: { min: field.min, max: field.max }, ...common }]
    if (field.status === 'candidate') return [key, { state: 'candidate', candidates: field.candidates?.map((value) => ({ value })), ...common }]
    return [key, { state: field.status, ...(field.status === 'value' ? { value: field.value } : {}), ...common }]
  }))
  return {
    id: 'draft-1', version, status: 'editing' as const,
    updated_at: new Date(nowMs).toISOString(), expires_at: new Date(nowMs + 30 * 60 * 1000).toISOString(),
    fields: wireFields, supplemental: {}, can_undo: version > 1, can_submit: false
  }
}

function draft(version = 1, fields: DraftFields = createDraftFields()): ConversationDraft {
  return normalizeConversationDraft(upstreamDraft(version, fields))
}

function setup(options: { restored?: UpstreamConversationDraft; fields?: DraftFields; now?: () => number; maxSuggestionPolls?: number } = {}) {
  let version = options.restored?.version ?? 0
  let fields = options.fields ?? createDraftFields()
  const history: DraftFields[] = []
  const api = {
    createConversationDraft: vi.fn(async () => {
      version = 1
      return upstreamDraft(version, fields, options.now?.())
    }),
    getConversationDraft: vi.fn(async () => upstreamDraft(version, fields, options.now?.())),
    updateConversationDraft: vi.fn(async (_id: string, body: { base_version: number; fields: Partial<DraftFields> }) => {
      if (body.base_version !== version) throw Object.assign(new Error('版本冲突'), { statusCode: 409 })
      history.push(fields)
      version += 1
      fields = { ...fields, ...body.fields }
      return upstreamDraft(version, fields, options.now?.())
    }),
    undoConversationDraft: vi.fn(async (_id: string, body: { base_version: number }) => {
      if (body.base_version !== version) throw Object.assign(new Error('版本冲突'), { statusCode: 409 })
      version += 1
      fields = history.pop() ?? fields
      return { ...upstreamDraft(version, fields, options.now?.()), can_undo: false }
    }),
    deleteConversationDraft: vi.fn(async () => ({ deleted: true })),
    suggestConversationDraft: vi.fn(async (_id: string, body: { operation_id: string }) => ({
      id: `op:draft-1:${body.operation_id}`,
      operation_id: `op:draft-1:${body.operation_id}`,
      status: 'pending' as const
    })),
    createConversationOperation: vi.fn(async (body: { operation_id: string; request: EvaluationRequest }) => ({
      id: body.operation_id,
      status: 'succeeded' as const,
      evaluation: { ...body.request, id: 88 }
    })),
    getConversationOperation: vi.fn(async (id: string) => id.startsWith('op:')
      ? {
          id, status: 'succeeded' as const,
          result: { schema_version: 1, patches: {}, supplements: {}, questions: [], draft_version: version }
        }
      : {
          id,
          status: 'succeeded' as const,
          evaluation: { ...completeValues, id: 88 }
        })
  }
  const storage = new Map<string, string>()
  let operationSequence = 0
  const controller = createValuationConversationController(api as never, {
    storage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key)
    },
    sleep: async () => {},
    now: options.now ?? Date.now,
    maxSuggestionPolls: options.maxSuggestionPolls,
    newOperationId: () => `operation-${++operationSequence}`
  })
  return { api, controller, storage }
}

describe('对话草稿控制器', () => {
  it('同一标签刷新按 id 恢复草稿，不创建第二份', async () => {
    const { api, controller, storage } = setup({ restored: upstreamDraft(4) })
    storage.set('hrwai:valuation-conversation:draft:v1', JSON.stringify({
      id: 'draft-1', updated_at: new Date().toISOString()
    }))
    await controller.restore()
    expect(api.getConversationDraft).toHaveBeenCalledWith('draft-1')
    expect(api.createConversationDraft).not.toHaveBeenCalled()
    expect(controller.draft.value?.version).toBe(4)
    expect(controller.canUndo.value).toBe(true)
  })

  it('恢复后的可撤回状态只来自服务端 can_undo，不凭本地修改历史猜测', async () => {
    const { controller } = setup({ restored: { ...upstreamDraft(4), can_undo: false } })
    await controller.restore()
    expect(controller.canUndo.value).toBe(false)
  })

  it('活跃操作通过空字段 PATCH 续期服务端 TTL，并按 CAS 生成新版本', async () => {
    let time = Date.now()
    const { api, controller } = setup({ now: () => time })
    await controller.restore()
    time += 26 * 60 * 1000
    const serverExpiry = controller.draft.value!.expires_at
    expect(api.updateConversationDraft).not.toHaveBeenCalled()
    await controller.touch()
    expect(api.updateConversationDraft).toHaveBeenCalledWith('draft-1', { base_version: 1, fields: {} })
    expect(controller.draft.value?.version).toBe(2)
    expect(Date.parse(controller.draft.value!.expires_at)).toBeGreaterThan(Date.parse(serverExpiry))
    expect(controller.draft.value?.fields.usage_hours.status).toBe('missing')
  })

  it('快速修改串行使用 CAS 版本，撤回调用独立 undo 端点', async () => {
    const { api, controller } = setup()
    await controller.restore()
    await Promise.all([
      controller.setField('usage_hours', 0, '铭牌 0 小时'),
      controller.setField('has_registration_certificate', false, '用户明确说明没有')
    ])
    expect(api.updateConversationDraft.mock.calls.map((call) => call[1].base_version)).toEqual([1, 2])
    expect(controller.draft.value?.fields.usage_hours).toMatchObject({ status: 'value', value: 0 })
    expect(controller.draft.value?.fields.has_registration_certificate).toMatchObject({ status: 'value', value: false })

    await controller.undo()
    expect(api.undoConversationDraft).toHaveBeenCalledWith('draft-1', { base_version: 3 })
    expect(controller.draft.value?.version).toBe(4)
    expect(controller.canUndo.value).toBe(false)
  })

  it('未核对完整版本不能确认；0 与 false 的完整版本可以确认', async () => {
    const { api, controller } = setup()
    await controller.restore()
    await expect(controller.confirm()).rejects.toThrow('请先补全并核对车辆信息')
    expect(api.createConversationOperation).not.toHaveBeenCalled()

    for (const [key, value] of Object.entries(completeValues)) {
      await controller.setField(key as keyof EvaluationRequest, value)
    }
    expect(controller.complete.value).toBe(true)
    expect(validateEvaluationForm(draftValues(controller.draft.value!.fields))).toEqual({ valid: true })
    await expect(controller.confirm(controller.draft.value!.version - 1)).rejects.toThrow('草稿版本已变化')
    const record = await controller.confirm()
    expect(record.id).toBe(88)
    expect(api.createConversationOperation.mock.calls[0]?.[0]).toMatchObject({
      draft_id: 'draft-1',
      request: { usage_hours: 0, has_registration_certificate: false }
    })
  })

  it('网络重试与并发重复点击复用同一 operation，最多返回一条正式记录', async () => {
    const { api, controller } = setup({ fields: createDraftFields(completeValues) })
    api.createConversationOperation.mockRejectedValueOnce(new Error('network disconnected'))
    await controller.restore()

    await expect(controller.confirm()).rejects.toThrow('network disconnected')
    const operationId = api.createConversationOperation.mock.calls[0]![0].operation_id
    const [first, second] = await Promise.all([controller.confirm(), controller.confirm()])
    expect(first.id).toBe(88)
    expect(second.id).toBe(88)
    expect(api.createConversationOperation).toHaveBeenCalledTimes(2)
    expect(api.createConversationOperation.mock.calls[1]![0].operation_id).toBe(operationId)
  })

  it('确认后的新修改开启新 operation，旧正式结果不被覆盖', async () => {
    const { api, controller } = setup({ fields: createDraftFields(completeValues) })
    await controller.restore()
    const first = await controller.confirm()
    await controller.setField('usage_hours', 6200)
    const second = await controller.confirm()
    expect(first.id).toBe(88)
    expect(second.usage_hours).toBe(6200)
    expect(api.createConversationOperation.mock.calls[0]![0].operation_id).not.toBe(
      api.createConversationOperation.mock.calls[1]![0].operation_id
    )
  })

  it('pending 操作按 id 轮询，成功后不重复创建', async () => {
    const { api, controller } = setup({ fields: createDraftFields(completeValues) })
    api.createConversationOperation.mockResolvedValueOnce({ id: 'operation-1', status: 'pending' } as never)
    await controller.restore()
    const record = await controller.confirm()
    expect(record.id).toBe(88)
    expect(api.createConversationOperation).toHaveBeenCalledTimes(1)
    expect(api.getConversationOperation).toHaveBeenCalledWith('operation-1')
  })

  it('并发修改全部结束前保持 saving，避免提前启用确认', async () => {
    const { api, controller } = setup()
    const original = api.updateConversationDraft.getMockImplementation()!
    const releases: Array<() => void> = []
    api.updateConversationDraft.mockImplementation(async (id, body) => {
      await new Promise<void>((resolve) => releases.push(resolve))
      return original(id, body)
    })
    await controller.restore()
    const first = controller.setField('usage_hours', 0)
    const second = controller.setField('has_registration_certificate', false)
    await vi.waitFor(() => expect(releases).toHaveLength(1))
    expect(controller.saving.value).toBe(true)
    releases[0]!()
    await vi.waitFor(() => expect(releases).toHaveLength(2))
    expect(controller.saving.value).toBe(true)
    releases[1]!()
    await Promise.all([first, second])
    expect(controller.saving.value).toBe(false)
  })

  it('闲置满 30 分钟清除内存草稿与标签页恢复标识', async () => {
    let time = Date.now()
    const { controller, storage } = setup({ now: () => time })
    await controller.restore()
    expect(storage.size).toBe(1)
    time += 30 * 60 * 1000
    expect(controller.expireIfIdle()).toBe(true)
    expect(controller.draft.value).toBeNull()
    expect(storage.size).toBe(0)
    expect(controller.expireIfIdle()).toBe(false)
  })

  it('一句话多项建议只预填明确值，并原样保留 0 与 false', async () => {
    const { api, controller } = setup()
    const result: ValuationSuggestionResult = {
      schema_version: 1,
      patches: {
        tonnage: { state: 'value', value: 3.5, evidence: ['真实目录', '模型整理'] },
        usage_hours: { state: 'value', value: 0 },
        has_registration_certificate: { state: 'value', value: false }
      },
      supplements: { usage_hours: '仪表显示 0 小时' },
      questions: ['是否有保养记录？'],
      draft_version: 1
    }
    api.getConversationOperation.mockResolvedValueOnce({ id: 'op:test', status: 'succeeded', result } as never)
    await controller.restore()

    await expect(controller.submitSuggestion('3.5 吨，0 小时，没有登记证')).resolves.toBe(true)
    expect(api.suggestConversationDraft).toHaveBeenCalledWith('draft-1', {
      operation_id: expect.any(String), base_version: 1, text: '3.5 吨，0 小时，没有登记证'
    })
    expect(api.getConversationOperation).toHaveBeenCalledWith(expect.stringContaining('op:draft-1:'))
    expect(api.updateConversationDraft).toHaveBeenCalledWith('draft-1', expect.objectContaining({
      base_version: 1,
      fields: expect.objectContaining({
        tonnage: expect.objectContaining({ status: 'value', value: 3.5, evidence: '真实目录；模型整理' }),
        usage_hours: expect.objectContaining({ status: 'value', value: 0 }),
        has_registration_certificate: expect.objectContaining({ status: 'value', value: false })
      })
    }))
    expect(controller.suggestion.value).toMatchObject({ supplements: { usage_hours: '仪表显示 0 小时' }, questions: ['是否有保养记录？'] })
    expect(api.createConversationOperation).not.toHaveBeenCalled()
  })

  it('候选冲突展示真实目录候选，点选后才写入且不占建议额度', async () => {
    const { api, controller } = setup({ fields: createDraftFields({ ...completeValues, tonnage: 3 }) })
    const result: ValuationSuggestionResult = {
      schema_version: 1,
      patches: {
        tonnage: {
          state: 'candidate',
          candidates: [
            { id: 'tonnage:3', label: '3 吨', value: 3, source: 'user' },
            { id: 'tonnage:3.5', label: '3.5 吨', value: 3.5, source: 'dictionary' }
          ]
        }
      },
      supplements: {}, questions: [], draft_version: 1
    }
    api.getConversationOperation.mockResolvedValueOnce({ id: 'op:test', status: 'succeeded', result } as never)
    await controller.restore()
    await controller.submitSuggestion('也许 3.5 吨')
    expect(api.updateConversationDraft).not.toHaveBeenCalled()
    expect(controller.draft.value?.fields.tonnage).toMatchObject({ status: 'value', value: 3 })
    expect(controller.suggestion.value?.patches.tonnage?.candidates).toHaveLength(2)

    const accepted = controller.acceptedSuggestions.value
    await controller.chooseSuggestionCandidate('tonnage', 3.5)
    expect(controller.draft.value?.fields.tonnage).toMatchObject({ status: 'value', value: 3.5 })
    expect(controller.draft.value?.fields.config_type).toMatchObject({ status: 'candidate', candidates: ['标准'] })
    expect(controller.suggestion.value).toBeNull()
    expect(controller.acceptedSuggestions.value).toBe(accepted)
    expect(api.suggestConversationDraft).toHaveBeenCalledTimes(1)
  })

  it('吨位 3 改 3.5 时把未提供的旧下游配置降为候选，不伪造兼容', async () => {
    const { api, controller } = setup({ fields: createDraftFields({ ...completeValues, tonnage: 3, config_type: '3 吨配置' }) })
    api.getConversationOperation.mockResolvedValueOnce({
      id: 'op:test', status: 'succeeded',
      result: { schema_version: 1, patches: { tonnage: { state: 'value', value: 3.5 } }, supplements: {}, questions: [], draft_version: 1 }
    } as never)
    await controller.restore()
    await controller.submitSuggestion('改成 3.5 吨')

    expect(controller.draft.value?.fields.tonnage).toMatchObject({ status: 'value', value: 3.5 })
    expect(controller.draft.value?.fields.config_type).toMatchObject({ status: 'candidate', candidates: ['3 吨配置'] })
    expect(controller.complete.value).toBe(false)
  })

  it('晚到的 succeeded 响应在草稿已变化时丢弃，不覆盖手动编辑', async () => {
    const { api, controller } = setup()
    let release!: () => void
    api.getConversationOperation.mockImplementationOnce(() => new Promise((resolve) => {
      release = () => resolve({
        id: 'op:test', status: 'succeeded',
        result: { schema_version: 1, patches: { usage_hours: { state: 'value', value: 0 } }, supplements: {}, questions: [], draft_version: 1 }
      } as never)
    }))
    await controller.restore()
    const pending = controller.submitSuggestion('0 小时')
    await vi.waitFor(() => expect(api.getConversationOperation).toHaveBeenCalled())
    await controller.setField('usage_hours', 1234, '用户手动修改')
    release()

    await expect(pending).resolves.toBe(false)
    expect(controller.draft.value?.fields.usage_hours).toMatchObject({ status: 'value', value: 1234 })
    expect(controller.suggestionStatus.value).toBe('stale')
    expect(controller.suggestion.value).toBeNull()
    expect(api.updateConversationDraft).toHaveBeenCalledTimes(1)
  })

  it.each([
    [undefined, 'suggestion_validation_failed'],
    [2, 'draft_version_conflict']
  ])('succeeded 建议的 draft_version=%s 与当前版本不一致时不应用', async (resultVersion, expectedCode) => {
    const { api, controller } = setup()
    api.getConversationOperation.mockResolvedValueOnce({
      id: 'op:test', status: 'succeeded',
      result: {
        schema_version: 1, patches: { usage_hours: { state: 'value', value: 0 } },
        supplements: {}, questions: [], draft_version: resultVersion
      }
    } as never)
    await controller.restore()

    await expect(controller.submitSuggestion('0 小时')).resolves.toBe(false)
    expect(controller.suggestionErrorCode.value).toBe(expectedCode)
    expect(controller.suggestion.value).toBeNull()
    expect(controller.draft.value?.version).toBe(1)
    expect(api.updateConversationDraft).not.toHaveBeenCalled()
    await controller.setField('usage_hours', 1234, '用户手动修改')
    expect(controller.draft.value?.fields.usage_hours).toMatchObject({ status: 'value', value: 1234 })
  })

  it('建议网络重试复用同一 operation_id，不重复计算页面受理次数', async () => {
    const { api, controller } = setup()
    api.suggestConversationDraft.mockRejectedValueOnce(new Error('network disconnected'))
    await controller.restore()

    await expect(controller.submitSuggestion('0 小时')).resolves.toBe(false)
    await expect(controller.submitSuggestion('0 小时')).resolves.toBe(true)
    expect(api.suggestConversationDraft).toHaveBeenCalledTimes(2)
    expect(api.suggestConversationDraft.mock.calls[1]![1].operation_id).toBe(api.suggestConversationDraft.mock.calls[0]![1].operation_id)
    expect(controller.acceptedSuggestions.value).toBe(1)
  })

  it.each([
    [400, 'suggestion_validation_failed', '描述未通过校验'],
    [429, 'suggestion_quota_exceeded', '建议额度已耗尽'],
    [408, 'suggestion_timeout', '建议等待超时'],
    [504, 'suggestion_timeout', '建议等待超时']
  ])('信封错误 %s 映射为固定降级且保留手动填写', async (status, expectedCode, expectedMessage) => {
    const { api, controller } = setup()
    api.suggestConversationDraft.mockRejectedValueOnce(new ValuationApiError('上游原始错误', status))
    await controller.restore()

    await expect(controller.submitSuggestion('帮我整理')).resolves.toBe(false)
    expect(controller.suggestionErrorCode.value).toBe(expectedCode)
    expect(controller.suggestionError.value).toContain(expectedMessage)
    expect(controller.suggestionError.value).not.toContain('暂时不可用')
    await controller.setField('usage_hours', 0)
    expect(controller.draft.value?.fields.usage_hours).toMatchObject({ status: 'value', value: 0 })
  })

  it('第九次建议被 429 拒绝时保留草稿并锁住模型入口，手动仍可修改', async () => {
    const { api, controller } = setup()
    await controller.restore()
    for (let index = 0; index < 8; index += 1) await controller.submitSuggestion(`第 ${index + 1} 次`)
    api.suggestConversationDraft.mockRejectedValueOnce(Object.assign(new Error('草稿建议额度已耗尽'), { statusCode: 429 }))

    await expect(controller.submitSuggestion('第九次')).resolves.toBe(false)
    expect(controller.suggestionErrorCode.value).toBe('suggestion_quota_exceeded')
    expect(controller.quotaExhausted.value).toBe(true)
    expect(controller.suggestionRemaining.value).toBe(0)
    expect(controller.draft.value?.version).toBe(1)
    await controller.setField('usage_hours', 0)
    expect(controller.draft.value?.fields.usage_hours).toMatchObject({ status: 'value', value: 0 })
  })

  it('轮询超时保留同一 retry operation，重试恢复且不重复计额度', async () => {
    const { api, controller } = setup({ maxSuggestionPolls: 1 })
    api.getConversationOperation.mockResolvedValue({ id: 'op:test', status: 'pending' } as never)
    api.suggestConversationDraft
      .mockResolvedValueOnce({ id: 'op:first', operation_id: 'op:first', status: 'pending' } as never)
      .mockResolvedValueOnce({
        id: 'op:first', operation_id: 'op:first', status: 'succeeded',
        result: { schema_version: 1, patches: {}, supplements: {}, questions: [], draft_version: 1 }
      } as never)
    await controller.restore()

    await expect(controller.submitSuggestion('帮我整理')).resolves.toBe(false)
    expect(controller.suggestionErrorCode.value).toBe('suggestion_timeout')
    expect(controller.suggestionStatus.value).toBe('failed')
    expect(controller.draft.value?.version).toBe(1)

    await expect(controller.submitSuggestion('帮我整理')).resolves.toBe(true)
    expect(api.suggestConversationDraft).toHaveBeenCalledTimes(2)
    expect(api.suggestConversationDraft.mock.calls[1]![1].operation_id).toBe(api.suggestConversationDraft.mock.calls[0]![1].operation_id)
    expect(controller.acceptedSuggestions.value).toBe(1)
  })

  it('服务端 suggestion_timeout 后重试复用同一 operation，不按新建议扣额度', async () => {
    const { api, controller } = setup()
    api.getConversationOperation.mockResolvedValueOnce({
      id: 'op:first', operation_id: 'op:first', status: 'failed', error_code: 'suggestion_timeout'
    } as never)
    api.suggestConversationDraft
      .mockResolvedValueOnce({ id: 'op:first', operation_id: 'op:first', status: 'pending' } as never)
      .mockResolvedValueOnce({
        id: 'op:first', operation_id: 'op:first', status: 'succeeded',
        result: { schema_version: 1, patches: {}, supplements: {}, questions: [], draft_version: 1 }
      } as never)
    await controller.restore()

    await expect(controller.submitSuggestion('帮我整理')).resolves.toBe(false)
    expect(controller.suggestionErrorCode.value).toBe('suggestion_timeout')
    await expect(controller.submitSuggestion('帮我整理')).resolves.toBe(true)
    expect(api.suggestConversationDraft.mock.calls[1]![1].operation_id).toBe(api.suggestConversationDraft.mock.calls[0]![1].operation_id)
    expect(controller.acceptedSuggestions.value).toBe(1)
  })

  it('撤回建议预填后清空候选复核并恢复上一版', async () => {
    const { api, controller } = setup()
    api.getConversationOperation.mockResolvedValueOnce({
      id: 'op:test', status: 'succeeded',
      result: { schema_version: 1, patches: { usage_hours: { state: 'value', value: 0 } }, supplements: {}, questions: [], draft_version: 1 }
    } as never)
    await controller.restore()
    await controller.submitSuggestion('0 小时')
    expect(controller.draft.value?.fields.usage_hours).toMatchObject({ status: 'value', value: 0 })

    await controller.undo()
    expect(controller.draft.value?.fields.usage_hours.status).toBe('missing')
    expect(controller.suggestion.value).toBeNull()
  })
})
