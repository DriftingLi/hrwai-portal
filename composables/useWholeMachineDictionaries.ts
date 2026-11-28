import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { ValuationApi } from '~/api/valuation'

export type WholeMachineDictionaryForm = {
  brand?: string
  vehicle_type?: string
  series?: string
  tonnage?: number
  config_type?: string
  mast_type?: string
  mast_height_mm?: number
  factory_year?: number
  province?: string
  city?: string
}

export const OTHER_SERIES_VALUE = '其它'
export const NONE_MAST_TYPE_VALUE = '无'
export const NONE_MAST_HEIGHT_VALUE = 0

const DOWNSTREAM: Partial<Record<keyof WholeMachineDictionaryForm, Array<keyof WholeMachineDictionaryForm>>> = {
  brand: ['vehicle_type', 'series', 'tonnage', 'config_type', 'mast_type', 'mast_height_mm', 'factory_year'],
  vehicle_type: ['series', 'tonnage', 'config_type', 'mast_type', 'mast_height_mm', 'factory_year'],
  series: ['tonnage', 'config_type', 'mast_type', 'mast_height_mm', 'factory_year'],
  tonnage: ['config_type', 'mast_type', 'mast_height_mm', 'factory_year'],
  config_type: ['mast_type', 'mast_height_mm'],
  mast_type: ['mast_height_mm'],
  province: ['city']
}

/** 旧表单沿用「上游变化清空下游」；对话草稿由控制器按字典兼容性重验。 */
export function resetDownstreamFormFields(form: WholeMachineDictionaryForm, key: keyof WholeMachineDictionaryForm) {
  for (const child of DOWNSTREAM[key] ?? []) form[child] = undefined
}

export function useWholeMachineDictionaries(
  api: ValuationApi,
  form: MaybeRefOrGetter<WholeMachineDictionaryForm>,
  onUpstreamChange?: (key: keyof WholeMachineDictionaryForm) => void
) {
  const vehicleTypes = ref<string[]>([])
  const seriesList = ref<Array<{ id: number; name: string }>>([])
  const tonnages = ref<number[]>([])
  const configTypes = ref<Array<{ id: number; name: string }>>([])
  const mastTypes = ref<Array<{ id: number; name: string }>>([])
  const mastHeights = ref<Array<{ id: number; value_mm: number }>>([])
  const cities = ref<string[]>([])
  const earliestFactoryYear = ref(1980)
  const loading = ref(false)

  const seriesOptions = computed(() => seriesList.value.some((item) => item.name === OTHER_SERIES_VALUE)
    ? seriesList.value
    : [...seriesList.value, { id: -1, name: OTHER_SERIES_VALUE }])
  const mastTypeOptions = computed(() => mastTypes.value.some((item) => item.name === NONE_MAST_TYPE_VALUE)
    ? mastTypes.value
    : [...mastTypes.value, { id: -1, name: NONE_MAST_TYPE_VALUE }])
  const mastHeightOptions = computed(() => mastHeights.value.some((item) => item.value_mm === NONE_MAST_HEIGHT_VALUE)
    ? mastHeights.value
    : [...mastHeights.value, { id: -1, value_mm: NONE_MAST_HEIGHT_VALUE }])
  const currentYear = new Date().getFullYear()
  const factoryYearOptions = computed(() => {
    const years: number[] = []
    for (let year = earliestFactoryYear.value; year <= currentYear; year++) years.push(year)
    return years.reverse()
  })

  const versions = new Map<keyof WholeMachineDictionaryForm, number>()
  let pendingLoads = 0
  const reloadToken = ref(0)
  const previousValues: WholeMachineDictionaryForm = {}
  async function load<T>(
    key: keyof WholeMachineDictionaryForm,
    loader: () => Promise<T>,
    apply: (value: T) => void
  ) {
    const version = (versions.get(key) ?? 0) + 1
    versions.set(key, version)
    pendingLoads += 1
    loading.value = true
    try {
      const value = await loader()
      if (versions.get(key) === version) apply(value)
    } catch {
      // 字典失败不阻断直接输入；调用方展示统一降级提示。
    } finally {
      pendingLoads -= 1
      if (pendingLoads === 0) loading.value = false
    }
  }

  function changed(key: keyof WholeMachineDictionaryForm, value: WholeMachineDictionaryForm[typeof key]) {
    versions.set(key, (versions.get(key) ?? 0) + 1)
    if (previousValues[key] === value) return
    Object.assign(previousValues, { [key]: value })
    onUpstreamChange?.(key)
  }

  function seriesParam(): string | undefined {
    const value = toValue(form).series
    return value === OTHER_SERIES_VALUE ? undefined : value
  }

  watch([() => toValue(form).brand, reloadToken], async () => {
    changed('brand', toValue(form).brand)
    vehicleTypes.value = []
    seriesList.value = []
    tonnages.value = []
    configTypes.value = []
    mastTypes.value = []
    mastHeights.value = []
    earliestFactoryYear.value = 1980
    const brand = toValue(form).brand
    if (!brand) return
    await load(
      'brand',
      () => api.listVehicleTypes(brand),
      (list) => (vehicleTypes.value = list.map((item) => item.name))
    )
  })

  watch([() => toValue(form).vehicle_type, reloadToken], async () => {
    changed('vehicle_type', toValue(form).vehicle_type)
    seriesList.value = []
    tonnages.value = []
    configTypes.value = []
    mastTypes.value = []
    mastHeights.value = []
    earliestFactoryYear.value = 1980
    const brand = toValue(form).brand
    const vehicleType = toValue(form).vehicle_type
    if (!brand || !vehicleType) return
    await load(
      'vehicle_type',
      () => api.listSeries(brand, vehicleType),
      (list) => (seriesList.value = list.map((item) => ({ id: item.id, name: item.name })))
    )
  })

  watch([() => toValue(form).series, reloadToken], async () => {
    changed('series', toValue(form).series)
    tonnages.value = []
    configTypes.value = []
    mastTypes.value = []
    mastHeights.value = []
    earliestFactoryYear.value = 1980
    const brand = toValue(form).brand
    const vehicleType = toValue(form).vehicle_type
    const series = toValue(form).series
    if (!brand || !vehicleType || !series) return
    await load(
      'series',
      () => api.listTonnages(brand, vehicleType, series === OTHER_SERIES_VALUE ? undefined : series),
      (list) => (tonnages.value = list.map((item) => item.value))
    )
  })

  watch([() => toValue(form).tonnage, reloadToken], async () => {
    changed('tonnage', toValue(form).tonnage)
    configTypes.value = []
    mastTypes.value = []
    mastHeights.value = []
    earliestFactoryYear.value = 1980
    const value = toValue(form)
    if (!value.brand || !value.vehicle_type || !value.series || value.tonnage == null) return
    const query = {
      brand: value.brand,
      vehicleType: value.vehicle_type,
      series: value.series === OTHER_SERIES_VALUE ? undefined : value.series,
      tonnage: value.tonnage
    }
    await load(
      'tonnage',
      () => Promise.all([api.listConfigTypes(query), api.getEarliestFactoryYear(query)]),
      ([configs, year]) => {
        configTypes.value = configs.map((item) => ({ id: item.id, name: item.name }))
        earliestFactoryYear.value = year
      }
    )
  })

  watch([() => toValue(form).config_type, reloadToken], async () => {
    changed('config_type', toValue(form).config_type)
    mastTypes.value = []
    mastHeights.value = []
    const value = toValue(form)
    if (!value.brand || !value.vehicle_type || !value.series || value.tonnage == null || !value.config_type) return
    await load(
      'config_type',
      () => api.listMastTypes({
        brand: value.brand,
        vehicleType: value.vehicle_type,
        series: value.series === OTHER_SERIES_VALUE ? undefined : value.series,
        tonnage: value.tonnage,
        configType: value.config_type
      }),
      (list) => (mastTypes.value = list.map((item) => ({ id: item.id, name: item.name })))
    )
  })

  watch([() => toValue(form).mast_type, reloadToken], async () => {
    changed('mast_type', toValue(form).mast_type)
    mastHeights.value = []
    const value = toValue(form)
    if (!value.brand || !value.vehicle_type || !value.series || value.tonnage == null || !value.config_type || !value.mast_type) return
    await load(
      'mast_type',
      () => api.listMastHeights({
        brand: value.brand,
        vehicleType: value.vehicle_type,
        series: value.series === OTHER_SERIES_VALUE ? undefined : value.series,
        tonnage: value.tonnage,
        configType: value.config_type,
        mastType: value.mast_type
      }),
      (list) => (mastHeights.value = list.map((item) => ({ id: item.id, value_mm: item.value_mm })))
    )
  })

  watch([() => toValue(form).province, reloadToken], async () => {
    changed('province', toValue(form).province)
    cities.value = []
    const province = toValue(form).province
    if (!province) return
    await load('province', () => api.listCities(province), (list) => (cities.value = list))
  })

  function clearOptions() {
    for (const key of Object.keys(DOWNSTREAM) as Array<keyof WholeMachineDictionaryForm>) {
      versions.set(key, (versions.get(key) ?? 0) + 1)
    }
    vehicleTypes.value = []
    seriesList.value = []
    tonnages.value = []
    configTypes.value = []
    mastTypes.value = []
    mastHeights.value = []
    cities.value = []
    earliestFactoryYear.value = 1980
  }

  function refresh() {
    reloadToken.value += 1
  }

  return {
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
    clearOptions,
    refresh
  }
}
