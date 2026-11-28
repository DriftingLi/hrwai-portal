<template>
  <form class="form-card" novalidate @submit.prevent="submit">
    <div class="form-card-top" aria-hidden="true"></div>

    <div class="section-heading">
      <h2 class="section-title">填写叉车信息</h2>
      <span class="section-underline" aria-hidden="true"></span>
    </div>

    <fieldset class="form-body" :disabled="submitting">
      <!-- 行 1：品牌 / 车辆类型 -->
      <div class="form-row form-row-2">
        <label class="field">
          <span class="field-label">品牌</span>
          <span class="select-wrap">
            <select
              v-model="form.brand"
              class="form-control"
              data-test="brand"
              :disabled="brands.length === 0"
            >
              <option :value="undefined" disabled>请选择品牌</option>
              <option v-for="item in brands" :key="item.id" :value="item.name">{{ item.name }}</option>
            </select>
            <span class="select-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </span>
          </span>
        </label>

        <label class="field">
          <span class="field-label">车辆类型</span>
          <span class="select-wrap">
            <select
              v-model="form.vehicle_type"
              class="form-control"
              data-test="vehicle-type"
              :disabled="!form.brand || vehicleTypes.length === 0"
            >
              <option :value="undefined" disabled>请选择车辆类型</option>
              <option v-for="item in vehicleTypes" :key="item" :value="item">{{ item }}</option>
            </select>
            <span class="select-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </span>
          </span>
        </label>
      </div>

      <!-- 行 2：系列 / 吨位 / 出厂年份 -->
      <div class="form-row form-row-3">
        <label class="field">
          <span class="field-label">系列</span>
          <span class="select-wrap">
            <select
              v-model="form.series"
              class="form-control"
              data-test="series"
              :disabled="!form.vehicle_type"
            >
              <option :value="undefined" disabled>请选择系列</option>
              <option v-for="item in seriesOptions" :key="item.id" :value="item.name">{{ item.name }}</option>
            </select>
            <span class="select-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </span>
          </span>
        </label>

        <label class="field">
          <span class="field-label">吨位</span>
          <span class="select-wrap">
            <select
              v-model="form.tonnage"
              class="form-control"
              data-test="tonnage"
              :disabled="!form.series"
            >
              <option :value="undefined" disabled>请选择吨位</option>
              <option v-for="item in tonnages" :key="item" :value="item">{{ item }} 吨</option>
            </select>
            <span class="select-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </span>
          </span>
        </label>

        <label class="field">
          <span class="field-label">出厂年份</span>
          <span class="select-wrap">
            <select
              v-model="form.factory_year"
              class="form-control"
              data-test="factory-year"
              :disabled="form.tonnage == null"
            >
              <option :value="undefined" disabled>请选择出厂年份</option>
              <option v-for="year in factoryYearOptions" :key="year" :value="year">{{ year }} 年</option>
            </select>
            <span class="select-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </span>
          </span>
        </label>
      </div>

      <!-- 行 3：配置类型 / 门架类型 / 门架高度 -->
      <div class="form-row form-row-3">
        <label class="field">
          <span class="field-label">配置类型</span>
          <span class="select-wrap">
            <select
              v-model="form.config_type"
              class="form-control"
              data-test="config-type"
              :disabled="form.tonnage == null"
            >
              <option :value="undefined" disabled>请选择</option>
              <option v-for="item in configTypes" :key="item.id" :value="item.name">{{ item.name }}</option>
            </select>
            <span class="select-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </span>
          </span>
        </label>

        <label class="field">
          <span class="field-label">门架类型</span>
          <span class="select-wrap">
            <select
              v-model="form.mast_type"
              class="form-control"
              data-test="mast-type"
              :disabled="!form.config_type"
            >
              <option :value="undefined" disabled>请选择</option>
              <option v-for="item in mastTypeOptions" :key="item.id" :value="item.name">{{ item.name }}</option>
            </select>
            <span class="select-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </span>
          </span>
        </label>

        <label class="field">
          <span class="field-label">门架高度</span>
          <span class="select-wrap">
            <select
              v-model="form.mast_height_mm"
              class="form-control"
              data-test="mast-height"
              :disabled="!form.mast_type"
            >
              <option :value="undefined" disabled>请选择</option>
              <option v-for="item in mastHeightOptions" :key="item.id" :value="item.value_mm">
                {{ item.value_mm === NONE_MAST_HEIGHT_VALUE ? '无' : `${item.value_mm} mm` }}
              </option>
            </select>
            <span class="select-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </span>
          </span>
        </label>
      </div>

      <!-- 行 4：累计工时 / 原厂原漆 -->
      <div class="form-row form-row-2">
        <label class="field">
          <span class="field-label">累计工时</span>
          <input
            v-model.number="form.usage_hours"
            class="form-control"
            type="number"
            min="0"
            max="100000"
            step="100"
            inputmode="numeric"
            placeholder="请输入工时数"
            data-test="usage-hours"
          />
        </label>

        <div class="field">
          <span class="field-label">原厂原漆</span>
          <div class="toggle-row">
            <button
              type="button"
              class="toggle-switch"
              :class="{ 'is-on': form.original_paint }"
              :aria-pressed="form.original_paint"
              aria-label="原厂原漆开关"
              data-test="original-paint"
              @click="form.original_paint = !form.original_paint"
            >
              <span class="toggle-thumb"></span>
            </button>
            <span class="toggle-state" :class="{ 'is-on': form.original_paint }">
              {{ form.original_paint ? '是' : '否' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 行 5：省份 / 城市 -->
      <div class="form-row form-row-2">
        <label class="field">
          <span class="field-label">省份</span>
          <span class="select-wrap">
            <select v-model="form.province" class="form-control" data-test="province">
              <option :value="undefined" disabled>请选择省份</option>
              <option v-for="item in provinces" :key="item" :value="item">{{ item }}</option>
            </select>
            <span class="select-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </span>
          </span>
        </label>

        <label class="field">
          <span class="field-label">城市</span>
          <span class="select-wrap">
            <select
              v-model="form.city"
              class="form-control"
              data-test="city"
              :disabled="!form.province"
            >
              <option :value="undefined" disabled>请选择城市</option>
              <option v-for="item in cities" :key="item" :value="item">{{ item }}</option>
            </select>
            <span class="select-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </span>
          </span>
        </label>
      </div>

      <!-- 行 6：证件与保养 -->
      <div class="form-row form-row-3">
        <div class="field">
          <span class="field-label">是否有车牌</span>
          <div class="toggle-row">
            <button
              type="button"
              class="toggle-switch"
              :class="{ 'is-on': form.has_license_plate }"
              :aria-pressed="form.has_license_plate"
              aria-label="是否有车牌开关"
              data-test="license-plate"
              @click="form.has_license_plate = !form.has_license_plate"
            >
              <span class="toggle-thumb"></span>
            </button>
            <span class="toggle-state" :class="{ 'is-on': form.has_license_plate }">
              {{ form.has_license_plate ? '是' : '否' }}
            </span>
          </div>
        </div>

        <div class="field">
          <span class="field-label">特种设备登记证</span>
          <div class="toggle-row">
            <button
              type="button"
              class="toggle-switch"
              :class="{ 'is-on': form.has_registration_certificate }"
              :aria-pressed="form.has_registration_certificate"
              aria-label="特种设备登记证开关"
              data-test="registration-certificate"
              @click="form.has_registration_certificate = !form.has_registration_certificate"
            >
              <span class="toggle-thumb"></span>
            </button>
            <span class="toggle-state" :class="{ 'is-on': form.has_registration_certificate }">
              {{ form.has_registration_certificate ? '是' : '否' }}
            </span>
          </div>
        </div>

        <div class="field">
          <span class="field-label">保养记录</span>
          <div class="toggle-row">
            <button
              type="button"
              class="toggle-switch"
              :class="{ 'is-on': form.has_maintenance_records }"
              :aria-pressed="form.has_maintenance_records"
              aria-label="保养记录开关"
              data-test="maintenance-records"
              @click="form.has_maintenance_records = !form.has_maintenance_records"
            >
              <span class="toggle-thumb"></span>
            </button>
            <span class="toggle-state" :class="{ 'is-on': form.has_maintenance_records }">
              {{ form.has_maintenance_records ? '是' : '否' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 车况评级 -->
      <div class="form-block">
        <span class="field-label">车况评级</span>
        <div class="rating-pills">
          <button
            v-for="item in sortedConditionRatings"
            :key="item.id"
            type="button"
            class="rating-pill"
            :class="{ 'is-active': form.condition_rating === item.rating }"
            :aria-pressed="form.condition_rating === item.rating"
            :data-test="`rating-${item.rating}`"
            @click="onConditionSelect(item.rating)"
          >
            <span class="rating-pill-name">{{ item.rating }} · {{ item.label }}</span>
            <span class="rating-pill-desc">{{ ratingDescription(item.rating) }}</span>
          </button>
        </div>
      </div>
    </fieldset>

    <div class="form-divider" aria-hidden="true"></div>

    <div class="action-bar">
      <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
      <p v-else-if="loading" class="form-hint">正在加载可选配置…</p>
      <div class="action-bar-buttons">
        <button type="button" class="btn btn-outline" :disabled="submitting" @click="reset">重置</button>
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="!isValid || submitting"
          data-test="submit"
        >
          <svg
            v-if="submitting"
            class="btn-spinner"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span>{{ submitting ? '提交中…' : '提交评估' }}</span>
        </button>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
// 整机残值评估填报（票 #32 后续）：结构、控件与交互与旧 SPA 的 ValuationForm.vue 对齐——
// 单卡 + 六行「2/3/3/2/2/3」栅格、自定义渐变开关、大号车况 pill、底部「重置 + 提交评估」。
// 刻意保留的旧行为：出厂年份是**级联锁定下拉**（下限取原价表 earliest_factory_year）、
// 成交年份不进界面（恒取当前年，随 payload 提交）、系列可填「其它」、门架可填「无」。
import { computed, reactive, ref } from 'vue'
import type { Brand, ConditionRating, EvaluationRecord, EvaluationRequest } from '~/api/valuation'
import { valuationErrorMessage } from '~/api/valuation'
import { useValuationApi } from '~/composables/useValuationApi'
import {
  NONE_MAST_HEIGHT_VALUE,
  resetDownstreamFormFields,
  useWholeMachineDictionaries
} from '~/composables/useWholeMachineDictionaries'
import { validateEvaluationForm } from '~/utils/valuationValidator'

const props = defineProps<{
  brands: Brand[]
  provinces: string[]
  conditionRatings: ConditionRating[]
}>()

const emit = defineEmits<{ evaluated: [record: EvaluationRecord] }>()

const api = useValuationApi()

interface FormState {
  brand?: string
  vehicle_type?: string
  series?: string
  tonnage?: number
  config_type?: string
  mast_type?: string
  mast_height_mm?: number
  factory_year?: number
  /** 成交年份：不进界面（评估的就是「现在这台车值多少」），但校验与提交都要它 */
  sale_year: number
  usage_hours?: number
  province?: string
  city?: string
  condition_rating?: string
  original_paint: boolean
  has_license_plate: boolean
  has_registration_certificate: boolean
  has_maintenance_records: boolean
}

function initialState(): FormState {
  return {
    brand: undefined,
    vehicle_type: undefined,
    series: undefined,
    tonnage: undefined,
    config_type: undefined,
    mast_type: undefined,
    mast_height_mm: undefined,
    factory_year: undefined,
    sale_year: new Date().getFullYear(),
    usage_hours: undefined,
    province: undefined,
    city: undefined,
    condition_rating: undefined,
    // 旧 SPA 的默认值是「是」：绝大多数二手机仍是原厂漆，默认勾上少一次点击
    original_paint: true,
    has_license_plate: false,
    has_registration_certificate: false,
    has_maintenance_records: false
  }
}

const form = reactive<FormState>(initialState())

const submitting = ref(false)
const errorMessage = ref('')

const {
  vehicleTypes,
  seriesList,
  seriesOptions,
  tonnages,
  configTypes,
  mastTypes,
  mastTypeOptions,
  mastHeights,
  mastHeightOptions,
  cities,
  earliestFactoryYear,
  factoryYearOptions,
  loading,
  clearOptions
} = useWholeMachineDictionaries(api, form, (key) => resetDownstreamFormFields(form, key))

const sortedConditionRatings = computed(() =>
  [...props.conditionRatings].sort((a, b) => a.rating.localeCompare(b.rating))
)

const RATING_DESCRIPTION: Record<string, string> = {
  A: '车况极佳，几乎无损耗',
  B: '正常使用磨损',
  C: '明显磨损或维修',
  D: '严重损耗或故障',
  E: '需大修或报废'
}
function ratingDescription(rating: string): string {
  return RATING_DESCRIPTION[rating] ?? ''
}

// ===== 提交 =====
/**
 * 校验用的快照：把表单状态摊平成纯数据。
 * `v-model.number` 在输入框清空后留下的是空串而不是 undefined——直接拿去校验会「看起来填了」，
 * 到后端才报参数错误，所以这里统一归一到 undefined。
 */
function snapshot() {
  const hours =
    typeof form.usage_hours === 'number' && Number.isFinite(form.usage_hours)
      ? form.usage_hours
      : undefined
  return { ...form, usage_hours: hours }
}

const isValid = computed(() => validateEvaluationForm(snapshot()).valid)

/** 再次点击同一评级 = 取消选择（与旧 SPA 一致） */
function onConditionSelect(rating: string) {
  form.condition_rating = form.condition_rating === rating ? undefined : rating
}

function buildPayload(): EvaluationRequest {
  // validateEvaluationForm 已保证必填项齐全，这里只做类型收窄
  return {
    brand: form.brand!,
    vehicle_type: form.vehicle_type!,
    series: form.series!,
    tonnage: form.tonnage!,
    config_type: form.config_type!,
    mast_type: form.mast_type!,
    mast_height_mm: form.mast_height_mm!,
    factory_year: form.factory_year!,
    sale_year: form.sale_year,
    usage_hours: snapshot().usage_hours!,
    original_paint: form.original_paint,
    province: form.province!,
    city: form.city!,
    has_license_plate: form.has_license_plate,
    has_registration_certificate: form.has_registration_certificate,
    has_maintenance_records: form.has_maintenance_records,
    condition_rating: form.condition_rating!
  }
}

async function submit() {
  if (submitting.value) return
  const check = validateEvaluationForm(snapshot())
  if (!check.valid) {
    errorMessage.value = check.message || '请补全表单'
    return
  }
  errorMessage.value = ''
  submitting.value = true
  try {
    // 登录用户由服务端会话自动归属（代理注入 Authorization），匿名也能提交
    emit('evaluated', await api.createEvaluation(buildPayload()))
  } catch (error) {
    errorMessage.value = valuationErrorMessage(error, '评估失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

function reset() {
  Object.assign(form, initialState())
  clearOptions()
  errorMessage.value = ''
}
</script>

<style scoped>
.form-card {
  position: relative;
  max-width: 760px;
  margin: 0 auto;
  padding: var(--space-8);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
}
/* 顶部渐变细线：与旧 SPA 的卡片同一条视觉锚 */
.form-card-top {
  position: absolute;
  inset: 0 0 auto 0;
  height: 2px;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  background: var(--gradient-brand);
  pointer-events: none;
}

.section-heading {
  text-align: center;
  margin-bottom: var(--space-8);
}
.section-title {
  margin: 0 0 var(--space-3);
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
}
.section-underline {
  display: block;
  width: 96px;
  height: 2px;
  margin: 0 auto;
  border-radius: var(--radius-full);
  background: var(--gradient-brand);
}

.form-body {
  border: 0;
  margin: 0;
  padding: 0;
  min-width: 0;
}

.form-row {
  display: grid;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}
.form-row-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.form-row-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}
.field-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

.form-control {
  width: 100%;
  height: 44px;
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border-dark);
  border-radius: var(--radius-md);
  background: #fff;
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: var(--text-base);
  outline: none;
  transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
  -webkit-appearance: none;
  appearance: none;
}
.form-control::placeholder {
  color: var(--color-text-muted);
}
.form-control:focus {
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px var(--color-primary-50);
}
/* 锁定态用虚线边框：一眼能看出「先选上一级」而不是「点了没反应」 */
.form-control:disabled {
  background: var(--color-bg-page);
  color: var(--color-text-muted);
  border-style: dashed;
  border-color: var(--color-border);
  cursor: not-allowed;
}

.select-wrap {
  position: relative;
  display: block;
}
.select-wrap .form-control {
  padding-right: 40px;
  cursor: pointer;
  text-overflow: ellipsis;
}
.select-icon {
  position: absolute;
  right: var(--space-3);
  top: 50%;
  display: inline-flex;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  pointer-events: none;
}
.select-wrap:has(.form-control:disabled) .select-icon {
  opacity: 0.45;
}

/* 开关：轨道渐变 + 白色滑块，与旧 SPA 同构 */
.toggle-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: 44px;
}
.toggle-switch {
  position: relative;
  flex-shrink: 0;
  width: 44px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: var(--radius-full);
  background: var(--color-border);
  cursor: pointer;
  outline: none;
  transition: background var(--duration-base, 200ms), box-shadow var(--duration-base, 200ms);
}
.toggle-switch.is-on {
  background: var(--gradient-brand);
}
.toggle-switch:focus-visible {
  box-shadow: 0 0 0 3px var(--color-primary-50);
}
.toggle-switch:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgb(0 0 0 / 20%);
  transition: transform var(--duration-base, 200ms);
  pointer-events: none;
}
.toggle-switch.is-on .toggle-thumb {
  transform: translateX(20px);
}
.toggle-state {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-muted);
}
.toggle-state.is-on {
  color: var(--color-text-primary);
  font-weight: var(--font-semibold);
}

.form-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}
.rating-pills {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}
.rating-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1, 4px);
  padding: var(--space-3) var(--space-2);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-lg, 12px);
  background: var(--color-bg-card);
  font-family: inherit;
  text-align: center;
  cursor: pointer;
  outline: none;
  transition: border-color var(--duration-fast), transform var(--duration-fast), box-shadow var(--duration-fast);
}
.rating-pill:hover:not(.is-active) {
  border-color: var(--color-primary-400);
  transform: translateY(-1px);
}
.rating-pill:focus-visible {
  box-shadow: 0 0 0 3px var(--color-primary-50);
}
.rating-pill.is-active {
  border-color: transparent;
  background: var(--gradient-brand);
  transform: scale(1.02);
  box-shadow: var(--shadow-sm);
}
.rating-pill-name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  white-space: nowrap;
}
.rating-pill.is-active .rating-pill-name {
  color: #fff;
}
.rating-pill-desc {
  font-size: var(--text-xs);
  line-height: 1.4;
  color: var(--color-text-muted);
}
.rating-pill.is-active .rating-pill-desc {
  color: rgb(255 255 255 / 85%);
}

.form-divider {
  height: 1px;
  margin: var(--space-6) 0;
  background: var(--color-border);
}

.action-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}
.action-bar-buttons {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--space-3);
  margin-left: auto;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  height: 48px;
  border: none;
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: var(--text-base);
  white-space: nowrap;
  cursor: pointer;
  outline: none;
  transition: border-color var(--duration-fast), box-shadow var(--duration-fast), filter var(--duration-fast);
}
.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.btn-outline {
  padding: 0 var(--space-6);
  border: 1.5px solid var(--color-border);
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  font-weight: var(--font-medium);
}
.btn-outline:hover:not(:disabled) {
  border-color: var(--color-primary-500);
  color: var(--color-primary-600);
}
.btn-primary {
  padding: 0 var(--space-8);
  background: var(--gradient-brand);
  color: #fff;
  font-weight: var(--font-semibold);
  box-shadow: var(--shadow-sm);
}
.btn-primary:hover:not(:disabled) {
  filter: brightness(1.05);
}
.btn-spinner {
  animation: btn-spin 0.8s linear infinite;
}
@keyframes btn-spin {
  to {
    transform: rotate(360deg);
  }
}

.form-error {
  margin: 0;
  color: var(--color-danger);
  font-size: var(--text-sm);
}
.form-hint {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

@media (min-width: 640px) {
  .rating-pills {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
@media (min-width: 1024px) {
  .rating-pills {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .form-card {
    padding: var(--space-5) var(--space-4);
  }
  .section-title {
    font-size: var(--text-lg);
  }
  .form-row-2,
  .form-row-3 {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-3);
  }
  .action-bar-buttons {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .btn {
    width: 100%;
  }
}
</style>
