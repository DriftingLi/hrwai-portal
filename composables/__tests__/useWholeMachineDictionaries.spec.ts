import { describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, reactive } from 'vue'
import {
  resetDownstreamFormFields,
  useWholeMachineDictionaries,
  type WholeMachineDictionaryForm
} from '../useWholeMachineDictionaries'

function completeForm(): WholeMachineDictionaryForm {
  return {
    brand: '合力',
    vehicle_type: '电动平衡重式',
    series: 'H 系列',
    tonnage: 3,
    config_type: '标准',
    mast_type: '两级门架',
    mast_height_mm: 3000,
    factory_year: 2021,
    province: '江苏省',
    city: '苏州市'
  }
}

function setup() {
  const api = {
    listVehicleTypes: vi.fn(async () => [{ id: 1, name: '电动平衡重式' }]),
    listSeries: vi.fn(async () => [{ id: 1, name: 'H 系列' }]),
    listTonnages: vi.fn(async () => [{ value: 3 }]),
    listConfigTypes: vi.fn(async () => [{ id: 1, name: '标准' }]),
    getEarliestFactoryYear: vi.fn(async () => 2000),
    listMastTypes: vi.fn(async () => [{ id: 1, name: '两级门架' }]),
    listMastHeights: vi.fn(async () => [{ id: 1, value_mm: 3000 }]),
    listCities: vi.fn(async () => ['苏州市'])
  }
  const form = reactive<WholeMachineDictionaryForm>({})
  const scope = effectScope()
  const dictionaries = scope.run(() => useWholeMachineDictionaries(api as never, form))!
  return { api, form, dictionaries, scope }
}

describe('整机字典共享级联', () => {
  it('完整表单同时加载各级字典，互不取消彼此的结果', async () => {
    const { form, dictionaries, scope } = setup()
    Object.assign(form, completeForm())
    await nextTick()
    dictionaries.refresh()
    await vi.waitFor(() => {
      expect(dictionaries.vehicleTypes.value).toEqual(['电动平衡重式'])
      expect(dictionaries.seriesOptions.value.map((item) => item.name)).toEqual(['H 系列', '其它'])
      expect(dictionaries.tonnages.value).toEqual([3])
      expect(dictionaries.configTypes.value).toEqual([{ id: 1, name: '标准' }])
      expect(dictionaries.mastTypeOptions.value.map((item) => item.name)).toEqual(['两级门架', '无'])
      expect(dictionaries.mastHeightOptions.value.map((item) => item.value_mm)).toEqual([3000, 0])
      expect(dictionaries.cities.value).toEqual(['苏州市'])
      expect(dictionaries.factoryYearOptions.value[0]).toBe(new Date().getFullYear())
      expect(dictionaries.loading.value).toBe(false)
    })
    scope.stop()
  })

  it('旧表单上游变化仍清空下游，无关事实不被重置', () => {
    const form: WholeMachineDictionaryForm = { ...completeForm(), usage_hours: 4800 } as WholeMachineDictionaryForm
    resetDownstreamFormFields(form, 'tonnage')
    expect(form.tonnage).toBe(3)
    expect(form.config_type).toBeUndefined()
    expect(form.mast_type).toBeUndefined()
    expect(form.mast_height_mm).toBeUndefined()
    expect(form.factory_year).toBeUndefined()
    expect(form.city).toBe('苏州市')
  })

  it('快速切换品牌时迟到的旧响应不能覆盖新字典', async () => {
    const { api, form, dictionaries, scope } = setup()
    let resolveOld!: (value: Array<{ id: number; name: string }>) => void
    api.listVehicleTypes.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve }))
    form.brand = '旧品牌'
    await nextTick()
    form.brand = '新品牌'
    await nextTick()
    await vi.waitFor(() => expect(dictionaries.vehicleTypes.value).toEqual(['电动平衡重式']))
    resolveOld([{ id: 99, name: '旧车型' }])
    await Promise.resolve()
    expect(dictionaries.vehicleTypes.value).toEqual(['电动平衡重式'])
    scope.stop()
  })
})
