import { describe, expect, it, vi } from 'vitest'
import type { PricedTrialResult, TrialDraft } from '~/api/valuation'
import { createTrialEstimateController } from '~/composables/useTrialEstimate'

const draft: TrialDraft = {
  brand: '合力',
  vehicle_type: '电动平衡重',
  tonnage: 3,
  factory_year: 2019,
  usage_hours: 1200
}

function priced(value = 30000): PricedTrialResult {
  return {
    status: 'priced',
    input: draft,
    assumptions: ['按目录候选计算'],
    candidates: [
      {
        id: 1,
        brand: '合力',
        vehicle_type: '电动平衡重',
        series: 'H 系列',
        tonnage: 3,
        config_type: '标准',
        mast_type: '三级门架',
        mast_height_mm: 4500,
        earliest_factory_year: 2010,
        original_price: 90000,
        updated_at: '2026-11-28T00:00:00Z'
      }
    ],
    missing_fields: [],
    interval: { min: value, max: value + 15000, mid: value + 7500, width: 15000, width_ratio: 0.4 },
    width_ratio: 0.4,
    snapshot: {
      hash: 'snapshot-hash',
      sha7: 'abc1234',
      formula_version: 'valuation-v2',
      formula_hash: 'formula-hash',
      policy: 'demo',
      policy_version: 'trial-v1'
    }
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('useTrialEstimate 状态控制器', () => {
  it('开关默认 false：达标草稿与主动重算都不会调用 FL', async () => {
    const api = { estimateTrial: vi.fn(async () => priced()) }
    const controller = createTrialEstimateController(api, { newRequestId: () => 'trial-1' })

    await controller.updateDraft(draft)
    await controller.recalculate()

    expect(api.estimateTrial).not.toHaveBeenCalled()
    expect(controller.cards.value).toEqual([])
    expect(controller.loading.value).toBe(false)
  })

  it('草稿首次达到最低输入时自动试算一次，并发送同一 request_id', async () => {
    const api = { estimateTrial: vi.fn(async () => priced()) }
    const controller = createTrialEstimateController(api, {
      enabled: true,
      newRequestId: () => 'trial-auto-1'
    })

    await controller.updateDraft({ brand: '合力', vehicle_type: '电动平衡重' })
    expect(api.estimateTrial).not.toHaveBeenCalled()

    await controller.updateDraft(draft)
    expect(api.estimateTrial).toHaveBeenCalledTimes(1)
    expect(api.estimateTrial).toHaveBeenCalledWith({ ...draft, request_id: 'trial-auto-1' })
    expect(controller.cards.value).toHaveLength(1)
    expect(controller.cards.value[0]).toMatchObject({
      requestId: 'trial-auto-1',
      stale: false,
      result: { status: 'priced' }
    })
  })

  it('修改只标旧卡 stale；主动重算追加不可变新卡并保留旧快照', async () => {
    const api = {
      estimateTrial: vi
        .fn()
        .mockResolvedValueOnce(priced(30000))
        .mockResolvedValueOnce(priced(50000))
    }
    let id = 0
    const controller = createTrialEstimateController(api, {
      enabled: true,
      newRequestId: () => `trial-${++id}`
    })

    await controller.updateDraft(draft)
    const oldSnapshot = controller.cards.value[0]!.result
    await controller.updateDraft({ ...draft, usage_hours: 2400 })

    expect(api.estimateTrial).toHaveBeenCalledTimes(1)
    expect(controller.cards.value).toHaveLength(1)
    expect(controller.cards.value[0]!.stale).toBe(true)

    await controller.recalculate()
    expect(api.estimateTrial).toHaveBeenCalledTimes(2)
    expect(api.estimateTrial.mock.calls[1]![0]).toEqual({
      ...draft,
      usage_hours: 2400,
      request_id: 'trial-2'
    })
    expect(controller.cards.value).toHaveLength(2)
    expect(controller.cards.value[0]).toMatchObject({ requestId: 'trial-1', stale: true })
    expect(controller.cards.value[1]).toMatchObject({ requestId: 'trial-2', stale: false })
    expect(controller.cards.value[0]!.result).toBe(oldSnapshot)
    expect(oldSnapshot).toEqual(priced(30000))
    expect(Object.isFrozen(oldSnapshot)).toBe(true)
    expect(Object.isFrozen(controller.cards.value[1]!.result)).toBe(true)
    expect(Object.isFrozen(controller.cards.value[1])).toBe(true)
  })

  it('request_id 标识每次快照，后发先至时只接受最新重算结果', async () => {
    const first = deferred<PricedTrialResult>()
    const second = deferred<PricedTrialResult>()
    const api = {
      estimateTrial: vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    }
    let id = 0
    const controller = createTrialEstimateController(api, {
      enabled: true,
      newRequestId: () => `trial-${++id}`
    })

    const autoRun = controller.updateDraft(draft)
    await controller.updateDraft({ ...draft, usage_hours: 2400 })
    const manualRun = controller.recalculate()
    expect(api.estimateTrial.mock.calls.map(([request]) => request.request_id)).toEqual([
      'trial-1',
      'trial-2'
    ])

    second.resolve(priced(50000))
    await manualRun
    first.resolve(priced(30000))
    await autoRun

    expect(controller.cards.value).toHaveLength(1)
    expect(controller.cards.value[0]).toMatchObject({
      requestId: 'trial-2',
      stale: false,
      result: { interval: { min: 50000, max: 65000 } }
    })
    expect(controller.loading.value).toBe(false)
    expect(controller.error.value).toBe('')
  })
})
