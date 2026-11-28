import { computed, ref } from 'vue'
import {
  valuationErrorStatus,
  type ConversationExplanationRequest,
  type UpstreamConversationExplanation,
  type ValuationApi,
  type ValuationExplanationCard
} from '~/api/valuation'
import {
  EXPLANATION_FAILURE_MESSAGES,
  explanationCardKey,
  explanationFailureKind,
  sameExplanationCard,
  type ExplanationAnswer,
  type ExplanationFailureKind,
  type ExplanationSelection
} from '~/utils/valuationExplanations'

export type ValuationExplanationApi = Pick<ValuationApi,
  | 'createConversationExplanation'
  | 'getConversationExplanation'
>

interface ExplanationControllerOptions {
  newOperationId?: () => string
  sleep?: (milliseconds: number) => Promise<void>
}

function fallbackOperationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `valuation-explanation-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function cloneCard(card: ValuationExplanationCard): ValuationExplanationCard {
  return Object.freeze({ ...card })
}

function remainingQuota(operation: UpstreamConversationExplanation): number | undefined {
  const candidates = [operation.remaining_quota, operation.quota_remaining, operation.quota?.remaining, operation.quota?.remaining_quota]
  return candidates.find((value): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0)
}

function explanationAction(operation: UpstreamConversationExplanation): 'recalculate' | undefined {
  const action = operation.explanation?.action ?? operation.result?.action ?? operation.action ?? operation.next_action
  const type = typeof action === 'string' ? action : action?.type
  return type === 'recalculate' ? 'recalculate' : undefined
}

function explanationText(operation: UpstreamConversationExplanation): string {
  const value = operation.explanation?.answer ?? operation.explanation?.content ?? operation.explanation?.text ?? operation.explanation?.message ??
    operation.result?.answer ?? operation.result?.content ?? operation.result?.text ?? operation.result?.message ??
    operation.answer ?? operation.content ?? operation.text ?? operation.message
  return typeof value === 'string' ? value.trim() : ''
}

export function createValuationExplanationController(
  api: ValuationExplanationApi,
  options: ExplanationControllerOptions = {}
) {
  const selected = ref<ExplanationSelection | null>(null)
  const selectedKey = computed(() => selected.value ? explanationCardKey(selected.value.card) : '')
  const loading = ref(false)
  const remaining = ref<number | null>(null)
  const degraded = ref(false)
  const newOperationId = options.newOperationId ?? fallbackOperationId
  const sleep = options.sleep ?? ((milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)))
  let sequence = 0
  let pendingRequests = 0
  let active: { key: string; promise: Promise<ExplanationAnswer> } | null = null
  let lastAttempt: { key: string; operationId: string } | null = null

  function select(card: ValuationExplanationCard, label: string) {
    selected.value = Object.freeze({ card: cloneCard(card), cardLabel: label })
  }

  function clear() {
    selected.value = null
  }

  function failure(
    selection: ExplanationSelection,
    question: string,
    kind: ExplanationFailureKind,
    operation?: UpstreamConversationExplanation
  ): ExplanationAnswer {
    const isDegraded = operation?.degraded ?? operation?.quota?.degraded ?? kind !== 'forbidden'
    return {
      ...selection,
      question,
      state: 'failure',
      message: EXPLANATION_FAILURE_MESSAGES[kind],
      evidenceIds: [],
      degraded: isDegraded
    }
  }

  async function run(
    selection: ExplanationSelection,
    question: string,
    draftVersion: number,
    operationId: string,
    requestSequence: number
  ): Promise<ExplanationAnswer> {
    const request: ConversationExplanationRequest = {
      operation_id: operationId,
      draft_version: draftVersion,
      card: selection.card,
      question
    }
    try {
      let operation = await api.createConversationExplanation(request)
      for (let attempt = 0; operation?.status === 'pending'; attempt += 1) {
        if (attempt >= 60) return failure(selection, question, 'timeout', operation)
        await sleep(1000)
        operation = await api.getConversationExplanation(operationId)
      }
      if (!operation || (operation.operation_id ?? operation.id) !== operationId ||
        (operation.card && !sameExplanationCard(operation.card, selection.card))) {
        return failure(selection, question, 'citation')
      }
      const quota = remainingQuota(operation)
      if (requestSequence === sequence) {
        if (quota !== undefined) remaining.value = quota
        degraded.value = operation.degraded ?? operation.quota?.degraded ?? operation.status === 'failed'
      }
      if (operation.status === 'failed') {
        return failure(selection, question, explanationFailureKind(operation.reason_code ?? operation.error_code), operation)
      }
      const message = explanationText(operation)
      if (!message) return failure(selection, question, 'citation', operation)
      const action = explanationAction(operation)
      return {
        ...selection,
        question,
        state: 'success',
        message,
        ...(action ? { action } : {}),
        evidenceIds: operation.explanation?.evidence_ids ?? operation.result?.evidence_ids ?? operation.evidence_ids ?? [],
        degraded: operation.degraded ?? operation.quota?.degraded ?? false
      }
    } catch (cause) {
      const kind = explanationFailureKind(undefined, valuationErrorStatus(cause))
      if (requestSequence === sequence) {
        degraded.value = kind !== 'forbidden'
        if (kind === 'quota') remaining.value = 0
      }
      return failure(selection, question, kind)
    }
  }

  async function ask(question: string, draftVersion: number): Promise<ExplanationAnswer> {
    const current = selected.value
    const text = question.trim()
    if (!current) throw new Error('请先选择一张结果卡')
    if (!text) throw new Error('请输入想了解的问题')
    const selection: ExplanationSelection = Object.freeze({ card: cloneCard(current.card), cardLabel: current.cardLabel })
    const key = JSON.stringify([selection.card, text, draftVersion])
    if (active?.key === key) return active.promise
    const operationId = lastAttempt?.key === key ? lastAttempt.operationId : newOperationId()
    lastAttempt = { key, operationId }
    const requestSequence = ++sequence
    pendingRequests += 1
    loading.value = true
    const promise = run(selection, text, draftVersion, operationId, requestSequence).finally(() => {
      pendingRequests -= 1
      loading.value = pendingRequests > 0
      if (active?.key === key) active = null
    })
    active = { key, promise }
    return promise
  }

  return { selected, selectedKey, loading, remainingQuota: remaining, degraded, select, clear, ask }
}

export function useValuationExplanations() {
  return createValuationExplanationController(useValuationApi())
}
