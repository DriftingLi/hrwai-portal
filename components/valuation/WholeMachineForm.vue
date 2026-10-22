<template>
  <form class="valuation-card" @submit.prevent="submit">
    <fieldset class="form-section" :disabled="submitting">
      <legend class="section-title">车辆信息</legend>
      <div class="form-grid">
        <label class="field">
          <span class="field-label">品牌 <em>*</em></span>
          <select v-model="form.brand" class="field-input" data-test="brand">
            <option value="">请选择品牌</option>
            <option v-for="item in brands" :key="item.id" :value="item.name">{{ item.name }}</option>
          </select>
        </label>

        <label class="field">
          <span class="field-label">车型 <em>*</em></span>
          <select v-model="form.vehicle_type" class="field-input" :disabled="!form.brand" data-test="vehicle-type">
            <option value="">请选择车型</option>
            <option v-for="item in vehicleTypes" :key="item.id" :value="item.name">{{ item.name }}</option>
          </select>
        </label>

        <label class="field">
          <span class="field-label">系列 <em>*</em></span>
          <select v-model="form.series" class="field-input" :disabled="!form.vehicle_type" data-test="series">
            <option value="">请选择系列</option>
            <option v-for="item in seriesOptions" :key="item.id" :value="item.name">{{ item.name }}</option>
          </select>
        </label>

        <label class="field">
          <span class="field-label">吨位 <em>*</em></span>
          <select
            v-model.number="form.tonnage"
            class="field-input"
            :disabled="!form.series"
            data-test="tonnage"
          >
            <option :value="0">请选择吨位</option>
            <option v-for="item in tonnageOptions" :key="item.id" :value="item.value">
              {{ formatTonnage(item.value) }}
            </option>
          </select>
        </label>
      </div>
    </fieldset>

    <fieldset class="form-section" :disabled="submitting">
      <legend class="section-title">配置信息</legend>
      <div class="form-grid">
        <label class="field">
          <span class="field-label">配置类型 <em>*</em></span>
          <select v-model="form.config_type" class="field-input" :disabled="!form.tonnage" data-test="config-type">
            <option value="">请选择配置类型</option>
            <option v-for="item in configOptions" :key="item.id" :value="item.name">{{ item.name }}</option>
          </select>
        </label>

        <label class="field">
          <span class="field-label">门架类型 <em>*</em></span>
          <select v-model="form.mast_type" class="field-input" :disabled="!form.config_type" data-test="mast-type">
            <option value="">请选择门架类型</option>
            <option v-for="item in mastTypeOptions" :key="item.id" :value="item.name">{{ item.name }}</option>
          </select>
        </label>

        <label class="field">
          <span class="field-label">门架高度</span>
          <select
            v-model.number="form.mast_height_mm"
            class="field-input"
            :disabled="!form.mast_type"
            data-test="mast-height"
          >
            <option :value="0">无（不适用）</option>
            <option v-for="item in mastHeightOptions" :key="item.id" :value="item.value_mm">
              {{ formatMastHeight(item.value_mm) }}
            </option>
          </select>
        </label>

        <label class="field">
          <span class="field-label">原厂漆</span>
          <span class="checkbox-inline">
            <input v-model="form.original_paint" type="checkbox" data-test="original-paint" />
            <span>仍为原厂漆</span>
          </span>
        </label>
      </div>
    </fieldset>

    <fieldset class="form-section" :disabled="submitting">
      <legend class="section-title">使用与区域</legend>
      <div class="form-grid">
        <label class="field">
          <span class="field-label">出厂年份 <em>*</em></span>
          <input
            v-model.number="form.factory_year"
            class="field-input"
            type="number"
            min="1980"
            max="2100"
            inputmode="numeric"
            placeholder="如 2019"
            data-test="factory-year"
          />
        </label>

        <label class="field">
          <span class="field-label">成交年份 <em>*</em></span>
          <input
            v-model.number="form.sale_year"
            class="field-input"
            type="number"
            min="1980"
            max="2100"
            inputmode="numeric"
            placeholder="如 2024"
            data-test="sale-year"
          />
        </label>

        <label class="field">
          <span class="field-label">累计使用小时</span>
          <input
            v-model.number="form.usage_hours"
            class="field-input"
            type="number"
            min="0"
            inputmode="numeric"
            placeholder="新车填 0"
            data-test="usage-hours"
          />
        </label>

        <label class="field">
          <span class="field-label">省份 <em>*</em></span>
          <select v-model="form.province" class="field-input" data-test="province">
            <option value="">请选择省份</option>
            <option v-for="item in provinces" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>

        <label class="field">
          <span class="field-label">城市 <em>*</em></span>
          <select v-model="form.city" class="field-input" :disabled="!form.province" data-test="city">
            <option value="">请选择城市</option>
            <option v-for="item in cityOptions" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>
      </div>
    </fieldset>

    <fieldset class="form-section" :disabled="submitting">
      <legend class="section-title">证件与车况</legend>
      <div class="checkbox-row">
        <label class="checkbox-inline">
          <input v-model="form.has_license_plate" type="checkbox" data-test="license-plate" />
          <span>有车牌</span>
        </label>
        <label class="checkbox-inline">
          <input v-model="form.has_registration_certificate" type="checkbox" data-test="registration-certificate" />
          <span>有登记证</span>
        </label>
        <label class="checkbox-inline">
          <input v-model="form.has_maintenance_records" type="checkbox" data-test="maintenance-records" />
          <span>有维保记录</span>
        </label>
      </div>

      <div class="rating-row" role="radiogroup" aria-label="车况评级">
        <span class="field-label">车况评级 <em>*</em></span>
        <label v-for="item in conditionRatings" :key="item.id" class="rating-option">
          <input v-model="form.condition_rating" type="radio" :value="item.rating" />
          <span class="rating-badge">{{ item.rating }}</span>
          <span class="rating-label">{{ item.label }}</span>
        </label>
      </div>
    </fieldset>

    <div class="submit-row">
      <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
      <p v-else-if="loading" class="form-hint">正在加载可选配置…</p>
      <button type="submit" class="btn-primary" :disabled="submitting">
        {{ submitting ? '评估中…' : '开始评估' }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type {
  Brand,
  ConfigOption,
  ConditionRating,
  EvaluationRecord,
  EvaluationRequest,
  MastHeight,
  MastType,
  Series,
  Tonnage,
  VehicleType
} from '~/api/valuation'
import { useValuationApi } from '~/composables/useValuationApi'
import { valuationErrorMessage } from '~/api/valuation'
import { formatMastHeight, formatTonnage } from '~/utils/valuationFormat'

defineProps<{
  brands: Brand[]
  provinces: string[]
  conditionRatings: ConditionRating[]
}>()

const emit = defineEmits<{ evaluated: [record: EvaluationRecord] }>()

const api = useValuationApi()

const form = reactive<EvaluationRequest>({
  brand: '',
  vehicle_type: '',
  series: '',
  tonnage: 0,
  config_type: '',
  mast_type: '',
  mast_height_mm: 0,
  factory_year: 0,
  sale_year: 0,
  usage_hours: 0,
  original_paint: false,
  province: '',
  city: '',
  has_license_plate: false,
  has_registration_certificate: false,
  has_maintenance_records: false,
  condition_rating: ''
})

const vehicleTypes = ref<VehicleType[]>([])
const seriesOptions = ref<Series[]>([])
const tonnageOptions = ref<Tonnage[]>([])
const configOptions = ref<ConfigOption[]>([])
const mastTypeOptions = ref<MastType[]>([])
const mastHeightOptions = ref<MastHeight[]>([])
const cityOptions = ref<string[]>([])

const loading = ref(false)
const submitting = ref(false)
const errorMessage = ref('')

// 级联请求的竞态守卫：只让最后一次请求的结果落到选项里
let requestVersion = 0
async function runCascade<T>(loader: () => Promise<T>): Promise<T | null> {
  const version = ++requestVersion
  loading.value = true
  try {
    const value = await loader()
    return version === requestVersion ? value : null
  } catch {
    return null
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

watch(
  () => form.brand,
  async () => {
    form.vehicle_type = ''
    form.series = ''
    form.tonnage = 0
    form.config_type = ''
    form.mast_type = ''
    form.mast_height_mm = 0
    vehicleTypes.value = []
    seriesOptions.value = []
    tonnageOptions.value = []
    configOptions.value = []
    mastTypeOptions.value = []
    mastHeightOptions.value = []
    if (!form.brand) return
    const list = await runCascade(() => api.listVehicleTypes(form.brand))
    if (list) vehicleTypes.value = list
  }
)

watch(
  () => form.vehicle_type,
  async () => {
    form.series = ''
    form.tonnage = 0
    form.config_type = ''
    form.mast_type = ''
    form.mast_height_mm = 0
    seriesOptions.value = []
    tonnageOptions.value = []
    configOptions.value = []
    mastTypeOptions.value = []
    mastHeightOptions.value = []
    if (!form.brand || !form.vehicle_type) return
    const list = await runCascade(() => api.listSeries(form.brand, form.vehicle_type))
    if (list) seriesOptions.value = list
  }
)

watch(
  () => form.series,
  async () => {
    form.tonnage = 0
    form.config_type = ''
    form.mast_type = ''
    form.mast_height_mm = 0
    tonnageOptions.value = []
    configOptions.value = []
    mastTypeOptions.value = []
    mastHeightOptions.value = []
    if (!form.series) return
    const list = await runCascade(() => api.listTonnages(form.brand, form.vehicle_type, form.series))
    if (list) tonnageOptions.value = list
  }
)

watch(
  () => form.tonnage,
  async () => {
    form.config_type = ''
    form.mast_type = ''
    form.mast_height_mm = 0
    configOptions.value = []
    mastTypeOptions.value = []
    mastHeightOptions.value = []
    if (!form.tonnage) return
    const list = await runCascade(() =>
      api.listConfigTypes({
        brand: form.brand,
        vehicleType: form.vehicle_type,
        series: form.series,
        tonnage: form.tonnage
      })
    )
    if (list) configOptions.value = list
  }
)

watch(
  () => form.config_type,
  async () => {
    form.mast_type = ''
    form.mast_height_mm = 0
    mastTypeOptions.value = []
    mastHeightOptions.value = []
    if (!form.config_type) return
    const list = await runCascade(() =>
      api.listMastTypes({
        brand: form.brand,
        vehicleType: form.vehicle_type,
        series: form.series,
        tonnage: form.tonnage,
        configType: form.config_type
      })
    )
    if (list) mastTypeOptions.value = list
  }
)

watch(
  () => form.mast_type,
  async () => {
    form.mast_height_mm = 0
    mastHeightOptions.value = []
    if (!form.mast_type) return
    const list = await runCascade(() =>
      api.listMastHeights({
        brand: form.brand,
        vehicleType: form.vehicle_type,
        series: form.series,
        tonnage: form.tonnage,
        configType: form.config_type,
        mastType: form.mast_type
      })
    )
    if (list) mastHeightOptions.value = list
  }
)

watch(
  () => form.province,
  async () => {
    form.city = ''
    cityOptions.value = []
    if (!form.province) return
    const list = await runCascade(() => api.listCities(form.province))
    if (list) cityOptions.value = list
  }
)

/** 提交前的前端校验：只挡「必填 / 年份先后」这类可判定的错，业务校验仍以后端为准 */
function validate(): string | null {
  if (!form.brand) return '请选择品牌'
  if (!form.vehicle_type) return '请选择车型'
  if (!form.series) return '请选择系列'
  if (!form.tonnage) return '请选择吨位'
  if (!form.config_type) return '请选择配置类型'
  if (!form.mast_type) return '请选择门架类型'
  if (!form.factory_year || form.factory_year < 1980) return '请填写有效的出厂年份'
  if (!form.sale_year || form.sale_year < form.factory_year) return '成交年份不能早于出厂年份'
  if (form.usage_hours < 0) return '累计使用小时不能为负'
  if (!form.province) return '请选择省份'
  if (!form.city) return '请选择城市'
  if (!form.condition_rating) return '请选择车况评级'
  return null
}

async function submit() {
  const invalid = validate()
  if (invalid) {
    errorMessage.value = invalid
    return
  }
  errorMessage.value = ''
  submitting.value = true
  try {
    // 登录用户由服务端会话自动归属（Authorization 由代理注入），匿名也能提交
    const record = await api.createEvaluation({ ...form })
    emit('evaluated', record)
  } catch (error) {
    errorMessage.value = valuationErrorMessage(error, '评估失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.valuation-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-8);
  box-shadow: var(--shadow-sm);
}
.form-section {
  border: 0;
  padding: 0;
  margin: 0 0 var(--space-8);
  min-width: 0;
}
.section-title {
  padding: 0;
  margin-bottom: var(--space-4);
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  border-left: 3px solid var(--color-primary-500);
  padding-left: var(--space-3);
  line-height: 1.2;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4) var(--space-5);
}
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}
.field-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  font-weight: var(--font-medium);
}
.field-label em {
  color: var(--color-danger);
  font-style: normal;
}
.field-input {
  width: 100%;
  min-height: 42px;
  padding: 10px 12px;
  border: 1px solid var(--color-border-dark);
  border-radius: var(--radius-md);
  background: #fff;
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: var(--text-base);
  transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
}
.field-input:focus {
  outline: none;
  border-color: var(--color-primary-400);
  box-shadow: 0 0 0 3px var(--color-primary-50);
}
.field-input:disabled {
  background: var(--color-bg-page);
  color: var(--color-text-muted);
  cursor: not-allowed;
}
.checkbox-inline {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 42px;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}
.checkbox-inline input {
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary-500);
}
.checkbox-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-6);
  margin-bottom: var(--space-4);
}
.rating-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}
.rating-option {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 8px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  cursor: pointer;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  transition: border-color var(--duration-fast), background var(--duration-fast);
}
.rating-option:hover {
  border-color: var(--color-primary-300);
}
.rating-option input {
  accent-color: var(--color-primary-500);
}
.rating-badge {
  font-family: var(--font-mono);
  font-weight: var(--font-semibold);
  color: var(--color-primary-700);
}
.rating-label {
  color: var(--color-text-tertiary);
}
.submit-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-4);
  flex-wrap: wrap;
  border-top: 1px solid var(--color-border-light);
  padding-top: var(--space-6);
}
.form-error {
  margin: 0;
  color: var(--color-danger);
  font-size: var(--text-sm);
}
.form-hint {
  margin: 0;
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}
.btn-primary {
  min-height: 44px;
  padding: 12px 36px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--gradient-brand);
  color: #fff;
  font-family: inherit;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  cursor: pointer;
  transition: opacity var(--duration-fast), transform var(--duration-fast);
}
.btn-primary:hover:not(:disabled) {
  opacity: 0.92;
}
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 1023px) {
  .form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 640px) {
  .valuation-card {
    padding: var(--space-5);
  }
  .form-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
