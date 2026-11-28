import { computed, ref } from 'vue'
import {
  valuationErrorStatus,
  type EvaluationRecord,
  type ValuationApi
} from '~/api/valuation'
import {
  DRAFT_IDLE_TIMEOUT_MS,
  clearDraftSession,
  draftToEvaluationRequest,
  normalizeConversationDraft,
  readDraftSession,
  reconcileDraftFields,
  valueField,
  writeDraftSession,
  type ConversationDraft,
  type ConversationOperation,
  type DraftField,
  type DraftFieldKey,
  type DraftFields,
  type DraftSessionSnapshot
} from '~/utils/valuationConversation'

type ConversationApi = Pick<ValuationApi,
  | 'createConversationDraft'
  | 'getConversationDraft'
  | 'updateConversationDraft'
  | 'undoConversationDraft'
  | 'deleteConversationDraft'
  | 'createConversationOperation'
  | 'getConversationOperation'
  | 'getEvaluation'
>

interface ControllerOptions {
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
  now?: () => number
  sleep?: (milliseconds: number) => Promise<void>
  newOperationId?: () => string
}

function browserStorage(): ControllerOptions['storage'] {
  return typeof window === 'undefined' ? undefined : window.sessionStorage
}

function fallbackOperationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `valuation-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function createValuationConversationController(api: ConversationApi, options: ControllerOptions = {}) {
  const draft = ref<ConversationDraft | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const confirming = ref(false)
  const error = ref('')
  const canUndo = ref(false)
  const storage = options.storage ?? browserStorage()
  const now = options.now ?? Date.now
  const sleep = options.sleep ?? ((milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)))
  const newOperationId = options.newOperationId ?? fallbackOperationId
  let lastActivity = now()
  let operationId = ''
  let completedRecord: EvaluationRecord | null = null
  let confirmationPromise: Promise<EvaluationRecord> | null = null
  let mutationQueue: Promise<unknown> = Promise.resolve()
  let pendingMutations = 0

  const complete = computed(() => Boolean(draft.value && draftToEvaluationRequest(draft.value)))
  const expired = computed(() => now() - lastActivity >= DRAFT_IDLE_TIMEOUT_MS)

  function persist() {
    if (!storage || !draft.value) return
    const snapshot: DraftSessionSnapshot = {
      id: draft.value.id,
      ...(operationId ? { operation_id: operationId } : {}),
      updated_at: new Date(lastActivity).toISOString()
    }
    writeDraftSession(storage, snapshot)
  }

  function touch() {
    lastActivity = now()
    persist()
  }

  function applyDraft(value: ConversationDraft) {
    draft.value = normalizeConversationDraft(value)
    touch()
  }

  function clearLocal() {
    draft.value = null
    operationId = ''
    completedRecord = null
    confirmationPromise = null
    canUndo.value = false
    if (storage) clearDraftSession(storage)
  }

  async function restore() {
    if (loading.value) return
    loading.value = true
    error.value = ''
    try {
      const snapshot = storage ? readDraftSession(storage, now()) : null
      if (snapshot && now() - Date.parse(snapshot.updated_at) < DRAFT_IDLE_TIMEOUT_MS) {
        operationId = snapshot.operation_id ?? ''
        try {
          applyDraft(await api.getConversationDraft(snapshot.id))
          return
        } catch (cause) {
          if (![404, 410].includes(valuationErrorStatus(cause) ?? 0)) throw cause
          if (storage) clearDraftSession(storage)
        }
      }
      applyDraft(await api.createConversationDraft({ source: 'manual' }))
    } finally {
      loading.value = false
    }
  }

  async function ensureDraft(): Promise<ConversationDraft> {
    if (!draft.value) await restore()
    if (!draft.value) throw new Error('草稿创建失败，请重试')
    return draft.value
  }

  function enqueue<T>(work: () => Promise<T>): Promise<T> {
    pendingMutations += 1
    saving.value = true
    const result = mutationQueue.then(work)
    mutationQueue = result.catch(() => undefined)
    return result.finally(() => {
      pendingMutations -= 1
      saving.value = pendingMutations > 0
    })
  }

  async function patchFields(patch: Partial<DraftFields>, evidence?: string): Promise<void> {
    operationId = ''
    completedRecord = null
    const current = await ensureDraft()
    await enqueue(async () => {
      const latest = draft.value!
      const fields = reconcileDraftFields(latest.fields, patch)
      try {
        applyDraft(await api.updateConversationDraft(latest.id, {
          draft_version: latest.draft_version,
          fields,
          ...(evidence ? { evidence } : {})
        }))
        canUndo.value = true
        operationId = ''
        completedRecord = null
        error.value = ''
      } catch (cause) {
        // 冲突或断网后以服务端版本为准；页面保留输入提示，不覆盖后续编辑。
        try {
          applyDraft(await api.getConversationDraft(latest.id))
        } catch {
          error.value = cause instanceof Error ? cause.message : '草稿保存失败，请重试'
        }
        throw cause
      }
    })
  }

  async function setField(key: DraftFieldKey, value: string | number | boolean, evidence?: string) {
    await patchFields({ [key]: valueField(key, value, evidence) }, evidence)
  }

  async function setFields(values: Partial<Record<DraftFieldKey, string | number | boolean>>, evidence?: string) {
    const patch = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, valueField(key as DraftFieldKey, value, evidence)])
    ) as Partial<DraftFields>
    await patchFields(patch, evidence)
  }

  async function setDictionaryValue(key: DraftFieldKey, value: string | number, evidence = '用户从字典点选') {
    await patchFields({ [key]: valueField(key, value, evidence, 'dictionary') }, evidence)
  }

  async function setUnknown(key: DraftFieldKey, evidence?: string) {
    await patchFields({ [key]: { status: 'unknown', evidence } }, evidence)
  }

  async function setRange(key: DraftFieldKey, min: number, max: number, evidence?: string) {
    await patchFields({ [key]: { status: 'range', min, max, evidence } }, evidence)
  }

  async function revalidateFields(allowed: Partial<Record<DraftFieldKey, Array<string | number>>>) {
    await ensureDraft()
    const patch: Partial<DraftFields> = {}
    for (const [key, options] of Object.entries(allowed)) {
      const fieldKey = key as DraftFieldKey
      const field = draft.value!.fields[fieldKey]
      if (field.status !== 'candidate') continue
      const preferred = field.candidates?.[0]
      patch[fieldKey] = preferred !== undefined && options.includes(preferred)
        ? valueField(fieldKey, preferred, '原值与新上游字典兼容，已重新核对', 'dictionary')
        : { status: 'candidate', candidates: options, evidence: field.evidence }
    }
    if (Object.keys(patch).length) await patchFields(patch, '上游字典变更后重新核对')
  }

  async function undo() {
    const current = await ensureDraft()
    await enqueue(async () => {
      applyDraft(await api.undoConversationDraft(draft.value!.id, {
        draft_version: draft.value!.draft_version
      }))
      operationId = ''
      completedRecord = null
      canUndo.value = false
      error.value = ''
    })
  }

  async function evaluationFromOperation(operation: ConversationOperation): Promise<EvaluationRecord> {
    if (operation.status === 'failed') throw new Error(operation.error || '评估失败，请重试')
    if (operation.evaluation) return operation.evaluation
    if (operation.evaluation_id) return api.getEvaluation(operation.evaluation_id)
    throw new Error('评估结果尚未生成')
  }

  function confirm(expectedVersion?: number): Promise<EvaluationRecord> {
    if (confirmationPromise) {
      if (expectedVersion !== undefined && expectedVersion !== draft.value?.draft_version) {
        return Promise.reject(new Error('草稿版本已变化，请重新核对'))
      }
      return confirmationPromise
    }
    const run = async () => {
      await mutationQueue.catch(() => undefined)
      const current = draft.value
      if (!current) throw new Error('请先创建车辆草稿')
      if (expectedVersion !== undefined && expectedVersion !== current.draft_version) {
        throw new Error('草稿版本已变化，请重新核对')
      }
      const request = draftToEvaluationRequest(current)
      if (!request) throw new Error('请先补全并核对车辆信息')
      if (completedRecord) return completedRecord
      confirming.value = true
      error.value = ''
      try {
        if (!operationId) {
          operationId = newOperationId()
          touch()
        }
        let operation = await api.createConversationOperation({
          operation_id: operationId,
          draft_id: current.id,
          draft_version: current.draft_version,
          request
        })
        for (let attempt = 0; operation.status === 'pending' || operation.status === 'processing'; attempt += 1) {
          if (attempt >= 60) throw new Error('评估仍在处理中，请稍后重试')
          await sleep(1000)
          operation = await api.getConversationOperation(operationId)
        }
        completedRecord = await evaluationFromOperation(operation)
        return completedRecord
      } catch (cause) {
        error.value = cause instanceof Error ? cause.message : '评估失败，请重试'
        throw cause
      } finally {
        confirming.value = false
      }
    }
    confirmationPromise = run().finally(() => {
      confirmationPromise = null
    })
    return confirmationPromise
  }

  async function reset() {
    await mutationQueue.catch(() => undefined)
    const id = draft.value?.id
    if (id) {
      try {
        await api.deleteConversationDraft(id)
      } catch {
        // 服务端删除失败也必须清掉本标签恢复标识，避免继续展示已放弃的草稿。
      }
    }
    clearLocal()
    error.value = ''
  }

  function expireIfIdle() {
    if (!draft.value || !expired.value) return false
    clearLocal()
    return true
  }

  return {
    draft,
    loading,
    saving,
    confirming,
    error,
    canUndo,
    complete,
    expired,
    restore,
    touch,
    expireIfIdle,
    setField,
    setFields,
    setDictionaryValue,
    setUnknown,
    setRange,
    revalidateFields,
    undo,
    confirm,
    reset
  }
}

export function useValuationConversation() {
  return createValuationConversationController(useValuationApi())
}
