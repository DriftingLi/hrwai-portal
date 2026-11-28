import { describe, expect, it, vi } from 'vitest'
import type {
  ConversationExplanationRequest,
  UpstreamConversationExplanation,
  ValuationExplanationCard
} from '~/api/valuation'
import { createValuationExplanationController } from '../useValuationExplanations'

const formal: ValuationExplanationCard = {
  kind: 'formal', operation_id: 'formal-1', evaluation_id: 88
}
const trial: ValuationExplanationCard = {
  kind: 'trial', request_id: 'trial-1', snapshot_id: 'snapshot-old'
}

function succeeded(operationId: string, answer: string, remaining = 7): UpstreamConversationExplanation {
  return { operation_id: operationId, status: 'succeeded', answer, remaining_quota: remaining }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise })
  return { promise, resolve }
}

function setup() {
  const api = {
    createConversationExplanation: vi.fn(async (body: ConversationExplanationRequest) =>
      succeeded(body.operation_id, `解释 ${body.card.kind}`)
    ),
    getConversationExplanation: vi.fn()
  }
  let sequence = 0
  const controller = createValuationExplanationController(api, {
    newOperationId: () => `explanation-${++sequence}`,
    sleep: async () => {}
  })
  return { api, controller }
}

describe('估值解释控制器', () => {
  it('不同卡片绑定各自快照，同一问题不会串用金额或工时', async () => {
    const { api, controller } = setup()
    api.createConversationExplanation.mockImplementation(async (body) =>
      succeeded(body.operation_id, body.card.kind === 'formal' ? '正式卡采用 4,800 小时。' : '试算卡采用 6,200 小时。')
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
    expect(controller.remainingQuota.value).toBe(7)
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
    api.createConversationExplanation.mockResolvedValue({
      ...succeeded('explanation-1', '请按当前草稿重新评估，旧结果卡不会被覆盖。'),
      action: 'recalculate'
    })
    controller.select(formal, '正式评估 #88')
    const answer = await controller.ask('改成 6200 小时会差多少钱？', 5)

    expect(answer).toMatchObject({ state: 'success', action: 'recalculate' })
    expect(answer.message).not.toMatch(/¥|差价|万元/)
  })

  it.each([
    ['model_timeout', '解释服务暂时超时，请稍后再试。你仍可查看当前卡片和报告。'],
    ['quota_exhausted', '解释额度已用完，请稍后再试。你仍可查看当前卡片和报告。'],
    ['citation_failed', '解释依据校验失败，请稍后再试。你仍可查看当前卡片和报告。']
  ])('操作失败 %s 展示固定说明并保留额度状态', async (reasonCode, message) => {
    const { api, controller } = setup()
    api.createConversationExplanation.mockResolvedValue({
      operation_id: 'explanation-1', status: 'failed', reason_code: reasonCode,
      remaining_quota: reasonCode === 'quota_exhausted' ? 0 : 6,
      degraded: true
    })
    controller.select(formal, '正式评估 #88')
    const answer = await controller.ask('为什么？', 1)

    expect(answer).toMatchObject({ state: 'failure', message, degraded: true })
    expect(controller.remainingQuota.value).toBe(reasonCode === 'quota_exhausted' ? 0 : 6)
    expect(controller.degraded.value).toBe(true)
  })

  it.each([
    [404, '该结果暂不可解释，请检查登录状态或结果权限。'],
    [429, '解释额度已用完，请稍后再试。你仍可查看当前卡片和报告。'],
    [504, '解释服务暂时超时，请稍后再试。你仍可查看当前卡片和报告。'],
    [503, '解释暂时不可用，请稍后再试。你仍可查看当前卡片和报告。']
  ])('HTTP %s 不泄露上游正文并映射为固定说明', async (status, message) => {
    const { api, controller } = setup()
    api.createConversationExplanation.mockRejectedValue(Object.assign(new Error('upstream private detail'), { statusCode: status }))
    controller.select(formal, '正式评估 #88')
    const answer = await controller.ask('为什么？', 1)

    expect(answer).toMatchObject({ state: 'failure', message })
    expect(answer.message).not.toContain('private detail')
    if (status === 429) {
      expect(controller.remainingQuota.value).toBe(0)
      expect(controller.degraded.value).toBe(true)
    }
  })

  it('并发重复提问复用同一 operation，只发一次请求', async () => {
    const { api, controller } = setup()
    const pending = deferred<UpstreamConversationExplanation>()
    api.createConversationExplanation.mockReturnValue(pending.promise)
    controller.select(formal, '正式评估 #88')

    const first = controller.ask('为什么？', 1)
    const second = controller.ask('为什么？', 1)
    expect(api.createConversationExplanation).toHaveBeenCalledTimes(1)
    pending.resolve(succeeded('explanation-1', '同一答复'))
    expect(await first).toEqual(await second)
  })

  it('网络重试与 pending 轮询复用同一 operation_id', async () => {
    const { api, controller } = setup()
    api.createConversationExplanation
      .mockRejectedValueOnce(new Error('network disconnected'))
      .mockResolvedValueOnce({ operation_id: 'explanation-1', status: 'pending' })
    api.getConversationExplanation.mockResolvedValue(succeeded('explanation-1', '轮询答复'))
    controller.select(formal, '正式评估 #88')

    await expect(controller.ask('为什么？', 1)).resolves.toMatchObject({ state: 'failure' })
    await expect(controller.ask('为什么？', 1)).resolves.toMatchObject({ state: 'success', message: '轮询答复' })
    expect(api.createConversationExplanation.mock.calls.map(([body]) => body.operation_id)).toEqual([
      'explanation-1', 'explanation-1'
    ])
    expect(api.getConversationExplanation).toHaveBeenCalledWith('explanation-1')
  })

  it('后发先至时旧答复仍绑定旧卡，不覆盖新卡额度', async () => {
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

    second.resolve(succeeded('explanation-2', '新卡答复', 4))
    await secondAnswer
    first.resolve(succeeded('explanation-1', '旧卡答复', 8))
    const old = await firstAnswer

    expect(old).toMatchObject({ card: formal, cardLabel: '正式卡', message: '旧卡答复' })
    expect(controller.remainingQuota.value).toBe(4)
    expect(controller.selected.value?.card).toEqual(trial)
  })

  it('兼容嵌套 result 与 id 返回，仍按请求 operation 校验', async () => {
    const { api, controller } = setup()
    api.createConversationExplanation.mockResolvedValue({
      id: 'explanation-1', status: 'succeeded',
      result: { answer: '嵌套答复', action: { type: 'recalculate' }, evidence_ids: ['ev-1'] },
      quota_remaining: 3
    })
    controller.select(formal, '正式评估 #88')
    const answer = await controller.ask('为什么？', 1)

    expect(answer).toMatchObject({
      state: 'success', message: '嵌套答复', action: 'recalculate', evidenceIds: ['ev-1']
    })
    expect(controller.remainingQuota.value).toBe(3)
  })

  it('成功响应缺少可展示答复时按引用失败处理，不展示模板键', async () => {
    const { api, controller } = setup()
    api.createConversationExplanation.mockResolvedValue({
      operation_id: 'explanation-1', status: 'succeeded', explanation: { evidence_ids: ['ev-1'] }
    })
    controller.select(formal, '正式评估 #88')
    const answer = await controller.ask('为什么？', 1)

    expect(answer).toMatchObject({
      state: 'failure',
      message: '解释依据校验失败，请稍后再试。你仍可查看当前卡片和报告。'
    })
  })
})
