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
  EXPLANATION_POLL_INTERVAL_MS,
  EXPLANATION_TOTAL_TIMEOUT_MS,
  explanationCardKey,
  explanationFailureKind,
  explanationOperationKey,
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
  now?: () => number
  totalTimeoutMs?: number
}

const MAX_POLLS = 60

function fallbackOperationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `valuation-explanation-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function cloneCard(card: ValuationExplanationCard): ValuationExplanationCard {
  return Object.freeze({ ...card })
}

/** ofetch 超时以 TimeoutError 抛出，没有 HTTP 状态码，必须单独识别成固定超时说明。 */
function isTimeoutError(cause: unknown): boolean {
  if (!cause || typeof cause !== 'object') return false
  const record = cause as { name?: unknown; message?: unknown }
  return record.name === 'TimeoutError' || /timeout|timed out/i.test(String(record.message ?? ''))
}

/** FL 以 operation_key + card_kind/card_key 标识解释所属请求；任一不符即引用失败。 */
function operationMatchesRequest(
  operation: UpstreamConversationExplanation,
  card: ValuationExplanationCard,
  operationId: string
): boolean {
  const cardKey = card.kind === 'formal' ? card.operation_id : card.request_id
  return operation.card_kind === card.kind && operation.card_key === cardKey &&
    operation.operation_id === explanationOperationKey(card, operationId)
}

export function createValuationExplanationController(
  api: ValuationExplanationApi,
  options: ExplanationControllerOptions = {}
) {
  const selected = ref<ExplanationSelection | null>(null)
  const selectedKey = computed(() => selected.value ? explanationCardKey(selected.value.card) : '')
  const loading = ref(false)
  const degraded = ref(false)
  const newOperationId = options.newOperationId ?? fallbackOperationId
  const sleep = options.sleep ?? ((milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)))
  const now = options.now ?? (() => Date.now())
  const totalTimeoutMs = options.totalTimeoutMs ?? EXPLANATION_TOTAL_TIMEOUT_MS
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
    kind: ExplanationFailureKind
  ): ExplanationAnswer {
    return {
      ...selection,
      question,
      state: 'failure',
      failureKind: kind,
      message: EXPLANATION_FAILURE_MESSAGES[kind],
      evidenceIds: [],
      degraded: kind !== 'forbidden'
    }
  }

  function trackAnswer(requestSequence: number, kind: ExplanationFailureKind | null) {
    if (requestSequence !== sequence) return
    degraded.value = kind !== null && kind !== 'forbidden'
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
      if (!operationMatchesRequest(operation, selection.card, operationId)) {
        trackAnswer(requestSequence, 'citation_invalid')
        return failure(selection, question, 'citation_invalid')
      }
      // FL 返回的 operation_id 是落库键（explain:<card_key>:<客户端 id>），轮询必须用它；
      // 客户端 id 只在受理请求里出现，拿它去查只会 404。
      const deadline = now() + totalTimeoutMs
      let attempts = 0
      while (operation.status === 'pending') {
        if (attempts >= MAX_POLLS || now() >= deadline) {
          trackAnswer(requestSequence, 'timeout')
          return failure(selection, question, 'timeout')
        }
        attempts += 1
        await sleep(EXPLANATION_POLL_INTERVAL_MS)
        operation = await api.getConversationExplanation(operation.operation_id)
        if (!operationMatchesRequest(operation, selection.card, operationId)) {
          trackAnswer(requestSequence, 'citation_invalid')
          return failure(selection, question, 'citation_invalid')
        }
      }
      if (operation.status === 'failed' || operation.status === 'stale') {
        const kind = explanationFailureKind(operation.error_code)
        trackAnswer(requestSequence, kind)
        return failure(selection, question, kind)
      }
      const result = operation.explanation
      // 成功必须有正文与非空依据；缺正文、缺依据或依据为空串都按引用失败处理，
      // 不得让页面显示“依据已校验”。
      if (!result || !result.template.trim() || result.evidence_ids.length === 0 ||
        !result.evidence_ids.every((id) => typeof id === 'string' && id.trim().length > 0)) {
        trackAnswer(requestSequence, 'citation_invalid')
        return failure(selection, question, 'citation_invalid')
      }
      trackAnswer(requestSequence, null)
      return {
        ...selection,
        question,
        state: 'success',
        message: result.template.trim(),
        ...(result.action === 'recalculate' ? { action: 'recalculate' as const } : {}),
        evidenceIds: [...result.evidence_ids],
        degraded: false
      }
    } catch (cause) {
      const kind = isTimeoutError(cause)
        ? 'timeout'
        : explanationFailureKind(undefined, valuationErrorStatus(cause))
      trackAnswer(requestSequence, kind)
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

  return { selected, selectedKey, loading, degraded, select, clear, ask }
}

export function useValuationExplanations() {
  return createValuationExplanationController(useValuationApi())
}