import { computed, ref, type Ref } from 'vue'
import {
  valuationErrorStatus,
  type UpstreamConversationDraft,
  type UpstreamDraftField,
  type ValuationApi,
  type ValuationSuggestionResult
} from '~/api/valuation'
import {
  fieldEvidence,
  reconcileDraftFields,
  valueField,
  type ConversationDraft,
  type ConversationOperation,
  type DraftField,
  type DraftFieldKey,
  type DraftFields
} from '~/utils/valuationConversation'

type SuggestionApi = Pick<ValuationApi, 'suggestConversationDraft' | 'getConversationOperation' | 'getConversationDraft' | 'updateConversationDraft'>

interface SuggestionControllerOptions {
  draft: Ref<ConversationDraft | null>
  api: SuggestionApi
  ensureDraft: () => Promise<ConversationDraft>
  waitForMutations: () => Promise<unknown>
  enqueue: <T>(work: () => Promise<T>, showSaving?: boolean) => Promise<T>
  applyDraft: (draft: UpstreamConversationDraft) => void
  onDraftChanged: () => void
  newOperationId: () => string
  sleep: (milliseconds: number) => Promise<void>
  maxSuggestionPolls?: number
}

type RetrySuggestion = { operationId: string; baseVersion: number; text: string }

function suggestionPatchToField(patch: UpstreamDraftField): DraftField {
  const evidence = fieldEvidence(patch.evidence)
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

export function createValuationSuggestionController(options: SuggestionControllerOptions) {
  const suggesting = ref(false)
  const suggestionStatus = ref<'idle' | 'running' | 'succeeded' | 'failed' | 'stale'>('idle')
  const suggestionError = ref('')
  const suggestionErrorCode = ref('')
  const suggestion = ref<ValuationSuggestionResult | null>(null)
  const acceptedSuggestions = ref(0)
  const quotaExhausted = ref(false)
  const suggestionRemaining = computed(() => quotaExhausted.value ? 0 : Math.max(0, 8 - acceptedSuggestions.value))
  const maxSuggestionPolls = options.maxSuggestionPolls ?? 60
  const countedSuggestionOperations = new Set<string>()
  let suggestionPromise: Promise<boolean> | null = null
  let suggestionReviewVersion: number | null = null
  let retrySuggestion: RetrySuggestion | null = null

  function clearReview() {
    suggestion.value = null
    suggestionReviewVersion = null
  }

  function reset() {
    clearReview()
    retrySuggestion = null
    countedSuggestionOperations.clear()
    acceptedSuggestions.value = 0
    quotaExhausted.value = false
    suggestionStatus.value = 'idle'
    suggestionError.value = ''
    suggestionErrorCode.value = ''
  }

  function failSuggestion(code: string, message: string) {
    suggestionStatus.value = 'failed'
    suggestionErrorCode.value = code
    suggestionError.value = message
    clearReview()
  }

  function staleSuggestion() {
    suggestionStatus.value = 'stale'
    suggestionErrorCode.value = 'draft_version_conflict'
    suggestionError.value = '草稿已变化，这次建议未应用。请按当前草稿重新提交或继续手动填写。'
    clearReview()
  }

  function rememberRetry(operationId: string, baseVersion: number, text: string) {
    retrySuggestion = { operationId, baseVersion, text }
  }

  async function applySuggestion(baseVersion: number, result: ValuationSuggestionResult): Promise<boolean> {
    if (!Number.isInteger(result.draft_version)) {
      failSuggestion('suggestion_validation_failed', '建议结果缺少有效草稿版本，未修改草稿。请重新提交或继续手动填写。')
      return false
    }
    if (!options.draft.value || options.draft.value.version !== baseVersion || result.draft_version !== baseVersion) {
      staleSuggestion()
      return false
    }
    const patch: Partial<DraftFields> = {}
    for (const [key, value] of Object.entries(result.patches ?? {})) {
      if (!value || value.state === 'candidate') continue
      patch[key as DraftFieldKey] = suggestionPatchToField(value)
    }
    if (Object.keys(patch).length) {
      await options.enqueue(async () => {
        const latest = options.draft.value!
        if (latest.version !== baseVersion) {
          staleSuggestion()
          return
        }
        const fields = reconcileDraftFields(latest.fields, patch)
        try {
          options.applyDraft(await options.api.updateConversationDraft(latest.id, { base_version: latest.version, fields }))
          options.onDraftChanged()
        } catch (cause) {
          try {
            options.applyDraft(await options.api.getConversationDraft(latest.id))
          } catch {
            // 保留原始 CAS/网络错误，由调用方转成可操作的降级状态。
          }
          throw cause
        }
      })
      if (suggestionStatus.value === 'stale') return false
    }
    suggestion.value = result
    suggestionReviewVersion = options.draft.value?.version ?? null
    suggestionStatus.value = 'succeeded'
    suggestionError.value = ''
    suggestionErrorCode.value = ''
    return true
  }

  async function chooseSuggestionCandidate(key: DraftFieldKey, value: string | number | boolean) {
    if (!suggestion.value || suggestionReviewVersion !== options.draft.value?.version) {
      staleSuggestion()
      return
    }
    const selected = suggestion.value
    await options.enqueue(async () => {
      if (suggestionReviewVersion !== options.draft.value?.version) {
        staleSuggestion()
        return
      }
      const current = options.draft.value!
      const selectedField = valueField(key, value, '用户从模型建议的真实目录候选中点选', 'dictionary')
      options.applyDraft(await options.api.updateConversationDraft(current.id, {
        base_version: current.version,
        fields: reconcileDraftFields(current.fields, { [key]: selectedField })
      }))
      options.onDraftChanged()
      const patches = { ...selected.patches }
      delete patches[key]
      suggestion.value = Object.keys(patches).length || selected.questions.length || Object.keys(selected.supplements).length
        ? { ...selected, patches, draft_version: options.draft.value!.version }
        : null
      suggestionReviewVersion = options.draft.value!.version
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
      clearReview()
      let accepted = false
      let baseVersion = 0
      let requestedOperationId = ''
      try {
        await options.waitForMutations()
        const current = await options.ensureDraft()
        baseVersion = current.version
        const reusable = retrySuggestion?.baseVersion === baseVersion && retrySuggestion.text === normalized
        const operationId = reusable ? retrySuggestion!.operationId : options.newOperationId()
        requestedOperationId = operationId
        retrySuggestion = null
        let operation: ConversationOperation = await options.api.suggestConversationDraft(current.id, {
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
          if (!options.draft.value || options.draft.value.version !== baseVersion) {
            staleSuggestion()
            return false
          }
          if (attempt >= maxSuggestionPolls) {
            rememberRetry(requestedOperationId, baseVersion, normalized)
            failSuggestion('suggestion_timeout', '建议等待超时，未修改草稿。输入仍保留，可继续手动填写或重试。')
            return false
          }
          await options.sleep(1000)
          operation = await options.api.getConversationOperation(pollId)
        }
        if (!options.draft.value || options.draft.value.version !== baseVersion || operation.status === 'stale' ||
          (operation.base_version !== undefined && operation.base_version !== baseVersion)) {
          staleSuggestion()
          return false
        }
        if (operation.status === 'failed') {
          const code = operation.error_code || 'suggestion_unavailable'
          if (code === 'suggestion_timeout') {
            rememberRetry(requestedOperationId, baseVersion, normalized)
            failSuggestion(code, '建议等待超时，未修改草稿。输入仍保留，可继续手动填写或重试。')
          } else if (code === 'suggestion_quota_exceeded') {
            quotaExhausted.value = true
            failSuggestion(code, '建议额度已耗尽。草稿和输入仍保留，可继续手动填写或点选。')
          } else if (code === 'suggestion_validation_failed') {
            failSuggestion(code, '描述未通过校验，未修改草稿。请调整输入或继续手动填写。')
          } else {
            failSuggestion(code, '建议服务暂时不可用，未修改草稿。输入仍保留，可稍后重试或继续手动填写。')
          }
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
        } else if (status === 408 || status === 504) {
          if (requestedOperationId && baseVersion > 0) rememberRetry(requestedOperationId, baseVersion, normalized)
          failSuggestion('suggestion_timeout', '建议等待超时，未修改草稿。输入仍保留，可继续手动填写或重试。')
        } else if (status === 409 || !options.draft.value || options.draft.value.version !== baseVersion) {
          staleSuggestion()
        } else {
          if (requestedOperationId && baseVersion > 0 && (!accepted || status === null || status >= 500)) {
            rememberRetry(requestedOperationId, baseVersion, normalized)
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

  return {
    suggesting, suggestionStatus, suggestionError, suggestionErrorCode, suggestion,
    acceptedSuggestions, suggestionRemaining, quotaExhausted,
    submitSuggestion, chooseSuggestionCandidate, clearReview, reset
  }
}
