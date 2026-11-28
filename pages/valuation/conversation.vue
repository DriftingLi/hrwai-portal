<template>
  <ValuationShell
    title="对话式整机残值评估"
    subtitle="先用字典点选或直接输入完善车辆草稿，核对全部字段后明确确认。结果卡按时间顺序保留，每次重估都保留当时的输入。"
    active="conversation"
  >
    <div class="valuation-stage">
      <p v-if="dictionaryError" class="notice" role="status">
        字典数据暂时不可用，仍可在草稿中直接输入；级联点选会暂时为空。
      </p>
      <ValuationConversation
        :brands="brands"
        :provinces="provinces"
        :condition-ratings="conditionRatings"
        :trial-enabled="runtimeConfig.public.valuationTrialEnabled === true"
        :trial-policy="runtimeConfig.public.valuationTrialPolicy === 'pilot' ? 'pilot' : 'demo'"
      />
    </div>
  </ValuationShell>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Brand, ConditionRating } from '~/api/valuation'
import { useValuationApi } from '~/composables/useValuationApi'

const api = useValuationApi()
const runtimeConfig = useRuntimeConfig()
const { data: dictionaries, error: dictionaryError } = await useAsyncData(
  'valuation-conversation-dictionaries',
  async () => {
    const [brands, provinces, conditionRatings] = await Promise.all([
      api.listBrands(),
      api.listProvinces(),
      api.listConditionRatings()
    ])
    return { brands, provinces, conditionRatings }
  },
  {
    default: () => ({
      brands: [] as Brand[],
      provinces: [] as string[],
      conditionRatings: [] as ConditionRating[]
    })
  }
)

const brands = computed(() => dictionaries.value?.brands ?? [])
const provinces = computed(() => dictionaries.value?.provinces ?? [])
const conditionRatings = computed(() => dictionaries.value?.conditionRatings ?? [])
</script>

<style scoped>
.valuation-stage {
  max-width: 760px;
  margin: 0 auto;
}
.notice {
  margin: 0 0 var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-warning-light);
  color: #92400e;
  font-size: var(--text-sm);
}
</style>
