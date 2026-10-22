<template>
  <ValuationShell
    title="电池健康度（RUL）评估"
    subtitle="粘贴至少 10 个完整充放电循环的电压/电流序列，由后端模型推算剩余寿命与健康度；同样支持匿名提交。"
    active="battery"
  >
    <BatteryForm @evaluated="handleEvaluated" />
    <BatteryResultCard v-if="result" :result="result" class="result-block" />
  </ValuationShell>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { CreateBatteryResponse } from '~/api/valuation'

const result = ref<CreateBatteryResponse | null>(null)

function handleEvaluated(next: CreateBatteryResponse) {
  result.value = next
}
</script>

<style scoped>
.result-block {
  margin-top: var(--space-8);
}
</style>
