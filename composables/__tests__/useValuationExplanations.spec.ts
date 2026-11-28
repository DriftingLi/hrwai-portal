import { describe, expect, it, vi } from 'vitest'
import type {
  ConversationExplanationRequest,
  UpstreamConversationExplanation,
  ValuationExplanationCard
} from '~/api/valuation'
import { ValuationApiError } from '~/api/valuation'
import {
  EXPLANATION_FAILURE_MESSAGES,
  explanationOperationKey
} from '~/utils/valuationExplanations'
import { explanationOperation } from '~/utils/__tests__/valuationExplanationFixtures'
import { createValuationExplanationController } from '../useValuationExplanations'

const formal: ValuationExplanationCard = {
  kind: 'formal', operation_id: 'formal-1', evaluation_id: 88
}
const trial: ValuationExplanationCard = {
  kind: 'trial', request_id: 'trial-1', snapshot_id: 'snapshot-old'
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise })
  return { promise, resolve }
}

function setup(options: { now?: () => number; totalTimeoutMs?: number } = {}) {
  let sequence = 0
  const api = {
    createConversationExplanation: vi.fn(async (body: ConversationExplanationRequest) =>
      explanationOperation(body, { template: `解释 ${body.card.kind}` })
    ),
    getConversationExplanation: vi.fn()
  }
  const controller = createValuationExplanationController(api, {
    newOperationId: () => `explanation-${++sequence}`,
    sleep: async () => {},
    ...options
  })
  return { api, controller }
}

describe('估值解释控制器', () => {
  it('不同卡片绑定各自快照，同一问题不会串用金额或工时', async () => {
    const { api, controller } = setup()
    api.createConversationExplanation.mockImplementation(async (body) =>
      explanationOperation(body, {
        template: body.card.kind === 'formal' ? '正式卡采用 4,800 小时。' : '试算卡采用 6,200 小时。'
      })
    )
    controller.select(formal, '正式评估 #88 · 4,800 小时')
    const first = await controller.ask('哪些因素影响估价？', 3)
    controller.select(trial, '参考试算 · snapshot-old · 6,200 小时')
    const second = await controller.ask('哪些因素影响估价？', 4)

    expect(api.createConversationExplanation.mock.calls.map(([body]) => body.card)).toEqual([formal, trial])
    expect(first).toMatchObject({
      card: formal,
      cardLabel: '正式评估 #88 · 4,800 小时',
      state: 'success',
      message: '正式卡采用 4,800 小时。'
    })
    expect(second).toMatchObject({
      card: trial,
      cardLabel: '参考试算 · snapshot-old · 6,200 小时',
      state: 'success',
      message: '试算卡采用 6,200 小时。'
    })
    expect(first.evidenceIds).toEqual(['result.estimated_value'])
    expect(first.failureKind).toBeUndefined()
  })

  it('纠错后仍可解释旧卡，请求携带当前草稿版本但卡片快照不变', async () => {
    const { api, controller } = setup()
    controller.select(trial, '旧试算卡')
    await controller.ask('为什么区间较宽？', 9)

    expect(api.createConversationExplanation).toHaveBeenCalledWith({
      operation_id: 'explanation-1',
      draft_version: 9,
      card: { kind: 'trial', request_id: 'trial-1', snapshot_id: 'snapshot-old' },
      question: '为什么区间较宽？'
    })
  })

  it('反事实工时只返回重算动作，不在门户计算或展示价差', async () => {
    const { api, controller } = setup()
    api.createConversationExplanation.mockImplementation(async (body) =>
      explanationOperation(body, {
        action: 'recalculate',
        template: '请按当前草稿重新评估，旧结果卡不会被覆盖。'
      })
    )
    controller.select(formal, '正式评估 #88')
    const answer = await controller.ask('改成 6200 小时会差多少钱？', 5)

    expect(answer).toMatchObject({ state: 'success', action: 'recalculate' })
    expect(answer.message).not.toMatch(/¥|差价|万元/)
  })

  it.each([
    ['suggestion_timeout', 'timeout', EXPLANATION_FAILURE_MESSAGES.timeout],
    ['suggestion_quota_exceeded', 'quota', EXPLANATION_FAILURE_MESSAGES.quota],
    ['suggestion_validation_failed', 'citation_invalid', EXPLANATION_FAILURE_MESSAGES.citation_invalid]
  ])('操作失败 %s 展示固定说明与显式失败分类', async (errorCode, failureKind, message) => {
    const { api, controller } = setup()
    api.createConversationExplanation.mockImplementation(async (body) =>
      explanationOperation(body, { status: 'failed', errorCode })
    )
    controller.select(formal, '正式评估 #88')
    const answer = await controller.ask('为什么？', 1)

    expect(answer).toMatchObject({ state: 'failure', failureKind, message, degraded: true })
    expect(controller.degraded.value).toBe(true)
  })

  it.each([
    [404, 'forbidden', EXPLANATION_FAILURE_MESSAGES.forbidden],
    [429, 'quota', EXPLANATION_FAILURE_MESSAGES.quota],
    [504, 'timeout', EXPLANATION_FAILURE_MESSAGES.timeout],
    [503, 'unavailable', EXPLANATION_FAILURE_MESSAGES.unavailable],
    [422, 'citation_invalid', EXPLANATION_FAILURE_MESSAGES.citation_invalid]
  ])('HTTP %s 不泄露上游正文并映射为固定说明', async (status, failureKind, message) => {
    const { api, controller } = setup()
    api.createConversationExplanation.mockRejectedValue(Object.assign(new Error('upstream private detail'), { statusCode: status }))
    controller.select(formal, '正式评估 #88')
    const answer = await controller.ask('为什么？', 1)

    expect(answer).toMatchObject({ state: 'failure', failureKind, message })
    expect(answer.message).not.toContain('private detail')
    expect(controller.degraded.value).toBe(failureKind !== 'forbidden')
  })

  it('数据层 DTO 校验拒绝（422）按引用失败处理', async () => {
    const { api, controller } = setup()
    api.createConversationExplanation.mockRejectedValue(new ValuationApiError('解释接口响应格式错误', 422))
    controller.select(formal, '正式评估 #88')
    const answer = await controller.ask('为什么？', 1)

    expect(answer).toMatchObject({
      state: 'failure',
      failureKind: 'citation_invalid',
      message: EXPLANATION_FAILURE_MESSAGES.citation_invalid
    })
  })

  it('POST 超时（TimeoutError）展示固定超时说明，不当作成功', async () => {
    const { api, controller } = setup()
    api.createConversationExplanation.mockRejectedValue(
      Object.assign(new Error('Request timed out after 10000ms'), { name: 'TimeoutError' })
    )
    controller.select(formal, '正式评估 #88')
    const answer = await controller.ask('为什么？', 1)

    expect(answer).toMatchObject({
      state: 'failure',
      failureKind: 'timeout',
      message: EXPLANATION_FAILURE_MESSAGES.timeout
    })
  })

  it('并发重复提问复用同一 operation，只发一次请求', async () => {
    const { api, controller } = setup()
    const pending = deferred<UpstreamConversationExplanation>()
    api.createConversationExplanation.mockReturnValue(pending.promise)
    controller.select(formal, '正式评估 #88')

    const first = controller.ask('为什么？', 1)
    const second = controller.ask('为什么？', 1)
    expect(api.createConversationExplanation).toHaveBeenCalledTimes(1)
    pending.resolve(explanationOperation({
      operation_id: 'explanation-1', card: formal
    }, { template: '同一答复' }))
    expect(await first).toEqual(await second)
  })

  it('网络重试与 pending 轮询复用同一 operation_id，轮询使用 FL 返回的落库键', async () => {
    const { api, controller } = setup()
    api.createConversationExplanation
      .mockRejectedValueOnce(new Error('network disconnected'))
      .mockImplementationOnce(async (body) => explanationOperation(body, { status: 'pending' }))
    api.getConversationExplanation.mockImplementation(async (id: string) =>
      explanationOperation({ operation_id: 'explanation-1', card: formal }, { operationId: id, template: '轮询答复' })
    )
    controller.select(formal, '正式评估 #88')

    await expect(controller.ask('为什么？', 1)).resolves.toMatchObject({ state: 'failure' })
    await expect(controller.ask('为什么？', 1)).resolves.toMatchObject({ state: 'success', message: '轮询答复' })
    expect(api.createConversationExplanation.mock.calls.map(([body]) => body.operation_id)).toEqual([
      'explanation-1', 'explanation-1'
    ])
    expect(api.getConversationExplanation).toHaveBeenCalledWith(explanationOperationKey(formal, 'explanation-1'))
  })

  it('等待总时长超限时返回固定超时说明，不无限轮询 pending', async () => {
    let clock = 0
    const api = {
      createConversationExplanation: vi.fn(async (body: ConversationExplanationRequest) =>
        explanationOperation(body, { status: 'pending' })
      ),
      getConversationExplanation: vi.fn(async (id: string) => explanationOperation(
        { operation_id: 'explanation-1', card: formal },
        { operationId: id, status: 'pending' }
      ))
    }
    const controller = createValuationExplanationController(api, {
      newOperationId: () => 'explanation-1',
      now: () => clock,
      totalTimeoutMs: 3_000,
      sleep: async () => { clock += 1_000 }
    })
    controller.select(formal, '正式评估 #88')
    const answer = await controller.ask('为什么？', 1)

    expect(answer).toMatchObject({
      state: 'failure',
      failureKind: 'timeout',
      message: EXPLANATION_FAILURE_MESSAGES.timeout
    })
    expect(api.getConversationExplanation).toHaveBeenCalledTimes(3)
    expect(api.getConversationExplanation).toHaveBeenCalledWith(explanationOperationKey(formal, 'explanation-1'))
  })

  it('后发先至时旧答复仍绑定旧卡，不覆盖新卡状态', async () => {
    const { api, controller } = setup()
    const first = deferred<UpstreamConversationExplanation>()
    const second = deferred<UpstreamConversationExplanation>()
    api.createConversationExplanation
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    controller.select(formal, '正式卡')
    const firstAnswer = controller.ask('为什么？', 1)
    controller.select(trial, '试算卡')
    const secondAnswer = controller.ask('为什么？', 2)

    second.resolve(explanationOperation(
      { operation_id: api.createConversationExplanation.mock.calls[1]![0].operation_id, card: trial },
      { template: '新卡答复' }
    ))
    await secondAnswer
    first.resolve(explanationOperation(
      { operation_id: api.createConversationExplanation.mock.calls[0]![0].operation_id, card: formal },
      { template: '旧卡答复' }
    ))
    const old = await firstAnswer

    expect(old).toMatchObject({ card: formal, cardLabel: '正式卡', message: '旧卡答复' })
    expect(controller.selected.value?.card).toEqual(trial)
    expect(controller.degraded.value).toBe(false)
  })

  it('旧顶层/嵌套应答别名不再兜底：缺真实 explanation 即引用失败，不展示别名答复', async () => {
    const { api, controller } = setup()
    api.createConversationExplanation.mockResolvedValue({
      id: 'explanation-1',
      operation_id: 'explanation-1',
      status: 'succeeded',
      answer: '嵌套答复',
      remaining_quota: 3
    } as unknown as UpstreamConversationExplanation)
    controller.select(formal, '正式评估 #88')
    const answer = await controller.ask('为什么？', 1)

    expect(answer).toMatchObject({
      state: 'failure',
      failureKind: 'citation_invalid',
      message: EXPLANATION_FAILURE_MESSAGES.citation_invalid,
      evidenceIds: []
    })
    expect(answer.message).not.toContain('嵌套答复')
  })

  it('operation/card 身份不符时返回明确 citation_invalid', async () => {
    const { api, controller } = setup()
    api.createConversationExplanation.mockImplementation(async (body) =>
      explanationOperation(body, { cardKey: 'other-card', template: '不该展示的答复' })
    )
    controller.select(formal, '正式评估 #88')
    const answer = await controller.ask('为什么？', 1)

    expect(answer).toMatchObject({
      state: 'failure',
      failureKind: 'citation_invalid',
      message: EXPLANATION_FAILURE_MESSAGES.citation_invalid
    })
    expect(answer.message).not.toContain('不该展示的答复')
  })

  it.each([
    ['证据为空数组', [] as string[]],
    ['证据含空串', ['result.estimated_value', ' ']]
  ])('成功响应%s时按引用失败处理，不展示模板答复', async (_label, evidenceIds) => {
    const { api, controller } = setup()
    api.createConversationExplanation.mockImplementation(async (body) =>
      explanationOperation(body, { evidenceIds, template: '不该展示的模板' })
    )
    controller.select(formal, '正式评估 #88')
    const answer = await controller.ask('为什么？', 1)

    expect(answer).toMatchObject({
      state: 'failure',
      failureKind: 'citation_invalid',
      message: EXPLANATION_FAILURE_MESSAGES.citation_invalid
    })
    expect(answer.message).not.toContain('不该展示的模板')
  })
})