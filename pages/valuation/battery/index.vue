<template>
  <ValuationShell
    title="电池健康度（RUL）评估"
    subtitle="粘贴至少 10 个完整充放电循环的电压/电流序列，由后端模型推算剩余寿命与健康度；同样支持匿名提交。"
    active="battery"
  >
    <div class="valuation-stage">
      <BatteryForm @evaluated="handleEvaluated" />
      <BatteryResultCard v-if="result" ref="resultRef" :result="result" class="result-block" />
    </div>
  </ValuationShell>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import type { CreateBatteryResponse } from '~/api/valuation'

const result = ref<CreateBatteryResponse | null>(null)
const resultRef = ref<{ $el?: HTMLElement } | null>(null)

async function handleEvaluated(next: CreateBatteryResponse) {
  result.value = next
  await nextTick()
  resultRef.value?.$el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<style scoped>
.valuation-stage {
  max-width: 760px;
  margin: 0 auto;
}
.result-block {
  display: block;
  margin-top: var(--space-8);
  scroll-margin-top: 96px;
}
</style>
