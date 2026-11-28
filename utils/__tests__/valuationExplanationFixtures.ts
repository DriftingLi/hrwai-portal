import type {
  ConversationExplanationRequest,
  UpstreamConversationExplanation,
  UpstreamExplanationResult,
  ValuationExplanationCard
} from '~/api/valuation'

/** FL conversation_operation_dto.go 的卡片键：正式卡用操作能力 ID，试算卡用 request_id。 */
export function explanationCardKeyOf(card: ValuationExplanationCard): string {
  return card.kind === 'formal' ? card.operation_id : card.request_id
}

/** FL 的解释落库键：explain:<card_key>:<客户端 operation_id>。 */
export function explanationOperationKeyOf(
  request: Pick<ConversationExplanationRequest, 'operation_id' | 'card'>
): string {
  return `explain:${explanationCardKeyOf(request.card)}:${request.operation_id}`
}

export interface ExplanationOverrides {
  status?: UpstreamConversationExplanation['status']
  template?: string
  action?: UpstreamExplanationResult['action']
  evidenceIds?: string[]
  errorCode?: string
  operationId?: string
  cardKind?: string
  cardKey?: string
}

/**
 * 按真实 wire DTO 构造解释操作。测试里不再手写 answer/content/remaining_quota 等
 * 门户曾经的别名，mock 与契约同形。
 */
export function explanationOperation(
  request: Pick<ConversationExplanationRequest, 'operation_id' | 'card'>,
  overrides: ExplanationOverrides = {}
): UpstreamConversationExplanation {
  const operationId = overrides.operationId ?? explanationOperationKeyOf(request)
  const cardKey = overrides.cardKey ?? explanationCardKeyOf(request.card)
  const status = overrides.status ?? 'succeeded'
  const operation: UpstreamConversationExplanation = {
    id: operationId,
    kind: 'explanation',
    operation_id: operationId,
    draft_id: '',
    draft_version: 1,
    status,
    card_kind: overrides.cardKind ?? request.card.kind,
    card_key: cardKey,
    first_accepted_user_id: null,
    created_at: '2026-11-28T00:00:00Z',
    updated_at: '2026-11-28T00:00:01Z'
  }
  if (status === 'succeeded') {
    const evidenceIds = overrides.evidenceIds ?? ['result.estimated_value']
    const action = overrides.action ?? 'explain'
    operation.explanation = {
      schema_version: 1,
      action,
      template_key: 'result_snapshot',
      template: overrides.template ?? '该卡按原快照回填事实与依据。',
      facts: [{ id: evidenceIds[0] ?? 'result.estimated_value', label: '预估残值', value: 33600 }],
      evidence_ids: [...evidenceIds],
      formula_version: 'valuation-v2',
      snapshot_id: 'snapshot-1',
      requires_user_action: action === 'recalculate',
      card_version: 1
    }
  }
  if (overrides.errorCode) operation.error_code = overrides.errorCode
  return operation
}