import type { ConversationOperation, DraftFields } from '~/utils/valuationConversation'

/** FL backend/internal/valuation/conversation_dto.go 的 wire 契约，不在门户另造 draft_version/status 形状。 */
export interface UpstreamDraftField {
  state: 'missing' | 'unknown' | 'value' | 'range' | 'candidate'
  value?: string | number | boolean
  range?: { min: number; max: number }
  candidates?: Array<{ value: string | number | boolean; id?: string; label?: string; source?: string; evidence?: unknown }>
  source?: string
  evidence?: unknown
}

export interface UpstreamConversationDraft {
  id: string
  version: number
  status: 'editing' | 'submitted'
  fields: Partial<Record<keyof DraftFields, UpstreamDraftField>>
  supplemental: Record<string, unknown>
  can_undo: boolean
  can_submit: boolean
  updated_at: string
  expires_at: string
}

export interface ConversationDraftPatch {
  base_version: number
  fields?: Partial<Record<keyof DraftFields, UpstreamDraftField>>
  supplemental?: Record<string, unknown>
}

export function draftFieldsToUpstream(fields: Partial<DraftFields>): ConversationDraftPatch['fields'] {
  return Object.fromEntries(Object.entries(fields).map(([key, field]) => {
    const common = {
      ...(field.evidence !== undefined ? { evidence: field.evidence } : {}),
      ...(field.source !== undefined ? { source: field.source } : {})
    }
    if (field.status === 'range') return [key, { state: field.status, range: { min: field.min!, max: field.max! }, ...common }]
    if (field.status === 'candidate') return [key, {
      state: field.status,
      candidates: (field.candidates ?? []).map((value) => ({ value, source: field.source })),
      ...common
    }]
    return [key, {
      state: field.status,
      ...(field.status === 'value' ? { value: field.value } : {}),
      ...common
    }]
  }))
}

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
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  query?: Record<string, unknown>
  body?: unknown
  /** 透传 ofetch 的毫秒超时；解释受理不能无限等待。 */
  timeout?: number
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
    code?: unknown
  }
  // code 是本仓 ValuationApiError 携带的上游信封码（例如本地 DTO 校验的 422）。
  const candidates = [record.status, record.statusCode, record.response?.status, record.code]
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
  // FL 的异步受理端点（建议 / 解释）返回 202 Accepted，信封 code 与 HTTP 状态一致；
  // 2xx 都算成功，不能只认 200。
  if (wrapped.code < 200 || wrapped.code >= 300) {
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

export type TrialPolicy = 'demo' | 'pilot'

/** 试算接收部分草稿；未知、范围和候选由 FL 解释，门户不补业务默认值。 */
export type TrialDraft = Partial<EvaluationRequest> & {
  factory_year_min?: number
  factory_year_max?: number
  policy?: TrialPolicy
  [key: string]: unknown
}

export interface TrialRequest extends TrialDraft {
  request_id: string
  snapshot_id?: string
  policy: TrialPolicy
}

export interface TrialCandidate {
  id: number
  brand: string
  vehicle_type: string
  series: string
  tonnage: number
  config_type: string
  mast_type: string
  mast_height_mm: number
  earliest_factory_year: number
  original_price: number
  updated_at: string
}

export interface TrialInterval {
  min: number
  max: number
  mid: number
  width: number
  width_ratio: number
}

export interface TrialSnapshotMeta {
  hash: string
  sha7: string
  formula_version: string
  formula_hash: string
  policy: string
  policy_version: string
}

interface TrialResultBase {
  request_id?: string
  snapshot_id?: string
  reason_code?: string
  message?: string
  input?: TrialDraft
  assumptions?: string[]
  candidates?: TrialCandidate[]
  missing_fields?: string[]
  snapshot?: TrialSnapshotMeta
}

export interface PricedTrialResult extends TrialResultBase {
  status: 'priced'
  input: TrialDraft
  assumptions: string[]
  candidates: TrialCandidate[]
  missing_fields: string[]
  interval: TrialInterval
  width_ratio: number
  snapshot: TrialSnapshotMeta
}

export interface NeedsInfoTrialResult extends TrialResultBase {
  status: 'needs_info'
  missing_fields: string[]
}

/** 门户展示态：由 FL 的 403 或 needs_info 策略原因归一，门户不自行放行。 */
export interface DisabledTrialResult extends TrialResultBase {
  status: 'disabled'
}

export type TrialResult = PricedTrialResult | NeedsInfoTrialResult | DisabledTrialResult

const TRIAL_POLICY_REASONS = new Set([
  'policy_disabled',
  'policy_not_configured',
  'policy_forbidden'
])

function normalizeTrialResult(result: TrialResult): TrialResult {
  if (result.status === 'needs_info' && result.reason_code && TRIAL_POLICY_REASONS.has(result.reason_code)) {
    return {
      status: 'disabled',
      reason_code: result.reason_code,
      message: result.message
    }
  }
  return result
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

export type ValuationExplanationCard =
  | { kind: 'formal'; operation_id: string; evaluation_id: number }
  | { kind: 'trial'; request_id: string; snapshot_id: string }

export interface ConversationExplanationRequest {
  operation_id: string
  draft_version: number
  card: ValuationExplanationCard
  question: string
}

export interface ExplanationFact {
  id: string
  label: string
  value: unknown
}

/** FL conversation_explanation_dto.go 的 ValuationExplanationResult；正文只读 template。 */
export interface UpstreamExplanationResult {
  schema_version: number
  action: 'explain' | 'recalculate'
  template_key: string
  template: string
  facts: ExplanationFact[]
  evidence_ids: string[]
  formula_version: string
  snapshot_id?: string
  requires_user_action: boolean
  card_version: number
}

/** FL ConversationOperation 的解释投影；FL 不返回 answer/content/text、reason_code 或额度。 */
export interface UpstreamConversationExplanation {
  id: string
  kind: string
  operation_id: string
  draft_id: string
  draft_version: number
  base_version?: number
  status: 'pending' | 'succeeded' | 'failed' | 'stale'
  error_code?: string
  evaluation_id?: number
  explanation?: UpstreamExplanationResult
  card_kind?: string
  card_key?: string
  first_accepted_user_id: number | null
  created_at: string
  updated_at: string
}

/** 解释受理与轮询的单次请求上限；POST 不能无限挂起在 pending 之前。 */
export const EXPLANATION_REQUEST_TIMEOUT_MS = 10_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function parseExplanationFact(value: unknown): ExplanationFact | null {
  if (!isRecord(value) || !isNonEmptyString(value.id) || typeof value.label !== 'string') return null
  // 只投影契约字段；FL 之后新增的事实字段被忽略而不是原样透传。
  return { id: value.id, label: value.label, value: value.value }
}

function parseExplanationResult(value: unknown): UpstreamExplanationResult | null {
  if (!isRecord(value) || value.schema_version !== 1 ||
    !['explain', 'recalculate'].includes(String(value.action)) ||
    !isNonEmptyString(value.template_key) || !isNonEmptyString(value.template) ||
    !Array.isArray(value.facts) || !Array.isArray(value.evidence_ids) ||
    value.evidence_ids.length === 0 || value.evidence_ids.length > 16 ||
    !value.evidence_ids.every(isNonEmptyString) ||
    !isNonEmptyString(value.formula_version) || typeof value.requires_user_action !== 'boolean' ||
    !Number.isInteger(value.card_version) || Number(value.card_version) < 1 ||
    (value.snapshot_id !== undefined && typeof value.snapshot_id !== 'string')) return null
  const facts = value.facts.map(parseExplanationFact)
  if (facts.some((fact) => fact === null)) return null
  return {
    schema_version: 1,
    action: value.action as UpstreamExplanationResult['action'],
    template_key: value.template_key,
    template: value.template,
    facts: facts as ExplanationFact[],
    evidence_ids: [...value.evidence_ids] as string[],
    formula_version: value.formula_version,
    ...(isNonEmptyString(value.snapshot_id) ? { snapshot_id: value.snapshot_id } : {}),
    requires_user_action: value.requires_user_action,
    card_version: value.card_version as number
  }
}

/**
 * 严格投影 FL 的 ConversationOperation 解释视图（conversation_operation_dto.go +
 * conversation_explanation_dto.go）。旧版的顶层/嵌套 answer·content·text、reason_code、
 * remaining_quota/quota、degraded 等别名一律不再兜底——缺真实字段就是格式错误，
 * 由调用方映射成 citation_invalid，而不是把空答复当成功展示。
 */
function parseConversationExplanation(value: unknown): UpstreamConversationExplanation {
  const invalid = () => new ValuationApiError('解释接口响应格式错误', 422)
  if (!isRecord(value) || !isNonEmptyString(value.id) || !isNonEmptyString(value.operation_id) ||
    value.kind !== 'explanation' || typeof value.draft_id !== 'string' ||
    !Number.isInteger(value.draft_version) ||
    (value.base_version !== undefined && !Number.isInteger(value.base_version)) ||
    !['pending', 'succeeded', 'failed', 'stale'].includes(String(value.status)) ||
    !isNonEmptyString(value.card_kind) || !isNonEmptyString(value.card_key) ||
    (value.first_accepted_user_id !== null && typeof value.first_accepted_user_id !== 'number') ||
    !isNonEmptyString(value.created_at) || !isNonEmptyString(value.updated_at)) throw invalid()
  let explanation: UpstreamExplanationResult | undefined
  if (value.explanation !== undefined) {
    explanation = parseExplanationResult(value.explanation) ?? undefined
    if (!explanation) throw invalid()
  }
  return {
    id: value.id,
    kind: value.kind,
    operation_id: value.operation_id,
    draft_id: value.draft_id,
    draft_version: value.draft_version as number,
    ...(value.base_version !== undefined ? { base_version: value.base_version as number } : {}),
    status: value.status as UpstreamConversationExplanation['status'],
    ...(typeof value.error_code === 'string' ? { error_code: value.error_code } : {}),
    ...(typeof value.evaluation_id === 'number' ? { evaluation_id: value.evaluation_id } : {}),
    ...(explanation ? { explanation } : {}),
    card_kind: value.card_kind,
    card_key: value.card_key,
    first_accepted_user_id: value.first_accepted_user_id as number | null,
    created_at: value.created_at,
    updated_at: value.updated_at
  }
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
  const get = async <T>(path: string, query?: Record<string, unknown>, timeout?: number): Promise<T> =>
    unwrap<T>(
      await fetcher(path, {
        method: 'GET',
        // 空查询串不发：全空的级联参数要让后端走「缺省全量」分支
        ...(query && Object.keys(query).length > 0 ? { query } : {}),
        ...(timeout ? { timeout } : {})
      })
    )

  const post = async <T>(path: string, body?: unknown, timeout?: number): Promise<T> =>
    unwrap<T>(
      await fetcher(path, {
        method: 'POST',
        ...(body === undefined ? {} : { body }),
        ...(timeout ? { timeout } : {})
      })
    )

  const patch = async <T>(path: string, body?: unknown): Promise<T> =>
    unwrap<T>(await fetcher(path, { method: 'PATCH', ...(body === undefined ? {} : { body }) }))

  const remove = async <T>(path: string): Promise<T> =>
    unwrap<T>(await fetcher(path, { method: 'DELETE' }))

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
    // 出厂年份下拉的下限：按 品牌+车型+系列+吨位 查 active 原价表的 MIN(earliest_factory_year)。
    // series 传「其它」时要当没传（后端忽略该条件做降级查询），匹配不到时后端返回 1980。
    getEarliestFactoryYear: async (query: {
      brand?: string
      vehicleType?: string
      series?: string
      tonnage?: number | string
    }): Promise<number> => {
      const data = await get<{ earliest_factory_year: number }>(
        `${VALUATION_API_PREFIX}/dictionaries/earliest-factory-year`,
        pruneQuery({
          brand: query.brand,
          vehicle_type: query.vehicleType,
          series: query.series,
          tonnage: query.tonnage
        })
      )
      const year = Number(data?.earliest_factory_year)
      return Number.isFinite(year) && year > 0 ? year : 1980
    },

    // ===== 整机评估 =====
    createConversationDraft: (body: { fields?: Partial<Record<keyof DraftFields, UpstreamDraftField>>; supplemental?: Record<string, unknown> } = {}) =>
      post<UpstreamConversationDraft>(`${VALUATION_API_PREFIX}/conversation/drafts`, body),
    getConversationDraft: (id: string) =>
      get<UpstreamConversationDraft>(`${VALUATION_API_PREFIX}/conversation/drafts/${encodeURIComponent(id)}`),
    updateConversationDraft: (id: string, body: Omit<ConversationDraftPatch, 'fields'> & { fields?: Partial<DraftFields> }) =>
      patch<UpstreamConversationDraft>(
        `${VALUATION_API_PREFIX}/conversation/drafts/${encodeURIComponent(id)}`,
        { ...body, ...(body.fields ? { fields: draftFieldsToUpstream(body.fields) } : {}) }
      ),
    undoConversationDraft: (id: string, body: { base_version: number }) =>
      post<UpstreamConversationDraft>(
        `${VALUATION_API_PREFIX}/conversation/drafts/${encodeURIComponent(id)}/undo`,
        body
      ),
    deleteConversationDraft: (id: string): Promise<void> =>
      fetcher(`${VALUATION_API_PREFIX}/conversation/drafts/${encodeURIComponent(id)}`, { method: 'DELETE' }).then(() => undefined),
    createConversationOperation: (body: {
      operation_id: string
      draft_id: string
      draft_version: number
      request: EvaluationRequest
    }) => post<ConversationOperation>(`${VALUATION_API_PREFIX}/conversation/operations`, body),
    getConversationOperation: (id: string) =>
      get<ConversationOperation>(
        `${VALUATION_API_PREFIX}/conversation/operations/${encodeURIComponent(id)}`
      ),
    createConversationExplanation: async (body: ConversationExplanationRequest) =>
      parseConversationExplanation(
        await post(`${VALUATION_API_PREFIX}/conversation/explanations`, body, EXPLANATION_REQUEST_TIMEOUT_MS)
      ),
    getConversationExplanation: async (id: string) =>
      parseConversationExplanation(
        await get(
          `${VALUATION_API_PREFIX}/conversation/operations/${encodeURIComponent(id)}`,
          undefined,
          EXPLANATION_REQUEST_TIMEOUT_MS
        )
      ),
    async estimateTrial(request: TrialRequest): Promise<TrialResult> {
      try {
        return normalizeTrialResult(await post<TrialResult>(`${VALUATION_API_PREFIX}/trials`, request))
      } catch (cause) {
        // FL 的试算 403 专指策略关闭/禁止；投影成关闭卡，其余失败仍交给控制器展示错误。
        if (valuationErrorStatus(cause) === 403) {
          return {
            status: 'disabled',
            reason_code: 'policy_disabled',
            message: valuationErrorMessage(cause, '参考试算暂未开放')
          }
        }
        throw cause
      }
    },
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
