// 残值评估数据访问层（票 #32）：页面组件不直接 $fetch（与 api/featured.ts 同一个约定）。
//
// 两个前缀，一条凭证边界：
// - /api/valuation/** —— 经既有 server/middleware/api-proxy.ts 转发到后端；服务端从 httpOnly
//   会话 Cookie 里取出 access token 注入 Authorization: Bearer，浏览器始终不接触令牌；
// - /__portal__/valuation/session/** —— 本仓 BFF 自己的会话端点（登录 / 登出 / 当前用户），
//   令牌在这里被收进 Cookie，响应里只有会话摘要。
//
// 上游契约（FL 仓，搬家期间不可改）见 swagger：/valuation/dictionaries/*、/evaluations*、
// /battery/evaluations*、/auth/*。响应统一包成 {code,message,data}（code=200 成功）。

export interface Wrapped<T> {
  code: number
  message: string
  data: T
}

export interface ValuationRequestInit {
  method?: 'GET' | 'POST'
  query?: Record<string, unknown>
  body?: unknown
}

/** 由 composable 绑定成「请求上下文感知」的取数器（SSR 转发 Cookie，客户端同源相对路径） */
export type ValuationFetcher = (path: string, init?: ValuationRequestInit) => Promise<unknown>

export const VALUATION_API_PREFIX = '/api/valuation'
export const VALUATION_BFF_PREFIX = '/__portal__/valuation/session'

/** 数据层错误：带上游返回的 message，页面直接展示 */
export class ValuationApiError extends Error {
  readonly code: number

  constructor(message: string, code = 0) {
    super(message)
    this.name = 'ValuationApiError'
    this.code = code
  }
}

/**
 * 从各类错误里抽一句能给用户看的话：优先服务端给的 statusMessage/message，
 * 再退回本地错误文案；ofetch 的 "[POST] ... 401" 这类原始串不作为提示。
 */
export function valuationErrorMessage(error: unknown, fallback = '操作失败，请稍后重试'): string {
  if (!error || typeof error !== 'object') return fallback
  const record = error as {
    data?: { message?: unknown; statusMessage?: unknown }
    statusMessage?: unknown
    message?: unknown
  }
  const candidates = [record.data?.message, record.data?.statusMessage, record.statusMessage, record.message]
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue
    const text = candidate.trim()
    if (!text || /^\[(GET|POST|PUT|DELETE|PATCH)\]/i.test(text)) continue
    return text
  }
  return fallback
}

/** 从各类 fetch 异常里取 HTTP 状态码（401 用来决定跳登录页） */
export function valuationErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null
  const record = error as {
    status?: unknown
    statusCode?: unknown
    response?: { status?: unknown }
  }
  const candidates = [record.status, record.statusCode, record.response?.status]
  for (const value of candidates) {
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return null
}

function unwrap<T>(payload: unknown): T {
  const wrapped = payload as Wrapped<T> | null
  if (!wrapped || typeof wrapped !== 'object' || typeof wrapped.code !== 'number') {
    throw new ValuationApiError('估值接口响应格式错误')
  }
  if (wrapped.code !== 200) {
    throw new ValuationApiError(wrapped.message || '估值接口请求失败', wrapped.code)
  }
  return wrapped.data
}

function pruneQuery(query: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    result[key] = value
  }
  return result
}

// ===== 会话（BFF） =====

export interface ValuationSessionUser {
  user_id: number
  account: string
  username: string
  role: string
}

export interface ValuationSessionResponse {
  user: ValuationSessionUser | null
}

export interface ValuationLoginResponse {
  user: ValuationSessionUser
}

export interface ValuationLogoutResponse {
  ok: boolean
  revoked: boolean
}

// ===== 字典（公开组，SSR 可预取） =====

export interface Brand {
  id: number
  name: string
  k_brand: number
  is_active: boolean
}

export interface VehicleType {
  id: number
  name: string
  power_type: string
  earliest_factory_year: number
}

export interface Series {
  id: number
  brand: string
  name: string
  earliest_factory_year: number
}

export interface Tonnage {
  id: number
  value: number
}

export interface ConfigOption {
  id: number
  name: string
}

export interface MastType {
  id: number
  name: string
}

export interface MastHeight {
  id: number
  value_mm: number
}

export interface ConditionRating {
  id: number
  rating: string
  label: string
  base_coefficient: number
}

// ===== 整机残值评估 =====

export interface EvaluationRequest {
  brand: string
  vehicle_type: string
  series: string
  tonnage: number
  config_type: string
  mast_type: string
  mast_height_mm: number
  factory_year: number
  sale_year: number
  usage_hours: number
  original_paint: boolean
  province: string
  city: string
  has_license_plate: boolean
  has_registration_certificate: boolean
  has_maintenance_records: boolean
  condition_rating: string
}

export interface DimensionScore {
  label: string
  value: number
}

export interface EvaluationRecord extends EvaluationRequest {
  id: number
  created_at: string
  updated_at: string
  original_price: number
  k_time: number
  k_hours: number
  k_brand: number
  k_condition: number
  k_market: number
  k_time_adjusted: number
  estimated_value: number
  confidence_low: number
  confidence_high: number
  report_pdf_path?: string
  dimension_scores: DimensionScore[]
  suggestions: string[]
  lambda_electric: number
  lambda_combustion: number
  decay_anchor: number
}

export interface EvaluationPage {
  total: number
  page: number
  page_size: number
  list: EvaluationRecord[]
}

export interface EvaluationListQuery {
  page?: number
  page_size?: number
  brand?: string
  vehicle_type?: string
}

// ===== 电池 RUL 评估 =====

export type BatteryType = 'lfp' | 'ncm' | 'other'

export interface BatteryCycle {
  cycle_index: number
  voltage_series: number[]
  current_series: number[]
  capacity: number
}

export interface BatteryRequest {
  battery_type: BatteryType
  battery_model?: string
  cycles: BatteryCycle[]
}

export interface BatterySummary {
  id: number
  battery_type: string
  battery_model: string
  cycle_count: number
  rul_cycles: number
  soh_percent: number
  confidence: number
  created_at: string
}

export interface FeatureImportance {
  index: number
  name: string
  group: string
  weight: number
  normalized: number
}

export interface BatteryRecord extends BatterySummary {
  confidence_low: number
  confidence_high: number
  report_pdf_path: string
  updated_at: string
  suggestions?: string[]
  feature_importance?: FeatureImportance[]
}

export interface BatteryListPage {
  total: number
  items: BatterySummary[]
}

export interface BatteryListQuery {
  page?: number
  page_size?: number
  battery_type?: string
}

export interface CreateBatteryResponse {
  evaluation_id: number
  battery_type: string
  cycle_count: number
  rul_cycles: number
  soh_percent: number
  confidence: number
  confidence_low: number
  confidence_high: number
  suggestions: string[]
  created_at: string
}

/** 电池类型标签（与后端枚举 lfp/ncm/other 对齐） */
export const batteryTypeLabels: Record<string, string> = {
  lfp: '磷酸铁锂（LFP）',
  ncm: '三元锂（NCM）',
  other: '其他'
}

/** 车况评级缺标签时的兜底（评级值 A-E 本身可读） */
export function conditionRatingLabel(rating: string): string {
  return rating ? `${rating} 级` : '-'
}

/** 报告下载地址（同源 BFF：代理层流式转发 PDF，不读进内存） */
export function evaluationReportPath(id: number): string {
  return `${VALUATION_API_PREFIX}/evaluations/${id}/report`
}

export function batteryReportPath(id: number): string {
  return `${VALUATION_API_PREFIX}/battery/evaluations/${id}/report`
}

/**
 * 数据层工厂：所有端点都从这里走，页面只拿到语义方法。
 * fetcher 由 composable 绑定（SSR 转发原始请求头 / 客户端同源），因此本文件无环境分支。
 */
export function createValuationApi(fetcher: ValuationFetcher) {
  const get = async <T>(path: string, query?: Record<string, unknown>): Promise<T> =>
    unwrap<T>(
      await fetcher(path, {
        method: 'GET',
        // 空查询串不发：全空的级联参数要让后端走「缺省全量」分支
        ...(query && Object.keys(query).length > 0 ? { query } : {})
      })
    )

  const post = async <T>(path: string, body?: unknown): Promise<T> =>
    unwrap<T>(await fetcher(path, { method: 'POST', ...(body === undefined ? {} : { body }) }))

  return {
    // ===== 会话 =====
    async getSession(): Promise<ValuationSessionResponse> {
      return (await fetcher(VALUATION_BFF_PREFIX, { method: 'GET' })) as ValuationSessionResponse
    },
    async login(credentials: { account: string; password: string }): Promise<ValuationLoginResponse> {
      return (await fetcher(`${VALUATION_BFF_PREFIX}/login`, {
        method: 'POST',
        body: credentials
      })) as ValuationLoginResponse
    },
    async logout(): Promise<ValuationLogoutResponse> {
      return (await fetcher(`${VALUATION_BFF_PREFIX}/logout`, { method: 'POST' })) as ValuationLogoutResponse
    },

    // ===== 字典 =====
    listBrands: () => get<Brand[]>(`${VALUATION_API_PREFIX}/dictionaries/brands`),
    listVehicleTypes: (brand?: string) =>
      get<VehicleType[]>(`${VALUATION_API_PREFIX}/dictionaries/vehicle-types`, pruneQuery({ brand })),
    listSeries: (brand?: string, vehicleType?: string) =>
      get<Series[]>(
        `${VALUATION_API_PREFIX}/dictionaries/series`,
        pruneQuery({ brand, vehicle_type: vehicleType })
      ),
    listTonnages: (brand?: string, vehicleType?: string, series?: string) =>
      get<Tonnage[]>(
        `${VALUATION_API_PREFIX}/dictionaries/tonnages`,
        pruneQuery({ brand, vehicle_type: vehicleType, series })
      ),
    listConfigTypes: (query: { brand?: string; vehicleType?: string; series?: string; tonnage?: number | string }) =>
      get<ConfigOption[]>(
        `${VALUATION_API_PREFIX}/dictionaries/config-types`,
        pruneQuery({
          brand: query.brand,
          vehicle_type: query.vehicleType,
          series: query.series,
          tonnage: query.tonnage
        })
      ),
    listMastTypes: (query: {
      brand?: string
      vehicleType?: string
      series?: string
      tonnage?: number | string
      configType?: string
    }) =>
      get<MastType[]>(
        `${VALUATION_API_PREFIX}/dictionaries/mast-types`,
        pruneQuery({
          brand: query.brand,
          vehicle_type: query.vehicleType,
          series: query.series,
          tonnage: query.tonnage,
          config_type: query.configType
        })
      ),
    listMastHeights: (query: {
      brand?: string
      vehicleType?: string
      series?: string
      tonnage?: number | string
      configType?: string
      mastType?: string
    }) =>
      get<MastHeight[]>(
        `${VALUATION_API_PREFIX}/dictionaries/mast-heights`,
        pruneQuery({
          brand: query.brand,
          vehicle_type: query.vehicleType,
          series: query.series,
          tonnage: query.tonnage,
          config_type: query.configType,
          mast_type: query.mastType
        })
      ),
    listConditionRatings: () => get<ConditionRating[]>(`${VALUATION_API_PREFIX}/dictionaries/condition-ratings`),
    listProvinces: () => get<string[]>(`${VALUATION_API_PREFIX}/dictionaries/provinces`),
    listCities: (province: string) =>
      get<string[]>(`${VALUATION_API_PREFIX}/dictionaries/cities`, pruneQuery({ province })),

    // ===== 整机评估 =====
    createEvaluation: (request: EvaluationRequest) =>
      post<EvaluationRecord>(`${VALUATION_API_PREFIX}/evaluations`, request),
    listEvaluations: (query: EvaluationListQuery = {}) =>
      get<EvaluationPage>(
        `${VALUATION_API_PREFIX}/evaluations`,
        pruneQuery({
          page: query.page,
          page_size: query.page_size,
          brand: query.brand,
          vehicle_type: query.vehicle_type
        })
      ),
    getEvaluation: (id: number) => get<EvaluationRecord>(`${VALUATION_API_PREFIX}/evaluations/${id}`),

    // ===== 电池 RUL 评估 =====
    createBatteryEvaluation: (request: BatteryRequest) =>
      post<CreateBatteryResponse>(`${VALUATION_API_PREFIX}/battery/evaluations`, request),
    listBatteryEvaluations: (query: BatteryListQuery = {}) =>
      get<BatteryListPage>(
        `${VALUATION_API_PREFIX}/battery/evaluations`,
        pruneQuery({
          page: query.page,
          page_size: query.page_size,
          battery_type: query.battery_type
        })
      ),
    getBatteryEvaluation: (id: number) =>
      get<BatteryRecord>(`${VALUATION_API_PREFIX}/battery/evaluations/${id}`)
  }
}

export type ValuationApi = ReturnType<typeof createValuationApi>
