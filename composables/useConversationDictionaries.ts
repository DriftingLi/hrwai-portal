import { computed, watch, type Ref } from 'vue'
import type { Brand, ConditionRating, ValuationApi } from '~/api/valuation'
import { useWholeMachineDictionaries } from '~/composables/useWholeMachineDictionaries'
import { draftValues, type DraftFieldKey, type DraftFields } from '~/utils/valuationConversation'
import {
  conversationDictionaryOptions,
  conversationOptionLabel,
  conversationUpstreamKeys,
  countExplicitFields,
  valuationConversationFields
} from '~/utils/valuationConversationFields'

interface ConversationDictionaryProps {
  brands: Brand[]
  provinces: string[]
  conditionRatings: ConditionRating[]
}

export function useConversationDictionaries(
  api: ValuationApi,
  props: ConversationDictionaryProps,
  fields: Ref<DraftFields>,
  revalidateFields: (allowed: Partial<Record<DraftFieldKey, Array<string | number>>>) => Promise<void>
) {
  const dictionaries = useWholeMachineDictionaries(api, computed(() => draftValues(fields.value)))
  const {
    vehicleTypes, seriesOptions, tonnages, configTypes, mastTypeOptions,
    mastHeightOptions, cities, factoryYearOptions, refresh, clearOptions
  } = dictionaries

  function dictionaryOptions(key: DraftFieldKey): Array<string | number> {
    if (!dictionaryEnabled(key)) return []
    return conversationDictionaryOptions(key, {
      brands: props.brands,
      provinces: props.provinces,
      conditionRatings: props.conditionRatings,
      vehicleTypes: vehicleTypes.value,
      seriesOptions: seriesOptions.value,
      tonnages: tonnages.value,
      configTypes: configTypes.value,
      mastTypeOptions: mastTypeOptions.value,
      mastHeightOptions: mastHeightOptions.value,
      cities: cities.value,
      factoryYearOptions: factoryYearOptions.value
    })
  }

  function dictionaryEnabled(key: DraftFieldKey): boolean {
    const value = (fieldKey: DraftFieldKey) => fields.value[fieldKey]?.status === 'value'
    switch (key) {
      case 'vehicle_type': return value('brand')
      case 'series': return value('brand') && value('vehicle_type')
      case 'tonnage': return value('brand') && value('vehicle_type') && value('series')
      case 'config_type': return value('brand') && value('vehicle_type') && value('series') && value('tonnage')
      case 'mast_type': return dictionaryEnabled('config_type') && value('config_type')
      case 'mast_height_mm': return dictionaryEnabled('mast_type') && value('mast_type')
      case 'factory_year': return value('tonnage')
      case 'city': return value('province')
      default: return true
    }
  }

  function refreshAfterChange(key: DraftFieldKey) {
    if (conversationUpstreamKeys.has(key)) refresh()
  }

  watch([vehicleTypes, seriesOptions, tonnages, configTypes, mastTypeOptions, mastHeightOptions, cities, factoryYearOptions], () => {
    const allowed: Partial<Record<DraftFieldKey, Array<string | number>>> = {}
    if (vehicleTypes.value.length) allowed.vehicle_type = vehicleTypes.value
    if (seriesOptions.value.length) allowed.series = seriesOptions.value.map((item) => item.name)
    if (tonnages.value.length) allowed.tonnage = tonnages.value
    if (configTypes.value.length) allowed.config_type = configTypes.value.map((item) => item.name)
    if (mastTypeOptions.value.length) allowed.mast_type = mastTypeOptions.value.map((item) => item.name)
    if (mastHeightOptions.value.length) allowed.mast_height_mm = mastHeightOptions.value.map((item) => item.value_mm)
    if (factoryYearOptions.value.length) allowed.factory_year = factoryYearOptions.value
    if (cities.value.length) allowed.city = cities.value
    if (Object.keys(allowed).length) void revalidateFields(allowed).catch(() => undefined)
  })

  return {
    dictionaryOptions,
    optionLabel: (key: DraftFieldKey, option: string | number) => conversationOptionLabel(key, option, props.conditionRatings),
    completeCount: computed(() => countExplicitFields(fields.value, valuationConversationFields)),
    refresh,
    refreshAfterChange,
    clearOptions
  }
}
