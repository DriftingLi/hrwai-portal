// 数据访问层单测（票 #32）：断言「给定入参 → 发出什么请求 / 返回什么」，
// 不碰真实网络。路径与查询参数就是与后端（FL 仓）的契约边界。
import { describe, it, expect } from 'vitest'
import {
  batteryReportPath,
  batteryTypeLabels,
  createValuationApi,
  evaluationReportPath,
  EXPLANATION_REQUEST_TIMEOUT_MS,
  valuationErrorMessage,
  valuationErrorStatus,
  type ValuationFetcher,
  type ValuationRequestInit,
  type EvaluationRequest
} from '../valuation'

const wrapped = <T>(data: T) => ({ code: 200, message: 'success', data })

interface Call {
  path: string
  init?: ValuationRequestInit
}

/** 记录调用的假 fetcher；respond 决定每次返回什么 */
function setup(respond: (path: string) => unknown = () => wrapped(undefined)) {
  const calls: Call[] = []
  const fetcher: ValuationFetcher = async (path, init) => {
    calls.push({ path, init })
    return respond(path)
  }
  return { api: createValuationApi(fetcher), calls }
}

describe('会话端点（本仓 BFF）', () => {
  it('getSession 打 /__portal__/valuation/session', async () => {
    const { api, calls } = setup(() => ({ user: { user_id: 1 } }))
    const res = await api.getSession()
    expect(calls[0]).toEqual({ path: '/__portal__/valuation/session', init: { method: 'GET' } })
    expect(res.user).toEqual({ user_id: 1 })
  })

  it('login 提交 {account,password}（令牌不会出现在浏览器这一侧）', async () => {
    const { api, calls } = setup(() => ({ user: { user_id: 1 } }))
    await api.login({ account: 'u1', password: 'p' })
    expect(calls[0]).toEqual({
      path: '/__portal__/valuation/session/login',
      init: { method: 'POST', body: { account: 'u1', password: 'p' } }
    })
  })

  it('logout 打 BFF 登出端点', async () => {
    const { api, calls } = setup(() => ({ ok: true, revoked: true }))
    await api.logout()
    expect(calls[0]).toEqual({ path: '/__portal__/valuation/session/logout', init: { method: 'POST' } })
  })
})

describe('字典端点', () => {
  it('brands / condition-ratings / provinces 不带查询参数', async () => {
    const { api, calls } = setup(() => wrapped([]))
    await api.listBrands()
    await api.listConditionRatings()
    await api.listProvinces()
    expect(calls.map((c) => c.path)).toEqual([
      '/api/valuation/dictionaries/brands',
      '/api/valuation/dictionaries/condition-ratings',
      '/api/valuation/dictionaries/provinces'
    ])
  })

  it('级联查询用后端参数名（vehicle_type / config_type / mast_type），空值不入参', async () => {
    const { api, calls } = setup(() => wrapped([]))
    await api.listVehicleTypes('合力')
    await api.listSeries('合力', '电动平衡重')
    await api.listTonnages('合力', '电动平衡重', 'H 系列')
    await api.listConfigTypes({ brand: '合力', vehicleType: '电动平衡重', series: 'H 系列', tonnage: 3 })
    await api.listMastTypes({
      brand: '合力',
      vehicleType: '电动平衡重',
      series: 'H 系列',
      tonnage: 3,
      configType: '标准'
    })
    await api.listMastHeights({
      brand: '合力',
      vehicleType: '电动平衡重',
      series: 'H 系列',
      tonnage: 3,
      configType: '标准',
      mastType: '三级门架'
    })

    expect(calls[0]?.init?.query).toEqual({ brand: '合力' })
    expect(calls[1]?.init?.query).toEqual({ brand: '合力', vehicle_type: '电动平衡重' })
    expect(calls[2]?.init?.query).toEqual({
      brand: '合力',
      vehicle_type: '电动平衡重',
      series: 'H 系列'
    })
    expect(calls[3]?.init?.query).toEqual({
      brand: '合力',
      vehicle_type: '电动平衡重',
      series: 'H 系列',
      tonnage: 3
    })
    expect(calls[4]?.init?.query).toEqual({
      brand: '合力',
      vehicle_type: '电动平衡重',
      series: 'H 系列',
      tonnage: 3,
      config_type: '标准'
    })
    expect(calls[5]?.init?.query).toEqual({
      brand: '合力',
      vehicle_type: '电动平衡重',
      series: 'H 系列',
      tonnage: 3,
      config_type: '标准',
      mast_type: '三级门架'
    })
  })

  it('全空的级联参数不发空 query（后端用缺省全量分支）', async () => {
    const { api, calls } = setup(() => wrapped([]))
    await api.listSeries(undefined, undefined)
    expect(calls[0]?.init).toEqual({ method: 'GET' })
  })

  it('cities 按省份查询', async () => {
    const { api, calls } = setup(() => wrapped(['广州']))
    const cities = await api.listCities('广东省')
    expect(calls[0]?.init?.query).toEqual({ province: '广东省' })
    expect(cities).toEqual(['广州'])
  })
})

describe('整机评估端点', () => {
  const request = {
    brand: '合力',
    vehicle_type: '电动平衡重',
    series: 'H 系列',
    tonnage: 3,
    config_type: '标准',
    mast_type: '三级门架',
    mast_height_mm: 4500,
    factory_year: 2019,
    sale_year: 2024,
    usage_hours: 1200,
    original_paint: true,
    province: '广东省',
    city: '广州市',
    has_license_plate: true,
    has_registration_certificate: false,
    has_maintenance_records: true,
    condition_rating: 'B'
  }

  it('createEvaluation 用 POST 提交原始字段并解包 data', async () => {
    const { api, calls } = setup(() => wrapped({ id: 88, estimated_value: 100000 }))
    const record = await api.createEvaluation(request)
    expect(calls[0]).toEqual({
      path: '/api/valuation/evaluations',
      init: { method: 'POST', body: request }
    })
    expect(record.id).toBe(88)
  })

  it('listEvaluations 带上分页与筛选项', async () => {
    const { api, calls } = setup(() => wrapped({ total: 0, page: 2, page_size: 10, list: [] }))
    const page = await api.listEvaluations({ page: 2, page_size: 10, brand: '合力', vehicle_type: '电动平衡重' })
    expect(calls[0]?.path).toBe('/api/valuation/evaluations')
    expect(calls[0]?.init?.query).toEqual({
      page: 2,
      page_size: 10,
      brand: '合力',
      vehicle_type: '电动平衡重'
    })
    expect(page.page).toBe(2)
  })

  it('getEvaluation 按 id 取详情', async () => {
    const { api, calls } = setup(() => wrapped({ id: 5 }))
    const detail = await api.getEvaluation(5)
    expect(calls[0]).toEqual({ path: '/api/valuation/evaluations/5', init: { method: 'GET' } })
    expect(detail.id).toBe(5)
  })
})

describe('对话草稿端点路径', () => {
  it('创建、读取、修改、撤回与删除都走 FL 约定端点', async () => {
    const { api, calls } = setup(() => wrapped({}))
    await api.createConversationDraft({ fields: {}, supplemental: {} })
    await api.getConversationDraft('draft-1')
    await api.updateConversationDraft('draft-1', { base_version: 2, fields: {} })
    await api.undoConversationDraft('draft-1', { base_version: 2 })
    await api.deleteConversationDraft('draft-1')

    expect(calls).toEqual([
      {
        path: '/api/valuation/conversation/drafts',
        init: { method: 'POST', body: { fields: {}, supplemental: {} } }
      },
      {
        path: '/api/valuation/conversation/drafts/draft-1',
        init: { method: 'GET' }
      },
      {
        path: '/api/valuation/conversation/drafts/draft-1',
        init: { method: 'PATCH', body: { base_version: 2, fields: {} } }
      },
      {
        path: '/api/valuation/conversation/drafts/draft-1/undo',
        init: { method: 'POST', body: { base_version: 2 } }
      },
      {
        path: '/api/valuation/conversation/drafts/draft-1',
        init: { method: 'DELETE' }
      }
    ])
  })

  it('DELETE 204 无响应体也是成功，不套用 JSON 信封解包', async () => {
    const { api } = setup(() => undefined)
    await expect(api.deleteConversationDraft('draft-1')).resolves.toBeUndefined()
  })

  it('草稿按 FL wire 契约反序列化，PATCH 与 undo 发送 base_version 和 state/range/candidates', async () => {
    const upstream = {
      id: 'draft-1',
      version: 2,
      status: 'editing',
      updated_at: '2026-11-20T10:00:00Z',
      expires_at: '2026-11-20T10:30:00Z',
      can_undo: true,
      can_submit: false,
      supplemental: {},
      fields: {
        usage_hours: { state: 'range', range: { min: 0, max: 100 }, source: 'user' },
        tonnage: { state: 'candidate', candidates: [{ value: 3 }, { value: 3.5 }] }
      }
    }
    const { api, calls } = setup(() => wrapped(upstream))
    expect(await api.getConversationDraft('draft-1')).toEqual(upstream)
    await api.updateConversationDraft('draft-1', {
      base_version: 2,
      fields: {
        usage_hours: { status: 'range', min: 0, max: 100 },
        tonnage: { status: 'candidate', candidates: [3, 3.5] }
      }
    })
    await api.undoConversationDraft('draft-1', { base_version: 2 })
    expect(calls[1]?.init?.body).toEqual({
      base_version: 2,
      fields: {
        usage_hours: { state: 'range', range: { min: 0, max: 100 } },
        tonnage: { state: 'candidate', candidates: [{ value: 3 }, { value: 3.5 }] }
      }
    })
    expect(calls[2]?.init?.body).toEqual({ base_version: 2 })
  })

  it('解释操作提交卡片快照与草稿版本，并按 operation_id 查询', async () => {
    const operation = {
      id: 'explain:formal-1:explanation-1',
      kind: 'explanation',
      operation_id: 'explain:formal-1:explanation-1',
      draft_id: '',
      draft_version: 3,
      status: 'succeeded',
      card_kind: 'formal',
      card_key: 'formal-1',
      first_accepted_user_id: null,
      created_at: '2026-11-28T00:00:00Z',
      updated_at: '2026-11-28T00:00:01Z',
      explanation: {
        schema_version: 1,
        action: 'explain',
        template_key: 'result_snapshot',
        template: '该卡采用 4,800 小时快照。',
        facts: [{ id: 'result.estimated_value', label: '预估残值', value: 33600 }],
        evidence_ids: ['result.estimated_value'],
        formula_version: 'valuation-v2',
        snapshot_id: '88',
        requires_user_action: false,
        card_version: 1
      }
    }
    const { api, calls } = setup(() => wrapped(operation))
    const request = {
      operation_id: 'explanation-1',
      draft_version: 3,
      card: { kind: 'formal' as const, operation_id: 'formal-1', evaluation_id: 88 },
      question: '为什么是这个残值？'
    }

    await expect(api.createConversationExplanation(request)).resolves.toEqual(operation)
    await expect(api.getConversationExplanation('explain:formal-1:explanation-1')).resolves.toEqual(operation)

    expect(calls).toEqual([
      {
        path: '/api/valuation/conversation/explanations',
        init: { method: 'POST', body: request, timeout: EXPLANATION_REQUEST_TIMEOUT_MS }
      },
      {
        path: '/api/valuation/conversation/operations/explain%3Aformal-1%3Aexplanation-1',
        init: { method: 'GET', timeout: EXPLANATION_REQUEST_TIMEOUT_MS }
      }
    ])
  })

  it.each([
    ['顶层 answer/remaining_quota 旧应答', {
      id: 'explanation-1', operation_id: 'explanation-1', status: 'succeeded',
      answer: '旧答复', remaining_quota: 6
    }],
    ['嵌套 result/action 旧应答', {
      id: 'explanation-1', operation_id: 'explanation-1', status: 'succeeded',
      result: { answer: '嵌套答复', action: { type: 'recalculate' }, evidence_ids: ['ev-1'] },
      quota_remaining: 3
    }],
    ['真实 DTO 但证据为空', {
      id: 'explain:formal-1:explanation-1', kind: 'explanation', operation_id: 'explain:formal-1:explanation-1',
      draft_id: '', draft_version: 3, status: 'succeeded', card_kind: 'formal', card_key: 'formal-1',
      first_accepted_user_id: null, created_at: '2026-11-28T00:00:00Z', updated_at: '2026-11-28T00:00:01Z',
      explanation: {
        schema_version: 1, action: 'explain', template_key: 'result_snapshot', template: '答复',
        facts: [], evidence_ids: [], formula_version: 'valuation-v2', requires_user_action: false, card_version: 1
      }
    }]
  ])('%s 在数据层按格式错误拒绝', async (_label, payload) => {
    const { api } = setup(() => wrapped(payload))
    await expect(api.createConversationExplanation({
      operation_id: 'explanation-1',
      draft_version: 3,
      card: { kind: 'formal', operation_id: 'formal-1', evaluation_id: 88 },
      question: '为什么？'
    })).rejects.toMatchObject({ name: 'ValuationApiError', code: 422 })
  })

  it('解释受理的 202 Accepted 信封按成功解包', async () => {
    const operation = {
      id: 'explain:formal-1:explanation-1',
      kind: 'explanation',
      operation_id: 'explain:formal-1:explanation-1',
      draft_id: '',
      draft_version: 3,
      status: 'pending',
      card_kind: 'formal',
      card_key: 'formal-1',
      first_accepted_user_id: null,
      created_at: '2026-11-28T00:00:00Z',
      updated_at: '2026-11-28T00:00:01Z'
    }
    const { api } = setup(() => ({ code: 202, message: 'accepted', data: operation }))
    await expect(api.createConversationExplanation({
      operation_id: 'explanation-1',
      draft_version: 3,
      card: { kind: 'formal', operation_id: 'formal-1', evaluation_id: 88 },
      question: '为什么？'
    })).resolves.toMatchObject({ status: 'pending', card_key: 'formal-1' })
  })

  it('操作提交和查询保留同一 operation_id，并解包正式结果', async () => {
    const operation = {
      id: 'operation-1',
      status: 'succeeded',
      evaluation: { id: 88, usage_hours: 0 }
    }
    const { api, calls } = setup(() => wrapped(operation))
    const request = {
      operation_id: 'operation-1',
      draft_id: 'draft-1',
      draft_version: 2,
      request: { brand: '合力', usage_hours: 0 } as EvaluationRequest
    }
    const created = await api.createConversationOperation(request)
    const polled = await api.getConversationOperation('operation-1')

    expect(calls).toEqual([
      {
        path: '/api/valuation/conversation/operations',
        init: { method: 'POST', body: request }
      },
      {
        path: '/api/valuation/conversation/operations/operation-1',
        init: { method: 'GET' }
      }
    ])
    expect(created.evaluation?.id).toBe(88)
    expect(polled).toEqual(operation)
  })
})

describe('参考试算端点', () => {
  const policyRequest = {
    request_id: 'trial-policy-1',
    brand: '合力',
    vehicle_type: '电动平衡重',
    tonnage: 3,
    factory_year: 2019,
    policy: 'demo' as const
  }

  it('estimateTrial 提交完整草稿与 request_id，并解包 FL 的试算结果', async () => {
    const request = {
      request_id: 'trial-request-1',
      snapshot_id: 'snapshot-hash',
      policy: 'demo' as const,
      brand: '合力',
      vehicle_type: '电动平衡重',
      series: 'H 系列',
      tonnage: 3,
      config_type: '标准',
      mast_type: '三级门架',
      mast_height_mm: 4500,
      factory_year: 2019,
      sale_year: 2026,
      usage_hours: 1200,
      original_paint: true,
      province: '广东省',
      city: '广州市',
      has_license_plate: true,
      has_registration_certificate: true,
      has_maintenance_records: true,
      condition_rating: 'B'
    }
    const result = {
      status: 'priced',
      input: { usage_hours: 1200 },
      assumptions: ['按目录候选配置计算'],
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
      interval: { min: 30000, max: 45000, mid: 37500, width: 15000, width_ratio: 0.4 },
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
    const { api, calls } = setup(() => wrapped(result))

    await expect(api.estimateTrial(request)).resolves.toEqual(result)
    expect(calls).toEqual([
      {
        path: '/api/valuation/trials',
        init: { method: 'POST', body: request }
      }
    ])
  })

  it('FL 的 403 关闭策略归一为 disabled，并保留上游说明', async () => {
    const { api } = setup(() => {
      throw { status: 403, data: { message: '当前组合的参考试算策略未启用' } }
    })

    await expect(api.estimateTrial(policyRequest)).resolves.toEqual({
      status: 'disabled',
      reason_code: 'policy_disabled',
      message: '当前组合的参考试算策略未启用'
    })
  })

  it('FL 的 needs_info 策略原因也归一为 disabled，普通补件仍保持 needs_info', async () => {
    const { api } = setup(() =>
      wrapped({
        status: 'needs_info',
        reason_code: 'policy_not_configured',
        message: '当前组合未配置参考试算策略',
        missing_fields: []
      })
    )

    await expect(api.estimateTrial(policyRequest)).resolves.toMatchObject({
      status: 'disabled',
      reason_code: 'policy_not_configured'
    })

    const needsInfo = createValuationApi(async () =>
      wrapped({ status: 'needs_info', reason_code: 'too_wide', message: '区间仍过宽', missing_fields: ['mast_type'] })
    )
    await expect(needsInfo.estimateTrial(policyRequest)).resolves.toMatchObject({
      status: 'needs_info',
      reason_code: 'too_wide'
    })
  })

  it('非策略错误继续抛出，不伪装成 disabled', async () => {
    const failure = { status: 500, message: 'upstream unavailable' }
    const { api } = setup(() => {
      throw failure
    })

    await expect(api.estimateTrial(policyRequest)).rejects.toBe(failure)
  })
})

describe('电池 RUL 端点', () => {
  const cycles = Array.from({ length: 10 }, (_, i) => ({
    cycle_index: i + 1,
    voltage_series: [3.2, 3.6],
    current_series: [1, 0.3],
    capacity: 1.1
  }))

  it('createBatteryEvaluation 提交循环数据', async () => {
    const { api, calls } = setup(() => wrapped({ evaluation_id: 3, rul_cycles: 800 }))
    const res = await api.createBatteryEvaluation({ battery_type: 'lfp', battery_model: 'X1', cycles })
    expect(calls[0]).toEqual({
      path: '/api/valuation/battery/evaluations',
      init: { method: 'POST', body: { battery_type: 'lfp', battery_model: 'X1', cycles } }
    })
    expect(res.rul_cycles).toBe(800)
  })

  it('listBatteryEvaluations 的分页与类型筛选用后端参数名', async () => {
    const { api, calls } = setup(() => wrapped({ total: 0, items: [] }))
    await api.listBatteryEvaluations({ page: 1, page_size: 20, battery_type: 'ncm' })
    expect(calls[0]?.path).toBe('/api/valuation/battery/evaluations')
    expect(calls[0]?.init?.query).toEqual({ page: 1, page_size: 20, battery_type: 'ncm' })
  })

  it('getBatteryEvaluation 按 id 取详情', async () => {
    const { api, calls } = setup(() => wrapped({ id: 9 }))
    const detail = await api.getBatteryEvaluation(9)
    expect(calls[0]).toEqual({ path: '/api/valuation/battery/evaluations/9', init: { method: 'GET' } })
    expect(detail.id).toBe(9)
  })
})

describe('错误与下载地址', () => {
  it('信封 code !== 200 时抛出带上游 message 的错误', async () => {
    const { api } = setup(() => ({ code: 401, message: 'Token无效或已过期，请重新登录', data: null }))
    await expect(api.getEvaluation(1)).rejects.toThrowError('Token无效或已过期，请重新登录')
  })

  it('非信封响应视为格式错误（不把 undefined 当数据）', async () => {
    const { api } = setup(() => 'oops')
    await expect(api.listBrands()).rejects.toThrowError('估值接口响应格式错误')
  })

  it('登录失败的错误带状态码，页面据此显示原因', async () => {
    const error = new Error('账号或密码错误') as Error & { statusCode: number }
    error.statusCode = 401
    expect(valuationErrorStatus(error)).toBe(401)
    expect(valuationErrorStatus({ response: { status: 403 } })).toBe(403)
    expect(valuationErrorStatus({ code: 422 })).toBe(422)
    expect(valuationErrorStatus(null)).toBeNull()
    expect(valuationErrorStatus({ status: 'oops' })).toBeNull()
  })

  it('可展示文案优先取服务端 message，跳过 ofetch 原始串与本地异常', () => {
    expect(valuationErrorMessage({ data: { message: '账号或密码错误' } })).toBe('账号或密码错误')
    expect(valuationErrorMessage({ data: { statusMessage: '估值登录通道暂不可用' } })).toBe(
      '估值登录通道暂不可用'
    )
    expect(valuationErrorMessage(new Error('[POST] "/api/x": 401 Unauthorized'))).toBe('操作失败，请稍后重试')
    expect(valuationErrorMessage('oops')).toBe('操作失败，请稍后重试')
    expect(valuationErrorMessage(null, '兜底')).toBe('兜底')
  })

  it('报告下载走同源 /api（代理层流式转发）', () => {
    expect(evaluationReportPath(12)).toBe('/api/valuation/evaluations/12/report')
    expect(batteryReportPath(3)).toBe('/api/valuation/battery/evaluations/3/report')
  })

  it('电池类型标签覆盖后端三个枚举值', () => {
    expect(Object.keys(batteryTypeLabels).sort()).toEqual(['lfp', 'ncm', 'other'])
  })
})
