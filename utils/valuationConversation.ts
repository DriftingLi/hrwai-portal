import type { EvaluationRecord, EvaluationRequest } from '~/api/valuation'
import { validateEvaluationForm, type ValidatableForm } from '~/utils/valuationValidator'

export const DRAFT_IDLE_TIMEOUT_MS = 30 * 60 * 1000
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

export interface ConversationDraft {
  id: string
  draft_version: number
  updated_at: string
  fields: DraftFields
  [key: string]: unknown
}

export interface ConversationOperation {
  id: string
  status: 'pending' | 'processing' | 'succeeded' | 'failed'
  evaluation_id?: number
  evaluation?: EvaluationRecord
  error?: string
  [key: string]: unknown
}

export interface DraftSessionSnapshot {
  id: string
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

/** 上游变更只影响这条依赖链；工时、车况、证件等事实不被无关规格改写。 */
const DOWNSTREAM_FIELDS: Partial<Record<DraftFieldKey, DraftFieldKey[]>> = {
  brand: ['vehicle_type', 'series', 'tonnage', 'config_type', 'mast_type', 'mast_height_mm', 'factory_year'],
  vehicle_type: ['series', 'tonnage', 'config_type', 'mast_type', 'mast_height_mm', 'factory_year'],
  series: ['tonnage', 'config_type', 'mast_type', 'mast_height_mm', 'factory_year'],
  tonnage: ['config_type', 'mast_type', 'mast_height_mm', 'factory_year'],
  config_type: ['mast_type', 'mast_height_mm'],
  mast_type: ['mast_height_mm'],
  province: ['city']
}

function descendants(key: DraftFieldKey): DraftFieldKey[] {
  const result: DraftFieldKey[] = []
  for (const child of DOWNSTREAM_FIELDS[key] ?? []) {
    result.push(child, ...descendants(child))
  }
  return [...new Set(result)]
}

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

/** 容忍后端只返回发生变化的字段；缺失字段补成 missing，绝不补成业务默认值。 */
export function normalizeConversationDraft(input: ConversationDraft): ConversationDraft {
  const fields = createDraftFields()
  for (const key of WHOLE_MACHINE_FIELD_KEYS) {
    const field = input.fields?.[key]
    if (field && ['missing', 'unknown', 'value', 'range', 'candidate'].includes(field.status)) {
      fields[key] = { ...field }
    }
  }
  return { ...input, fields }
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
  const affected = new Set(changed.flatMap(descendants))
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
    if (value.operation_id !== undefined && typeof value.operation_id !== 'string') {
      storage.removeItem(DRAFT_SESSION_KEY)
      return null
    }
    if (now - updated >= DRAFT_IDLE_TIMEOUT_MS) {
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
