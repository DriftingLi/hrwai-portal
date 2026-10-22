<template>
  <section class="result-card" aria-live="polite">
    <header class="result-head">
      <div class="result-identity">
        <p class="result-eyebrow">评估完成 · 记录 #{{ record.id }}</p>
        <h2 class="result-title">{{ record.brand }} {{ record.vehicle_type }} · {{ record.series }}</h2>
        <p class="result-meta">
          {{ formatTonnage(record.tonnage) }} · {{ record.condition_rating }} 级车况 ·
          {{ record.province }}{{ record.city }} · {{ record.factory_year }} 年出厂
        </p>
      </div>
      <div class="result-value">
        <span class="value-label">预估残值</span>
        <strong class="value-number">{{ formatWanCurrency(record.estimated_value) }}</strong>
        <span class="value-range">
          区间 {{ formatWan(record.confidence_low) }} ~ {{ formatWan(record.confidence_high) }} 万元
        </span>
      </div>
    </header>

    <dl class="metric-grid">
      <div class="metric">
        <dt>基准原价</dt>
        <dd>{{ formatWanCurrency(record.original_price) }}</dd>
      </div>
      <div class="metric">
        <dt>残值率</dt>
        <dd>{{ formatPercent(residualRate(record.estimated_value, record.original_price)) }}</dd>
      </div>
      <div class="metric">
        <dt>时间系数 Kt</dt>
        <dd>{{ formatCoefficient(record.k_time_adjusted) }}</dd>
      </div>
      <div class="metric">
        <dt>使用强度 Kh</dt>
        <dd>{{ formatCoefficient(record.k_hours) }}</dd>
      </div>
      <div class="metric">
        <dt>品牌系数 Kb</dt>
        <dd>{{ formatCoefficient(record.k_brand) }}</dd>
      </div>
      <div class="metric">
        <dt>车况系数 Kc</dt>
        <dd>{{ formatCoefficient(record.k_condition) }}</dd>
      </div>
      <div class="metric">
        <dt>市场系数 Km</dt>
        <dd>{{ formatCoefficient(record.k_market) }}</dd>
      </div>
      <div class="metric">
        <dt>使用小时</dt>
        <dd>{{ formatInteger(record.usage_hours) }}</dd>
      </div>
    </dl>

    <div v-if="record.dimension_scores.length > 0" class="result-block">
      <h3 class="block-title">维度评分</h3>
      <ul class="dimension-list">
        <li v-for="dimension in record.dimension_scores" :key="dimension.label" class="dimension-item">
          <span class="dimension-label">{{ dimension.label }}</span>
          <span class="dimension-track">
            <span class="dimension-fill" :style="{ width: barWidth(dimension.value) }"></span>
          </span>
          <span class="dimension-value">{{ Math.round(dimension.value) }}</span>
        </li>
      </ul>
    </div>

    <div v-if="record.suggestions.length > 0" class="result-block">
      <h3 class="block-title">评估建议</h3>
      <ul class="suggestion-list">
        <li v-for="(suggestion, index) in record.suggestions" :key="index">{{ suggestion }}</li>
      </ul>
    </div>

    <footer class="result-actions">
      <a :href="evaluationReportPath(record.id)" class="btn-ghost" target="_blank" rel="noopener">
        下载 PDF 报告
      </a>
      <NuxtLink v-if="showDetailLink" :to="`/valuation/report/${record.id}`" class="btn-primary">
        查看完整报告
      </NuxtLink>
    </footer>
  </section>
</template>

<script setup lang="ts">
import type { EvaluationRecord } from '~/api/valuation'
import { evaluationReportPath } from '~/api/valuation'
import {
  formatCoefficient,
  formatInteger,
  formatPercent,
  formatTonnage,
  formatWan,
  formatWanCurrency,
  residualRate
} from '~/utils/valuationFormat'

withDefaults(defineProps<{ record: EvaluationRecord; showDetailLink?: boolean }>(), {
  showDetailLink: true
})

/** 维度分 0-100（后端口径）；越界值夹到 0-100，避免进度条溢出 */
function barWidth(value: number): string {
  const clamped = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0))
  return `${clamped}%`
}
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
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
.dimension-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-2);
}
.dimension-item {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr) 40px;
  align-items: center;
  gap: var(--space-3);
}
.dimension-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}
.dimension-track {
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-border-light);
  overflow: hidden;
}
.dimension-fill {
  display: block;
  height: 100%;
  border-radius: var(--radius-full);
  background: var(--gradient-brand);
}
.dimension-value {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  text-align: right;
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
