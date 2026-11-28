import type {
  EvaluationRecord,
  TrialResult,
  ValuationExplanationCard
} from '~/api/valuation'
import { formatInteger } from '~/utils/valuationFormat'

export interface ExplanationSelection {
  card: ValuationExplanationCard
  cardLabel: string
}

export interface ExplanationAnswer extends ExplanationSelection {
  question: string
  state: 'success' | 'failure'
  /** 失败时的显式分类；citation_invalid 表示引用校验失败，答复不得伪装成已校验。 */
  failureKind?: ExplanationFailureKind
  message: string
  action?: 'recalculate'
  evidenceIds: string[]
  degraded: boolean
}

/** 等待解释结果（受理 + 轮询）的客户端总上限；单次请求另有 EXPLANATION_REQUEST_TIMEOUT_MS。 */
export const EXPLANATION_TOTAL_TIMEOUT_MS = 65_000
export const EXPLANATION_POLL_INTERVAL_MS = 1_000

export const EXPLANATION_FAILURE_MESSAGES = {
  timeout: '解释请求超时，尚未收到答复，请稍后再试。你仍可查看当前卡片和报告。',
  quota: '解释额度已用完，请稍后再试。你仍可查看当前卡片和报告。',
  citation_invalid: '解释引用校验失败，本次答复已隐藏，请稍后再试。你仍可查看当前卡片和报告。',
  forbidden: '该结果暂不可解释，请检查登录状态或结果权限。',
  unavailable: '解释暂时不可用，请稍后再试。你仍可查看当前卡片和报告。'
} as const

export type ExplanationFailureKind = keyof typeof EXPLANATION_FAILURE_MESSAGES

export function explanationFailureKind(reason?: string, status?: number | null): ExplanationFailureKind {
  const code = (reason ?? '').toLowerCase()
  if (status === 429 || /quota|rate_limit|budget_exhausted/.test(code)) return 'quota'
  if (status === 403 || status === 404 || /forbidden|not_found|unauthorized|permission/.test(code)) return 'forbidden'
  if (status === 504 || /timeout|timed_out|deadline/.test(code)) return 'timeout'
  // FL 用 suggestion_validation_failed 同时表达模板/证据校验失败；422 是门户侧 DTO 校验拒绝。
  if (status === 422 || /citation|evidence|reference|grounding|suggestion_validation/.test(code)) return 'citation_invalid'
  return 'unavailable'
}

/** 解释 operation 落库键：FL 以 explain:<卡片键>:<客户端 operation_id> 去重与轮询。 */
export function explanationOperationKey(card: ValuationExplanationCard, operationId: string): string {
  const cardKey = card.kind === 'formal' ? card.operation_id : card.request_id
  return `explain:${cardKey}:${operationId}`
}

export function explanationCardKey(card: ValuationExplanationCard): string {
  return card.kind === 'formal'
    ? `formal:${card.operation_id}:${card.evaluation_id}`
    : `trial:${card.request_id}:${card.snapshot_id}`
}

export function formalExplanationCard(record: EvaluationRecord, operationId = `evaluation-${record.id}`): ValuationExplanationCard {
  return { kind: 'formal', operation_id: operationId, evaluation_id: record.id }
}

export function formalExplanationLabel(record: EvaluationRecord): string {
  return `正式评估 #${record.id} · ${formatInteger(record.usage_hours)} 小时`
}

export function trialExplanationCard(requestId: string, result: TrialResult): ValuationExplanationCard | null {
  if (result.status !== 'priced' || !result.snapshot_id) return null
  return { kind: 'trial', request_id: requestId, snapshot_id: result.snapshot_id }
}

export function trialExplanationLabel(requestId: string, result: TrialResult): string {
  if (result.status !== 'priced') return `参考试算 · ${requestId}`
  const hours = typeof result.input.usage_hours === 'number' ? ` · ${formatInteger(result.input.usage_hours)} 小时` : ''
  return `参考试算 · ${result.snapshot.sha7}${hours}`
}
