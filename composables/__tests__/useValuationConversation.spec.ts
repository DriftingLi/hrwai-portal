import { describe, expect, it, vi } from 'vitest'
import type { EvaluationRequest } from '~/api/valuation'
import {
  createDraftFields,
  type ConversationDraft,
  type DraftFields
} from '~/utils/valuationConversation'
import { createValuationConversationController } from '../useValuationConversation'
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
  province: '江苏省',
  city: '苏州市',
  has_license_plate: false,
  has_registration_certificate: false,
  has_maintenance_records: false,
  condition_rating: 'B'
}

function draft(version = 1, fields: DraftFields = createDraftFields()): ConversationDraft {
  return { id: 'draft-1', draft_version: version, updated_at: new Date().toISOString(), fields }
}

function setup(options: { restored?: ConversationDraft; fields?: DraftFields; now?: () => number } = {}) {
  let version = options.restored?.draft_version ?? 0
  let fields = options.fields ?? options.restored?.fields ?? createDraftFields()
  const api = {
    createConversationDraft: vi.fn(async () => {
      version = 1
      return draft(version, fields)
    }),
    getConversationDraft: vi.fn(async () => draft(version, fields)),
    updateConversationDraft: vi.fn(async (_id: string, body: { draft_version: number; fields: Partial<DraftFields> }) => {
      if (body.draft_version !== version) throw Object.assign(new Error('版本冲突'), { statusCode: 409 })
      version += 1
      fields = { ...fields, ...body.fields }
      return draft(version, fields)
    }),
    undoConversationDraft: vi.fn(async (_id: string, body: { draft_version: number }) => {
      if (body.draft_version !== version) throw Object.assign(new Error('版本冲突'), { statusCode: 409 })
      version += 1
      fields = { ...fields, usage_hours: { status: 'value', value: 4800 } }
      return draft(version, fields)
    }),
    deleteConversationDraft: vi.fn(async () => ({ deleted: true })),
    createConversationOperation: vi.fn(async (body: { operation_id: string; request: EvaluationRequest }) => ({
      id: body.operation_id,
      status: 'succeeded' as const,
      evaluation: { ...body.request, id: 88 }
    })),
    getConversationOperation: vi.fn(async (id: string) => ({
      id,
      status: 'succeeded' as const,
      evaluation: { ...completeValues, id: 88 }
    }))
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
    newOperationId: () => `operation-${++operationSequence}`
  })
  return { api, controller, storage }
}

describe('对话草稿控制器', () => {
  it('同一标签刷新按 id 恢复草稿，不创建第二份', async () => {
    const { api, controller, storage } = setup({ restored: draft(4) })
    storage.set('hrwai:valuation-conversation:draft:v1', JSON.stringify({
      id: 'draft-1', updated_at: new Date().toISOString()
    }))
    await controller.restore()
    expect(api.getConversationDraft).toHaveBeenCalledWith('draft-1')
    expect(api.createConversationDraft).not.toHaveBeenCalled()
    expect(controller.draft.value?.draft_version).toBe(4)
  })

  it('快速修改串行使用 CAS 版本，撤回调用独立 undo 端点', async () => {
    const { api, controller } = setup()
    await controller.restore()
    await Promise.all([
      controller.setField('usage_hours', 0, '铭牌 0 小时'),
      controller.setField('has_registration_certificate', false, '用户明确说明没有')
    ])
    expect(api.updateConversationDraft.mock.calls.map((call) => call[1].draft_version)).toEqual([1, 2])
    expect(controller.draft.value?.fields.usage_hours).toMatchObject({ status: 'value', value: 0 })
    expect(controller.draft.value?.fields.has_registration_certificate).toMatchObject({ status: 'value', value: false })

    await controller.undo()
    expect(api.undoConversationDraft).toHaveBeenCalledWith('draft-1', { draft_version: 3 })
    expect(controller.draft.value?.draft_version).toBe(4)
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
    await expect(controller.confirm(controller.draft.value!.draft_version - 1)).rejects.toThrow('草稿版本已变化')
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
})
