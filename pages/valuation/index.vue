<template>
  <ValuationShell
    title="整机残值评估"
    subtitle="按品牌、年份、使用强度、区域与车况生成残值区间。无需登录即可提交；登录后这次评估会自动进入你的评估历史。"
    active="whole"
  >
    <div class="valuation-stage">
      <p v-if="dictionaryError" class="notice" role="status">
        字典数据暂时不可用（后端未连通），表单仍可填写，但级联选项会是空的。
      </p>

      <WholeMachineForm
        :brands="brands"
        :provinces="provinces"
        :condition-ratings="conditionRatings"
        @evaluated="handleEvaluated"
      />

      <EvaluationResultCard v-if="result" ref="resultRef" :record="result" class="result-block" />
    </div>
  </ValuationShell>
</template>

<script setup lang="ts">
// 整机评估页（票 #32 后续）：表单与结果都在这一屏——提交后不再跳页（旧 SPA 跳结果页是因为
// 结果只存在前端 store 里，刷新就丢；门户放在服务端会话里，同一份结果直接就地渲染更稳）。
import { computed, nextTick, ref } from 'vue'
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
const resultRef = ref<{ $el?: HTMLElement } | null>(null)

async function handleEvaluated(record: EvaluationRecord) {
  result.value = record
  // 表单很长，结果卡片在它下面：提交成功后把用户带到结果，而不是让人自己往下找
  await nextTick()
  resultRef.value?.$el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<style scoped>
/* 与旧 SPA 同一条尺度：表单卡片与结果卡片都在 760px 的居中列里 */
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
.result-block {
  display: block;
  margin-top: var(--space-8);
  scroll-margin-top: 96px;
}
</style>
