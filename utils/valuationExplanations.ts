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
  message: string
  action?: 'recalculate'
  evidenceIds: string[]
  degraded: boolean
}

export const EXPLANATION_FAILURE_MESSAGES = {
  timeout: '解释服务暂时超时，请稍后再试。你仍可查看当前卡片和报告。',
  quota: '解释额度已用完，请稍后再试。你仍可查看当前卡片和报告。',
  citation: '解释依据校验失败，请稍后再试。你仍可查看当前卡片和报告。',
  forbidden: '该结果暂不可解释，请检查登录状态或结果权限。',
  unavailable: '解释暂时不可用，请稍后再试。你仍可查看当前卡片和报告。'
} as const

export type ExplanationFailureKind = keyof typeof EXPLANATION_FAILURE_MESSAGES

export function explanationFailureKind(reason?: string, status?: number | null): ExplanationFailureKind {
  const code = (reason ?? '').toLowerCase()
  if (status === 429 || /quota|rate_limit|budget_exhausted/.test(code)) return 'quota'
  if (status === 403 || status === 404 || /forbidden|not_found|unauthorized|permission/.test(code)) return 'forbidden'
  if (status === 504 || /timeout|timed_out|deadline/.test(code)) return 'timeout'
  if (/citation|evidence|reference|grounding|invalid_response/.test(code)) return 'citation'
  return 'unavailable'
}

export function explanationCardKey(card: ValuationExplanationCard): string {
  return card.kind === 'formal'
    ? `formal:${card.operation_id}:${card.evaluation_id}`
    : `trial:${card.request_id}:${card.snapshot_id}`
}

export function sameExplanationCard(left: ValuationExplanationCard, right: ValuationExplanationCard): boolean {
  return explanationCardKey(left) === explanationCardKey(right)
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
