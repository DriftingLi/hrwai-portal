import { ref } from 'vue'
import {
  valuationErrorMessage,
  type TrialDraft,
  type TrialPolicy,
  type TrialRequest,
  type TrialResult,
  type ValuationApi
} from '~/api/valuation'

export type TrialEstimateApi = Pick<ValuationApi, 'estimateTrial'>

export interface TrialEstimateCard {
  readonly requestId: string
  readonly result: TrialResult
  readonly stale: boolean
}

export interface TrialEstimateOptions {
  enabled?: boolean
  policy?: TrialPolicy
  newRequestId?: () => string
}

export interface UseTrialEstimateOptions extends TrialEstimateOptions {
  api?: TrialEstimateApi
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

const MIN_FACTORY_YEAR = 1900
const MAX_TRIAL_YEAR_SPAN = 200

function validFactoryYear(value: unknown, saleYear: unknown): value is number {
  const latest = typeof saleYear === 'number' && Number.isInteger(saleYear) && saleYear >= MIN_FACTORY_YEAR
    ? Math.min(saleYear, new Date().getFullYear())
    : new Date().getFullYear()
  return typeof value === 'number' && Number.isInteger(value) && value >= MIN_FACTORY_YEAR && value <= latest
}

function validFactoryYearRange(draft: TrialDraft): boolean {
  const { factory_year_min: min, factory_year_max: max } = draft
  return validFactoryYear(min, draft.sale_year) && validFactoryYear(max, draft.sale_year) &&
    min <= max && max - min <= MAX_TRIAL_YEAR_SPAN
}

/** 与 FL #2956 一致的最低试算门槛：品牌、目录车型、吨位、明确年份或年份范围。 */
export function isTrialDraftReady(draft: TrialDraft): boolean {
  const hasYear = validFactoryYear(draft.factory_year, draft.sale_year)
  const hasYearRange = draft.factory_year === undefined && validFactoryYearRange(draft)
  const validTonnage = isPositiveNumber(draft.tonnage) && draft.tonnage <= 100
  return hasText(draft.brand) && hasText(draft.vehicle_type) && validTonnage && (hasYear || hasYearRange)
}

export function trialDraftError(draft: TrialDraft): string {
  if (!hasText(draft.brand) || !hasText(draft.vehicle_type) || !isPositiveNumber(draft.tonnage)) {
    return '请先补充品牌、车型、吨位和出厂年份或年份范围'
  }
  if (draft.tonnage > 100) return '吨位应在 0–100 之间'
  if (!isTrialDraftReady(draft)) return `请填写 1900–${new Date().getFullYear()} 的整数出厂年份，或有效年份范围`
  return ''
}

function fallbackRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `valuation-trial-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value)
    } catch {
      // Vue reactive proxy 不能直接 structuredClone；试算契约是 JSON，走序列化快照。
    }
  }
  return JSON.parse(JSON.stringify(value)) as T
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child)
    Object.freeze(value)
  }
  return value
}

export function createTrialEstimateController(api: TrialEstimateApi, options: TrialEstimateOptions = {}) {
  const enabled = options.enabled ?? false
  const policy = options.policy ?? 'demo'
  const newRequestId = options.newRequestId ?? fallbackRequestId
  const cards = ref<readonly TrialEstimateCard[]>([])
  const loading = ref(false)
  const error = ref('')
  let latestDraft: TrialDraft | null = null
  let autoAttempted = false
  let draftRevision = 0
  let requestSequence = 0
  let latestRequestSequence = 0
  let pendingRequests = 0
  let snapshotId = ''

  async function updateDraft(draft: TrialDraft, auto = true): Promise<void> {
    latestDraft = cloneValue(draft)
    draftRevision += 1
    if (cards.value.length > 0) {
      cards.value = cards.value.map((card) =>
        card.stale ? card : Object.freeze({ ...card, stale: true })
      )
    }
    if (!auto || !enabled || autoAttempted || !isTrialDraftReady(draft)) return
    autoAttempted = true
    await recalculate()
  }

  async function recalculate(): Promise<TrialEstimateCard | null> {
    if (!enabled || !latestDraft) return null
    if (!isTrialDraftReady(latestDraft)) {
      error.value = trialDraftError(latestDraft)
      return null
    }
    const requestId = newRequestId()
    const request: TrialRequest = {
      ...cloneValue(latestDraft),
      request_id: requestId,
      policy,
      ...(snapshotId ? { snapshot_id: snapshotId } : {})
    }
    const sequence = ++requestSequence
    latestRequestSequence = sequence
    const requestDraftRevision = draftRevision
    pendingRequests += 1
    loading.value = true
    error.value = ''
    try {
      const result = deepFreeze(cloneValue(await api.estimateTrial(request)))
      if (sequence !== latestRequestSequence) return null
      snapshotId = result.snapshot_id || result.snapshot?.hash || snapshotId
      const card: TrialEstimateCard = Object.freeze({
        requestId,
        result,
        stale: requestDraftRevision !== draftRevision
      })
      cards.value = [...cards.value, card]
      return card
    } catch (cause) {
      if (sequence === latestRequestSequence) {
        error.value = valuationErrorMessage(cause, '参考试算失败，请稍后重试')
      }
      return null
    } finally {
      pendingRequests -= 1
      loading.value = pendingRequests > 0
    }
  }

  return { cards, loading, error, updateDraft, recalculate }
}

export function useTrialEstimate(options: UseTrialEstimateOptions = {}) {
  const config = useRuntimeConfig()
  return createTrialEstimateController(options.api ?? useValuationApi(), {
    enabled: options.enabled ?? config.public.valuationTrialEnabled === true,
    policy: options.policy ?? (config.public.valuationTrialPolicy === 'pilot' ? 'pilot' : 'demo'),
    newRequestId: options.newRequestId
  })
}
