import type { EvaluationRecord, EvaluationRequest, TrialDraft, UpstreamConversationDraft } from '~/api/valuation'
import { dependentValuationFields } from '~/utils/valuationDependencies'
import { validateEvaluationForm, type ValidatableForm } from '~/utils/valuationValidator'

export const DRAFT_IDLE_TIMEOUT_MS = 30 * 60 * 1000
export const DRAFT_SERVER_TOUCH_WINDOW_MS = 5 * 60 * 1000
export const DRAFT_SESSION_KEY = 'hrwai:valuation-conversation:draft:v1'

export type DraftFieldStatus = 'missing' | 'unknown' | 'value' | 'range' | 'candidate'
export type DraftFieldKey = keyof EvaluationRequest

export interface DraftField {
  status: DraftFieldStatus
  value?: string | number | boolean
  min?: number
  max?: number
  candidates?: Array<string | number>
  evidence?: string
  source?: 'user' | 'dictionary' | 'default'
}

export type DraftFields = Record<DraftFieldKey, DraftField>

/** 草稿的页面视图模型；HTTP 层使用 UpstreamConversationDraft，禁止把 UI 形状发给 FL。 */
export interface ConversationDraft {
  id: string
  version: number
  status: 'editing' | 'submitted'
  updated_at: string
  expires_at: string
  can_undo: boolean
  can_submit: boolean
  supplemental: Record<string, unknown>
  fields: DraftFields
}

export interface ConversationOperation {
  id: string
  operation_id: string
  draft_id: string
  draft_version: number
  status: 'pending' | 'succeeded' | 'failed'
  evaluation_id?: number
  evaluation?: EvaluationRecord
  error_code?: string
  first_accepted_user_id: unknown
  created_at: string
  updated_at: string
}

export interface DraftSessionSnapshot {
  id: string
  expires_at?: string
  operation_id?: string
  updated_at: string
}

interface DraftSessionStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const WHOLE_MACHINE_FIELD_KEYS = [
  'brand',
  'vehicle_type',
  'series',
  'tonnage',
  'config_type',
  'mast_type',
  'mast_height_mm',
  'factory_year',
  'sale_year',
  'usage_hours',
  'original_paint',
  'province',
  'city',
  'has_license_plate',
  'has_registration_certificate',
  'has_maintenance_records',
  'condition_rating'
] as const satisfies readonly DraftFieldKey[]

const BOOLEAN_FIELDS = new Set<DraftFieldKey>([
  'original_paint',
  'has_license_plate',
  'has_registration_certificate',
  'has_maintenance_records'
])

const NUMBER_FIELDS = new Set<DraftFieldKey>([
  'tonnage',
  'mast_height_mm',
  'factory_year',
  'sale_year',
  'usage_hours'
])

function isFieldValue(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

export function createDraftFields(values: Partial<EvaluationRequest> = {}): DraftFields {
  const fields = Object.fromEntries(
    WHOLE_MACHINE_FIELD_KEYS.map((key) => [key, { status: 'missing' }])
  ) as DraftFields
  // 成交年份是可见默认值，不是把未知字段折成 0 / false。
  fields.sale_year = { status: 'value', value: new Date().getFullYear(), source: 'default' }
  for (const key of WHOLE_MACHINE_FIELD_KEYS) {
    const value = values[key]
    if (isFieldValue(value)) fields[key] = { status: 'value', value, source: 'user' }
  }
  return fields
}

export function normalizeConversationDraft(input: UpstreamConversationDraft): ConversationDraft {
  if (!input || !Number.isInteger(input.version) || input.version < 1 ||
    !['editing', 'submitted'].includes(input.status) || typeof input.can_undo !== 'boolean' ||
    typeof input.can_submit !== 'boolean' || !Number.isFinite(Date.parse(input.expires_at))) {
    throw new Error('估值草稿响应格式错误')
  }
  const fields = createDraftFields()
  for (const key of WHOLE_MACHINE_FIELD_KEYS) {
    const field = input.fields?.[key]
    if (!field) continue
    if (!['missing', 'unknown', 'value', 'range', 'candidate'].includes(field.state)) {
      throw new Error('估值草稿字段状态错误')
    }
    if (field.state === 'range') {
      if (!field.range || !Number.isFinite(field.range.min) || !Number.isFinite(field.range.max)) {
        throw new Error('估值草稿范围格式错误')
      }
      fields[key] = {
        status: 'range', min: field.range.min, max: field.range.max,
        ...(typeof field.evidence === 'string' ? { evidence: field.evidence } : {}),
        ...(field.source ? { source: field.source as DraftField['source'] } : {})
      }
    } else if (field.state === 'candidate') {
      fields[key] = {
        status: 'candidate',
        candidates: (field.candidates ?? []).map((candidate) => candidate.value as string | number),
        ...(typeof field.evidence === 'string' ? { evidence: field.evidence } : {}),
        ...(field.source ? { source: field.source as DraftField['source'] } : {})
      }
    } else {
      fields[key] = {
        status: field.state,
        ...(field.state === 'value' ? { value: field.value } : {}),
        ...(typeof field.evidence === 'string' ? { evidence: field.evidence } : {}),
        ...(field.source ? { source: field.source as DraftField['source'] } : {})
      }
    }
  }
  return {
    id: input.id,
    version: input.version,
    status: input.status,
    updated_at: input.updated_at,
    expires_at: input.expires_at,
    can_undo: input.can_undo,
    can_submit: input.can_submit,
    supplemental: input.supplemental ?? {},
    fields
  }
}

export type DraftFormValues = ValidatableForm & Pick<EvaluationRequest,
  | 'original_paint'
  | 'has_license_plate'
  | 'has_registration_certificate'
  | 'has_maintenance_records'
>

export function draftValues(fields: DraftFields): DraftFormValues {
  return Object.fromEntries(
    WHOLE_MACHINE_FIELD_KEYS.map((key) => [key, fields[key]?.status === 'value' ? fields[key]?.value : undefined])
  ) as unknown as DraftFormValues
}

/** 只投影已明确的值与 FL 支持的出厂年份范围；未知/候选不补默认值。 */
export function draftFieldsToTrial(fields: DraftFields): TrialDraft {
  const draft: Record<string, string | number | boolean> = {}
  for (const key of WHOLE_MACHINE_FIELD_KEYS) {
    const field = fields[key]
    if (key === 'factory_year' && field?.status === 'range') {
      if (field.min !== undefined) draft.factory_year_min = field.min
      if (field.max !== undefined) draft.factory_year_max = field.max
    } else if (field?.status === 'value' && field.value !== undefined) {
      draft[key] = field.value
    }
  }
  return draft
}

export function isDraftComplete(draft: ConversationDraft): boolean {
  return WHOLE_MACHINE_FIELD_KEYS.every((key) => draft.fields[key]?.status === 'value')
}

export function draftToEvaluationRequest(draft: ConversationDraft): EvaluationRequest | null {
  if (!isDraftComplete(draft)) return null
  const values = draftValues(draft.fields)
  if (!validateEvaluationForm(values).valid) return null
  return {
    brand: values.brand!,
    vehicle_type: values.vehicle_type!,
    series: values.series!,
    tonnage: values.tonnage!,
    config_type: values.config_type!,
    mast_type: values.mast_type!,
    mast_height_mm: values.mast_height_mm!,
    factory_year: values.factory_year!,
    sale_year: values.sale_year!,
    usage_hours: values.usage_hours!,
    original_paint: Boolean(values.original_paint),
    province: values.province!,
    city: values.city!,
    has_license_plate: Boolean(values.has_license_plate),
    has_registration_certificate: Boolean(values.has_registration_certificate),
    has_maintenance_records: Boolean(values.has_maintenance_records),
    condition_rating: values.condition_rating!
  }
}

export function reconcileDraftFields(
  fields: DraftFields,
  patch: Partial<DraftFields>,
  allowed: Partial<Record<DraftFieldKey, Array<string | number>>> = {}
): DraftFields {
  const next = { ...fields }
  const changed = Object.keys(patch) as DraftFieldKey[]
  const affected = new Set<DraftFieldKey>(changed.flatMap(dependentValuationFields))
  for (const [key, field] of Object.entries(patch)) {
    next[key as DraftFieldKey] = { ...field }
  }
  for (const key of affected) {
    if (changed.includes(key)) continue
    const current = next[key]
    const options = allowed[key]
    const value = current.value
    const comparable = typeof value === 'string' || typeof value === 'number'
    if (options && comparable && options.includes(value)) continue
    const candidates = options?.length
      ? options
      : comparable
        ? [value]
        : current.candidates
    // 未填写/未知/范围不是可自动确认的旧值；保持原状态，等用户实际点选或输入。
    if (!comparable && !current.candidates?.length) continue
    next[key] = {
      status: 'candidate',
      candidates: candidates ? [...candidates] : undefined,
      evidence: current.evidence,
      source: current.source
    }
  }
  return next
}

export function valueField(
  key: DraftFieldKey,
  value: string | number | boolean,
  evidence?: string,
  source: DraftField['source'] = 'user'
): DraftField {
  if (BOOLEAN_FIELDS.has(key)) return { status: 'value', value: Boolean(value), evidence, source }
  if (NUMBER_FIELDS.has(key)) {
    if (typeof value === 'string' && value.trim() === '') return { status: 'missing', evidence }
    const number = Number(value)
    return Number.isFinite(number)
      ? { status: 'value', value: number, evidence, source }
      : { status: 'missing', evidence }
  }
  const text = String(value).trim()
  return text ? { status: 'value', value: text, evidence, source } : { status: 'missing' }
}

export function readDraftSession(storage: DraftSessionStorage, now = Date.now()): DraftSessionSnapshot | null {
  try {
    const raw = storage.getItem(DRAFT_SESSION_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as DraftSessionSnapshot
    const updated = Date.parse(value.updated_at)
    if (typeof value.id !== 'string' || !value.id || !Number.isFinite(updated)) {
      storage.removeItem(DRAFT_SESSION_KEY)
      return null
    }
    if (value.expires_at !== undefined && (typeof value.expires_at !== 'string' || !Number.isFinite(Date.parse(value.expires_at)))) {
      storage.removeItem(DRAFT_SESSION_KEY)
      return null
    }
    if (value.operation_id !== undefined && typeof value.operation_id !== 'string') {
      storage.removeItem(DRAFT_SESSION_KEY)
      return null
    }
    if (now - Date.parse(value.expires_at ?? new Date(updated + DRAFT_IDLE_TIMEOUT_MS).toISOString()) >= 0) {
      storage.removeItem(DRAFT_SESSION_KEY)
      return null
    }
    return value
  } catch {
    storage.removeItem(DRAFT_SESSION_KEY)
    return null
  }
}

export function writeDraftSession(storage: DraftSessionStorage, snapshot: DraftSessionSnapshot): void {
  try {
    storage.setItem(DRAFT_SESSION_KEY, JSON.stringify(snapshot))
  } catch {
    // 隐私模式可能禁用 sessionStorage；草稿仍可在当前页面使用。
  }
}

export function clearDraftSession(storage: DraftSessionStorage): void {
  try {
    storage.removeItem(DRAFT_SESSION_KEY)
  } catch {
    // 同 writeDraftSession：存储不可用不影响内存草稿。
  }
}
