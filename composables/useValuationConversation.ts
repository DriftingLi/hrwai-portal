import { computed, ref } from 'vue'
import {
  valuationErrorStatus,
  type EvaluationRecord,
  type UpstreamConversationDraft,
  type UpstreamDraftField,
  type ValuationApi,
  type ValuationSuggestionResult
} from '~/api/valuation'
import {
  DRAFT_IDLE_TIMEOUT_MS,
  DRAFT_SERVER_TOUCH_WINDOW_MS,
  clearDraftSession,
  draftToEvaluationRequest,
  normalizeConversationDraft,
  readDraftSession,
  reconcileDraftFields,
  valueField,
  writeDraftSession,
  type ConversationDraft,
  type ConversationOperation,
  type DraftFieldKey,
  type DraftFields,
  type DraftSessionSnapshot
} from '~/utils/valuationConversation'

type ConversationApi = Pick<ValuationApi,
  | 'createConversationDraft'
  | 'suggestConversationDraft'
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
  maxSuggestionPolls?: number
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
  const suggesting = ref(false)
  const suggestionStatus = ref<'idle' | 'running' | 'succeeded' | 'failed' | 'stale'>('idle')
  const suggestionError = ref('')
  const suggestionErrorCode = ref('')
  const suggestion = ref<ValuationSuggestionResult | null>(null)
  const acceptedSuggestions = ref(0)
  const quotaExhausted = ref(false)
  const suggestionRemaining = computed(() => quotaExhausted.value ? 0 : Math.max(0, 8 - acceptedSuggestions.value))
  const storage = options.storage ?? browserStorage()
  const now = options.now ?? Date.now
  const sleep = options.sleep ?? ((milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)))
  const newOperationId = options.newOperationId ?? fallbackOperationId
  let lastActivity = now()
  let operationId = ''
  let completedRecord: EvaluationRecord | null = null
  let confirmationPromise: Promise<EvaluationRecord> | null = null
  let mutationQueue: Promise<unknown> = Promise.resolve()
  let touchPromise: Promise<boolean> | null = null
  let pendingMutations = 0
  let suggestionPromise: Promise<boolean> | null = null
  let suggestionReviewVersion: number | null = null
  let retrySuggestion: { operationId: string; baseVersion: number; text: string } | null = null
  const countedSuggestionOperations = new Set<string>()
  const maxSuggestionPolls = options.maxSuggestionPolls ?? 60

  const complete = computed(() => Boolean(draft.value && draftToEvaluationRequest(draft.value)))
  // 本地时钟只负责展示与调度；能否继续使用一律以服务端 expires_at 为准。
  const expired = computed(() => Boolean(draft.value && Date.parse(draft.value.expires_at) <= now()))
  const canUndo = computed(() => draft.value?.can_undo === true && !expired.value)

  function persist() {
    if (!storage || !draft.value) return
    const snapshot: DraftSessionSnapshot = {
      id: draft.value.id,
      expires_at: draft.value.expires_at,
      ...(operationId ? { operation_id: operationId } : {}),
      updated_at: new Date(lastActivity).toISOString()
    }
    writeDraftSession(storage, snapshot)
  }

  function applyDraft(value: UpstreamConversationDraft) {
    draft.value = normalizeConversationDraft(value)
    lastActivity = now()
    persist()
  }

  function clearSuggestionReview() {
    suggestion.value = null
    suggestionReviewVersion = null
  }

  function clearLocal() {
    draft.value = null
    operationId = ''
    completedRecord = null
    confirmationPromise = null
    clearSuggestionReview()
    retrySuggestion = null
    countedSuggestionOperations.clear()
    acceptedSuggestions.value = 0
    quotaExhausted.value = false
    suggestionStatus.value = 'idle'
    suggestionError.value = ''
    suggestionErrorCode.value = ''
    if (storage) clearDraftSession(storage)
  }

  async function restore() {
    if (loading.value) return
    loading.value = true
    error.value = ''
    try {
      const snapshot = storage ? readDraftSession(storage, now()) : null
      const snapshotExpires = snapshot
        ? snapshot.expires_at
          ? Date.parse(snapshot.expires_at)
          : Date.parse(snapshot.updated_at) + DRAFT_IDLE_TIMEOUT_MS
        : 0
      if (snapshot && snapshotExpires > now()) {
        operationId = snapshot.operation_id ?? ''
        try {
          applyDraft(await api.getConversationDraft(snapshot.id))
          return
        } catch (cause) {
          if (![404, 410].includes(valuationErrorStatus(cause) ?? 0)) throw cause
          if (storage) clearDraftSession(storage)
        }
      }
      applyDraft(await api.createConversationDraft({ fields: {} }))
    } finally {
      loading.value = false
    }
  }

  async function ensureDraft(): Promise<ConversationDraft> {
    if (!draft.value) await restore()
    if (!draft.value) throw new Error('草稿创建失败，请重试')
    if (expired.value) {
      clearLocal()
      throw new Error('草稿已过期，请重新填写')
    }
    return draft.value
  }

  function enqueue<T>(work: () => Promise<T>, showSaving = true): Promise<T> {
    if (showSaving) {
      pendingMutations += 1
      saving.value = true
    }
    const result = mutationQueue.then(work)
    mutationQueue = result.catch(() => undefined)
    if (!showSaving) return result
    return result.finally(() => {
      pendingMutations -= 1
      saving.value = pendingMutations > 0
    })
  }

  function touch(): Promise<boolean> | undefined {
    lastActivity = now()
    persist()
    if (!draft.value || expired.value) return
    if (Date.parse(draft.value.expires_at) - now() > DRAFT_SERVER_TOUCH_WINDOW_MS) return
    if (touchPromise) return touchPromise
    // FL GET 不续期；只有真实 PATCH 才能刷新服务端 TTL。空 fields 不改字段，
    // 但会按 FL CAS 契约生成新版本，因而组件会撤销旧核对并禁止旧版本确认。
    touchPromise = enqueue(async () => {
      const current = draft.value
      if (!current || expired.value) return false
      try {
        applyDraft(await api.updateConversationDraft(current.id, {
          base_version: current.version,
          fields: {}
        }))
        return true
      } catch (cause) {
        error.value = cause instanceof Error ? cause.message : '草稿续期失败，请重新操作'
        return false
      }
    }, false).finally(() => {
      touchPromise = null
    })
    return touchPromise
  }

  async function patchFields(patch: Partial<DraftFields>, _evidence?: string): Promise<void> {
    clearSuggestionReview()
    operationId = ''
    completedRecord = null
    const current = await ensureDraft()
    await enqueue(async () => {
      const latest = draft.value!
      const fields = reconcileDraftFields(latest.fields, patch)
      try {
        applyDraft(await api.updateConversationDraft(latest.id, {
          base_version: latest.version,
          fields
        }))
        operationId = ''
        completedRecord = null
        error.value = ''
      } catch (cause) {
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

  async function setDictionaryValue(key: DraftFieldKey, value: string | number | boolean, evidence = '用户从字典点选') {
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
      const compatible = field.candidates?.filter((candidate) =>
        typeof candidate === 'string' || typeof candidate === 'number' ? options.includes(candidate) : false
      ) ?? []
      if (compatible.length === 1) {
        patch[fieldKey] = valueField(fieldKey, compatible[0]!, '原值与新上游字典兼容，已重新核对', 'dictionary')
      } else if (compatible.length > 1) {
        patch[fieldKey] = { status: 'candidate', candidates: compatible, evidence: field.evidence, source: field.source }
      } else if (field.candidates?.length || options.length) {
        patch[fieldKey] = {
          status: 'candidate', candidates: [...options],
          evidence: '上级字段变化后按真实上游字典重新核对', source: 'dictionary'
        }
      }
    }
    if (Object.keys(patch).length) await patchFields(patch, '上游字典变更后重新核对')
  }

  async function undo() {
    clearSuggestionReview()
    await ensureDraft()
    await enqueue(async () => {
      const current = draft.value!
      applyDraft(await api.undoConversationDraft(current.id, { base_version: current.version }))
      operationId = ''
      completedRecord = null
      error.value = ''
    })
  }

  function suggestionPatchToField(patch: UpstreamDraftField): DraftField {
    const evidence = typeof patch.evidence === 'string'
      ? patch.evidence
      : Array.isArray(patch.evidence)
        ? patch.evidence.filter((entry): entry is string => typeof entry === 'string').join('；')
        : undefined
    const common = {
      ...(evidence ? { evidence } : {}),
      ...(patch.source ? { source: patch.source as DraftField['source'] } : {})
    }
    if (patch.state === 'range' && patch.range) {
      return { status: 'range', min: patch.range.min, max: patch.range.max, ...common }
    }
    if (patch.state === 'value' && ['string', 'number', 'boolean'].includes(typeof patch.value)) {
      return { status: 'value', value: patch.value, ...common }
    }
    if (patch.state === 'unknown') return { status: 'unknown', ...common }
    return { status: 'missing', ...common }
  }

  function failSuggestion(code: string, message: string) {
    suggestionStatus.value = 'failed'
    suggestionErrorCode.value = code
    suggestionError.value = message
    clearSuggestionReview()
  }

  function staleSuggestion() {
    suggestionStatus.value = 'stale'
    suggestionErrorCode.value = 'draft_version_conflict'
    suggestionError.value = '草稿已变化，这次建议未应用。请按当前草稿重新提交或继续手动填写。'
    clearSuggestionReview()
  }

  async function applySuggestion(baseVersion: number, result: ValuationSuggestionResult): Promise<boolean> {
    const patch: Partial<DraftFields> = {}
    for (const [key, value] of Object.entries(result.patches ?? {})) {
      if (!value || value.state === 'candidate') continue
      patch[key as DraftFieldKey] = suggestionPatchToField(value)
    }
    if (Object.keys(patch).length) {
      await enqueue(async () => {
        const latest = draft.value!
        if (latest.version !== baseVersion) throw Object.assign(new Error('stale'), { statusCode: 409 })
        const fields = reconcileDraftFields(latest.fields, patch)
        try {
          applyDraft(await api.updateConversationDraft(latest.id, { base_version: latest.version, fields }))
          operationId = ''
          completedRecord = null
          error.value = ''
        } catch (cause) {
          try {
            applyDraft(await api.getConversationDraft(latest.id))
          } catch {
            // 保留原始 CAS/网络错误，由调用方转成可操作的降级状态。
          }
          throw cause
        }
      })
    }
    suggestion.value = result
    suggestionReviewVersion = draft.value?.version ?? null
    suggestionStatus.value = 'succeeded'
    suggestionError.value = ''
    suggestionErrorCode.value = ''
    return true
  }

  async function chooseSuggestionCandidate(key: DraftFieldKey, value: string | number | boolean) {
    if (!suggestion.value || suggestionReviewVersion !== draft.value?.version) {
      staleSuggestion()
      return
    }
    const selected = suggestion.value
    await enqueue(async () => {
      if (suggestionReviewVersion !== draft.value?.version) {
        staleSuggestion()
        return
      }
      const current = draft.value!
      const selectedField = valueField(key, value, '用户从模型建议的真实目录候选中点选', 'dictionary')
      applyDraft(await api.updateConversationDraft(current.id, {
        base_version: current.version,
        fields: reconcileDraftFields(current.fields, { [key]: selectedField })
      }))
      operationId = ''
      completedRecord = null
      error.value = ''
      const patches = { ...selected.patches }
      delete patches[key]
      suggestion.value = Object.keys(patches).length || selected.questions.length || Object.keys(selected.supplements).length
        ? { ...selected, patches, draft_version: draft.value!.version }
        : null
      suggestionReviewVersion = draft.value!.version
    })
  }

  function submitSuggestion(text: string): Promise<boolean> {
    if (suggestionPromise) return suggestionPromise
    const normalized = text.trim()
    if (!normalized || normalized.length > 4000) {
      failSuggestion('suggestion_validation_failed', '请输入 1–4000 字的车辆信息。输入仍保留，可修改后重试。')
      return Promise.resolve(false)
    }
    if (quotaExhausted.value || suggestionRemaining.value === 0) {
      quotaExhausted.value = true
      failSuggestion('suggestion_quota_exceeded', '本页面的建议受理次数已用完。草稿和输入仍保留，可继续手动填写或点选。')
      return Promise.resolve(false)
    }
    const run = async () => {
      suggesting.value = true
      suggestionStatus.value = 'running'
      suggestionError.value = ''
      suggestionErrorCode.value = ''
      clearSuggestionReview()
      let accepted = false
      let baseVersion = 0
      let requestedOperationId = ''
      try {
        await mutationQueue.catch(() => undefined)
        const current = await ensureDraft()
        baseVersion = current.version
        const reusable = retrySuggestion?.baseVersion === baseVersion && retrySuggestion.text === normalized
        const operationId = reusable ? retrySuggestion!.operationId : newOperationId()
        requestedOperationId = operationId
        retrySuggestion = null
        let operation: ConversationOperation = await api.suggestConversationDraft(current.id, {
          operation_id: operationId,
          base_version: baseVersion,
          text: normalized
        })
        accepted = true
        if (!countedSuggestionOperations.has(operationId)) {
          countedSuggestionOperations.add(operationId)
          acceptedSuggestions.value += 1
        }
        const pollId = operation.operation_id || operation.id
        for (let attempt = 0; operation.status === 'pending'; attempt += 1) {
          if (!draft.value || draft.value.version !== baseVersion) {
            staleSuggestion()
            return false
          }
          if (attempt >= maxSuggestionPolls) {
            failSuggestion('suggestion_timeout', '建议等待超时，未修改草稿。输入仍保留，可继续手动填写或重试。')
            return false
          }
          await sleep(1000)
          operation = await api.getConversationOperation(pollId)
        }
        if (!draft.value || draft.value.version !== baseVersion || operation.status === 'stale' ||
          (operation.base_version !== undefined && operation.base_version !== baseVersion)) {
          staleSuggestion()
          return false
        }
        if (operation.status === 'failed') {
          const code = operation.error_code || 'suggestion_unavailable'
          if (code === 'suggestion_timeout') failSuggestion(code, '建议等待超时，未修改草稿。输入仍保留，可继续手动填写。')
          else if (code === 'suggestion_validation_failed') failSuggestion(code, '未能可靠整理这份描述，未修改草稿。请补充信息或继续手动填写。')
          else failSuggestion(code, '建议服务暂时不可用，未修改草稿。输入仍保留，可稍后重试或继续手动填写。')
          return false
        }
        if (operation.status !== 'succeeded' || !operation.result) {
          failSuggestion('suggestion_validation_failed', '建议结果格式无法确认，未修改草稿。请继续手动填写。')
          return false
        }
        return await applySuggestion(baseVersion, operation.result)
      } catch (cause) {
        const status = valuationErrorStatus(cause)
        if (status === 429) {
          quotaExhausted.value = true
          failSuggestion('suggestion_quota_exceeded', '建议额度已耗尽。草稿和输入仍保留，可继续手动填写或点选。')
        } else if (status === 400) {
          failSuggestion('suggestion_validation_failed', '描述未通过校验，未修改草稿。请调整输入或继续手动填写。')
        } else if (status === 409 || !draft.value || draft.value.version !== baseVersion) {
          staleSuggestion()
        } else {
          if (requestedOperationId && baseVersion > 0 && (!accepted || status === null || status >= 500)) {
            retrySuggestion = { operationId: requestedOperationId, baseVersion, text: normalized }
          }
          failSuggestion('suggestion_unavailable', '建议服务暂时不可用，未修改草稿。输入仍保留，可重试或继续手动填写。')
        }
        return false
      } finally {
        suggesting.value = false
        suggestionPromise = null
      }
    }
    suggestionPromise = run()
    return suggestionPromise
  }

  async function evaluationFromOperation(operation: ConversationOperation): Promise<EvaluationRecord> {
    if (operation.status === 'failed') throw new Error(operation.error_code || '评估失败，请重试')
    if (operation.evaluation) return operation.evaluation
    if (operation.evaluation_id) return api.getEvaluation(operation.evaluation_id)
    throw new Error('评估结果尚未生成')
  }

  function confirm(expectedVersion?: number): Promise<EvaluationRecord> {
    if (confirmationPromise) {
      if (expectedVersion !== undefined && expectedVersion !== draft.value?.version) {
        return Promise.reject(new Error('草稿版本已变化，请重新核对'))
      }
      return confirmationPromise
    }
    const run = async () => {
      await mutationQueue.catch(() => undefined)
      const current = await ensureDraft()
      if (expectedVersion !== undefined && expectedVersion !== current.version) {
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
          persist()
        }
        let operation = await api.createConversationOperation({
          operation_id: operationId,
          draft_id: current.id,
          draft_version: current.version,
          request
        })
        for (let attempt = 0; operation.status === 'pending'; attempt += 1) {
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
    draft, loading, saving, confirming, error, canUndo, complete, expired,
    suggesting, suggestionStatus, suggestionError, suggestionErrorCode, suggestion,
    acceptedSuggestions, suggestionRemaining, quotaExhausted,
    restore, touch, expireIfIdle, setField, setFields, setDictionaryValue,
    setUnknown, setRange, revalidateFields, undo, confirm, reset,
    submitSuggestion, chooseSuggestionCandidate
  }
}

export function useValuationConversation() {
  return createValuationConversationController(useValuationApi())
}
