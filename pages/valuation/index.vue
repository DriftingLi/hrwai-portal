<template>
  <ValuationShell
    title="整机残值评估"
    subtitle="按品牌、年份、使用强度、区域与车况生成残值区间。无需登录即可提交；登录后这次评估会自动进入你的评估历史。"
    active="whole"
  >
    <p v-if="dictionaryError" class="notice" role="status">
      字典数据暂时不可用（后端未连通），表单仍可填写，但级联选项会是空的。
    </p>

    <WholeMachineForm
      :brands="brands"
      :provinces="provinces"
      :condition-ratings="conditionRatings"
      @evaluated="handleEvaluated"
    />

    <EvaluationResultCard v-if="result" :record="result" class="result-block" />
  </ValuationShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Brand, ConditionRating, EvaluationRecord } from '~/api/valuation'
import { useValuationApi } from '~/composables/useValuationApi'

const api = useValuationApi()

// 字典是公开接口：SSR 预取，页面首屏就能直接选（不需要登录，也不进搜索索引）
const { data: dictionaries, error: dictionaryError } = await useAsyncData(
  'valuation-dictionaries',
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

const result = ref<EvaluationRecord | null>(null)

function handleEvaluated(record: EvaluationRecord) {
  result.value = record
}
</script>

<style scoped>
.notice {
  margin: 0 0 var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-warning-light);
  color: #92400e;
  font-size: var(--text-sm);
}
.result-block {
  margin-top: var(--space-8);
}
</style>
