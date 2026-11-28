import { describe, expect, it } from 'vitest'
import {
  DRAFT_IDLE_TIMEOUT_MS,
  createDraftFields,
  draftToEvaluationRequest,
  isDraftComplete,
  readDraftSession,
  reconcileDraftFields,
  valueField,
  writeDraftSession,
  type ConversationDraft,
  type DraftField
} from '../valuationConversation'

const currentYear = new Date().getFullYear()

function completeDraft(): ConversationDraft {
  return {
    id: 'draft-1',
    draft_version: 3,
    updated_at: new Date().toISOString(),
    fields: createDraftFields({
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
    })
  }
}

describe('估值对话草稿状态机', () => {
  it('区分未提供、明确未知、范围、候选和具体值', () => {
    const fields = createDraftFields()
    expect(fields.brand).toEqual({ status: 'missing' })

    const changed: Record<string, DraftField> = {
      ...fields,
      brand: { status: 'unknown' },
      tonnage: { status: 'range', min: 3, max: 3.5 },
      config_type: { status: 'candidate', candidates: ['标准', '经济'] },
      usage_hours: { status: 'value', value: 0 },
      has_registration_certificate: { status: 'value', value: false }
    }
    expect(changed.brand?.status).toBe('unknown')
    expect(changed.tonnage?.status).toBe('range')
    expect(changed.config_type?.status).toBe('candidate')
    expect(changed.usage_hours?.value).toBe(0)
    expect(changed.has_registration_certificate?.value).toBe(false)
  })

  it('真实 0、false 和无门架都是已核对的完整值，可以形成正式请求', () => {
    const draft = completeDraft()
    expect(isDraftComplete(draft)).toBe(true)
    expect(draftToEvaluationRequest(draft)).toMatchObject({
      usage_hours: 0,
      mast_height_mm: 0,
      original_paint: false,
      has_license_plate: false,
      has_registration_certificate: false,
      has_maintenance_records: false
    })
  })

  it('未知、范围或候选字段不能形成正式请求', () => {
    for (const status of ['unknown', 'range', 'candidate', 'missing'] as const) {
      const draft = completeDraft()
      draft.fields.usage_hours = { status, value: 0, min: 0, max: 100 }
      expect(isDraftComplete(draft)).toBe(false)
      expect(draftToEvaluationRequest(draft)).toBeNull()
    }
  })

  it('清空数字输入恢复未提供，不把空字符串伪造成 0', () => {
    expect(valueField('usage_hours', '')).toEqual({ status: 'missing', evidence: undefined })
    expect(valueField('usage_hours', '0')).toMatchObject({ status: 'value', value: 0 })
  })

  it('更正上游规格只重验下游，保留无关事实；兼容值保留，不兼容值成为候选', () => {
    const draft = completeDraft()
    const fields = reconcileDraftFields(draft.fields, { tonnage: { status: 'value', value: 3.5 } }, {
      config_type: ['标准'],
      mast_type: ['两级门架'],
      mast_height_mm: [0]
    })

    expect(fields.tonnage).toEqual({ status: 'value', value: 3.5 })
    expect(fields.usage_hours).toMatchObject({ status: 'value', value: 0 })
    expect(fields.city).toMatchObject({ status: 'value', value: '苏州市' })
    expect(fields.config_type).toMatchObject({ status: 'value', value: '标准' })
    expect(fields.mast_type).toMatchObject({ status: 'value', value: '两级门架' })
    expect(fields.mast_height_mm).toMatchObject({ status: 'value', value: 0 })
  })

  it('下游值不在新候选中时标为待确认，不伪造成明确值', () => {
    const fields = reconcileDraftFields(completeDraft().fields, { tonnage: { status: 'value', value: 3.5 } }, {
      config_type: ['重载'],
      mast_type: [],
      mast_height_mm: []
    })
    expect(fields.config_type).toMatchObject({ status: 'candidate', candidates: ['重载'] })
    expect(fields.mast_type?.status).toBe('candidate')
    expect(fields.mast_height_mm?.status).toBe('candidate')
  })
})

describe('草稿标签页恢复', () => {
  it('只保存草稿标识、操作标识和过期时间，不保存消息或结果卡', () => {
    const storage = new Map<string, string>()
    const session = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key)
    }
    writeDraftSession(session, {
      id: 'draft-1',
      operation_id: 'operation-1',
      updated_at: new Date().toISOString()
    })
    const raw = storage.get('hrwai:valuation-conversation:draft:v1') ?? ''
    expect(Object.keys(JSON.parse(raw))).toEqual(['id', 'operation_id', 'updated_at'])
    expect(raw).not.toContain('message')
    expect(raw).not.toContain('estimated_value')
    expect(readDraftSession(session, Date.now())).toMatchObject({
      id: 'draft-1', operation_id: 'operation-1'
    })
  })

  it('闲置满 30 分钟即清除恢复数据', () => {
    const values = new Map<string, string>([
      ['hrwai:valuation-conversation:draft:v1', JSON.stringify({
        id: 'draft-1', updated_at: new Date(0).toISOString()
      })]
    ])
    const session = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key)
    }
    expect(DRAFT_IDLE_TIMEOUT_MS).toBe(30 * 60 * 1000)
    expect(readDraftSession(session, DRAFT_IDLE_TIMEOUT_MS)).toBeNull()
    expect(session.getItem('hrwai:valuation-conversation:draft:v1')).toBeNull()
  })
})
