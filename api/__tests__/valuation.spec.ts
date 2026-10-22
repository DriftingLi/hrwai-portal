// 数据访问层单测（票 #32）：断言「给定入参 → 发出什么请求 / 返回什么」，
// 不碰真实网络。路径与查询参数就是与后端（FL 仓）的契约边界。
import { describe, it, expect } from 'vitest'
import {
  batteryReportPath,
  batteryTypeLabels,
  createValuationApi,
  evaluationReportPath,
  valuationErrorMessage,
  valuationErrorStatus,
  type ValuationFetcher,
  type ValuationRequestInit
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
