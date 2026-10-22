<template>
  <section class="result-card" aria-live="polite">
    <header class="result-head">
      <div>
        <p class="result-eyebrow">电池评估完成 · 记录 #{{ evaluationId }}</p>
        <h2 class="result-title">{{ batteryTypeLabels[result.battery_type] || result.battery_type }}</h2>
        <p v-if="model" class="result-meta">电池型号：{{ model }}</p>
      </div>
      <div class="result-value">
        <span class="value-label">剩余寿命 RUL</span>
        <strong class="value-number">{{ formatInteger(result.rul_cycles) }} 次循环</strong>
        <span class="value-range">
          置信区间 {{ formatInteger(result.confidence_low) }} ~ {{ formatInteger(result.confidence_high) }} 次
        </span>
      </div>
    </header>

    <dl class="metric-grid">
      <div class="metric">
        <dt>健康度 SOH</dt>
        <dd>{{ formatPercent(result.soh_percent) }}</dd>
      </div>
      <div class="metric">
        <dt>置信度</dt>
        <dd>{{ formatConfidence(result.confidence) }}</dd>
      </div>
      <div class="metric">
        <dt>样本循环数</dt>
        <dd>{{ formatInteger(result.cycle_count) }}</dd>
      </div>
    </dl>

    <div v-if="suggestions.length > 0" class="result-block">
      <h3 class="block-title">评估建议</h3>
      <ul class="suggestion-list">
        <li v-for="(suggestion, index) in suggestions" :key="index">{{ suggestion }}</li>
      </ul>
    </div>

    <footer class="result-actions">
      <a :href="batteryReportPath(evaluationId)" class="btn-ghost" target="_blank" rel="noopener">
        下载 PDF 报告
      </a>
      <NuxtLink
        v-if="showDetailLink"
        :to="`/valuation/battery/report/${evaluationId}`"
        class="btn-primary"
      >
        查看完整报告
      </NuxtLink>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BatteryRecord, CreateBatteryResponse } from '~/api/valuation'
import { batteryReportPath, batteryTypeLabels } from '~/api/valuation'
import { formatConfidence, formatInteger, formatPercent } from '~/utils/valuationFormat'

const props = withDefaults(
  defineProps<{ result: CreateBatteryResponse | BatteryRecord; showDetailLink?: boolean }>(),
  { showDetailLink: true }
)

/** 创建响应用 evaluation_id，详情用 id —— 展示层收口成同一个编号 */
const evaluationId = computed(() =>
  'evaluation_id' in props.result ? props.result.evaluation_id : props.result.id
)
const suggestions = computed(() => props.result.suggestions ?? [])
const model = computed(() => ('battery_model' in props.result ? props.result.battery_model : ''))
</script>

<style scoped>
.result-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-8);
  box-shadow: var(--shadow-md);
}
.result-head {
  display: flex;
  justify-content: space-between;
  gap: var(--space-6);
  flex-wrap: wrap;
  padding-bottom: var(--space-6);
  border-bottom: 1px solid var(--color-border-light);
}
.result-eyebrow {
  margin: 0 0 var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-primary-600);
}
.result-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
}
.result-meta {
  margin: var(--space-2) 0 0;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}
.result-value {
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.value-label {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}
.value-number {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  background: var(--gradient-brand);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  line-height: 1.1;
}
.value-range {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
  margin: var(--space-6) 0 0;
}
.metric {
  background: var(--color-bg-page);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
}
.metric dt {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-1);
}
.metric dd {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}
.result-block {
  margin-top: var(--space-8);
}
.block-title {
  margin: 0 0 var(--space-3);
  font-family: var(--font-display);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}
.suggestion-list {
  margin: 0;
  padding-left: var(--space-5);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
}
.suggestion-list li + li {
  margin-top: var(--space-2);
}
.result-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-top: var(--space-8);
  padding-top: var(--space-6);
  border-top: 1px solid var(--color-border-light);
}
.btn-primary,
.btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 12px 28px;
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  text-decoration: none;
  transition: opacity var(--duration-fast), background var(--duration-fast);
}
.btn-primary {
  background: var(--gradient-brand);
  color: #fff;
}
.btn-primary:hover {
  opacity: 0.92;
}
.btn-ghost {
  border: 1px solid var(--color-border-dark);
  color: var(--color-text-secondary);
  background: #fff;
}
.btn-ghost:hover {
  border-color: var(--color-primary-400);
  color: var(--color-primary-600);
}
@media (max-width: 900px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .result-value {
    text-align: left;
  }
}
@media (max-width: 560px) {
  .result-card {
    padding: var(--space-5);
  }
}
</style>
