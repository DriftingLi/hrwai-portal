<template>
  <ValuationShell
    :title="record ? `电池评估报告 #${record.id}` : '电池评估报告'"
    subtitle="剩余寿命与健康度来自后端对循环数据的特征分析；PDF 报告由服务端流式转发下载。"
    active="history"
  >
    <template v-if="record">
      <BatteryResultCard :result="record" :show-detail-link="false" />

      <section class="detail-card">
        <h2 class="detail-title">评估明细</h2>
        <dl class="detail-grid">
          <div><dt>电池类型</dt><dd>{{ batteryTypeLabels[record.battery_type] || record.battery_type }}</dd></div>
          <div><dt>电池型号</dt><dd>{{ record.battery_model || '-' }}</dd></div>
          <div><dt>样本循环数</dt><dd>{{ formatInteger(record.cycle_count) }}</dd></div>
          <div><dt>剩余寿命</dt><dd>{{ formatInteger(record.rul_cycles) }} 次循环</dd></div>
          <div><dt>健康度 SOH</dt><dd>{{ formatPercent(record.soh_percent) }}</dd></div>
          <div><dt>置信区间</dt>
            <dd>{{ formatInteger(record.confidence_low) }} ~ {{ formatInteger(record.confidence_high) }} 次</dd>
          </div>
          <div><dt>置信度</dt><dd>{{ formatConfidence(record.confidence) }}</dd></div>
          <div><dt>评估时间</dt><dd>{{ formatDate(record.created_at) }}</dd></div>
        </dl>

        <template v-if="featureImportance.length > 0">
          <h3 class="detail-subtitle">特征重要性（前 10）</h3>
          <ul class="feature-list">
            <li v-for="feature in featureImportance" :key="feature.index" class="feature-item">
              <span class="feature-name">{{ feature.name }}</span>
              <span class="feature-track">
                <span class="feature-fill" :style="{ width: featureWidth(feature.normalized) }"></span>
              </span>
              <span class="feature-value">{{ formatConfidence(feature.normalized) }}</span>
            </li>
          </ul>
        </template>
      </section>
    </template>

    <p v-else class="pending">正在前往登录页…</p>
  </ValuationShell>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'valuation-auth' })

import { computed } from 'vue'
import type { BatteryRecord } from '~/api/valuation'
import { batteryTypeLabels, valuationErrorStatus } from '~/api/valuation'
import { useValuationApi } from '~/composables/useValuationApi'
import { formatDate } from '~/utils/formatDate'
import {
  formatConfidence,
  formatInteger,
  formatPercent
} from '~/utils/valuationFormat'

const route = useRoute()
const api = useValuationApi()

const reportId = Number(route.params.id)
if (!Number.isInteger(reportId) || reportId <= 0) {
  throw createError({ statusCode: 404, statusMessage: '电池评估记录不存在' })
}

const { data: record, error } = await useAsyncData<BatteryRecord>(
  `valuation-battery-report-${reportId}`,
  () => api.getBatteryEvaluation(reportId)
)

const status = valuationErrorStatus(error.value)
if (status === 401) {
  await navigateTo({ path: '/valuation/login', query: { redirect: route.fullPath } })
} else if (status === 404) {
  throw createError({ statusCode: 404, statusMessage: '电池评估记录不存在' })
} else if (!record.value) {
  throw createError({ statusCode: 502, statusMessage: '电池评估记录暂时无法加载' })
}

const featureImportance = computed(() => (record.value?.feature_importance ?? []).slice(0, 10))

function featureWidth(normalized: number): string {
  const clamped = Math.min(100, Math.max(0, Number.isFinite(normalized) ? normalized * 100 : 0))
  return `${clamped}%`
}
</script>

<style scoped>
.detail-card {
  margin-top: var(--space-6);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-8);
  box-shadow: var(--shadow-sm);
}
.detail-title {
  margin: 0 0 var(--space-5);
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  border-left: 3px solid var(--color-primary-500);
  padding-left: var(--space-3);
  line-height: 1.2;
}
.detail-subtitle {
  margin: var(--space-8) 0 var(--space-4);
  font-family: var(--font-display);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}
.detail-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-4) var(--space-5);
  margin: 0;
}
.detail-grid dt {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-1);
}
.detail-grid dd {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
}
.feature-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-2);
}
.feature-item {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr) 60px;
  align-items: center;
  gap: var(--space-3);
}
.feature-name {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.feature-track {
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-border-light);
  overflow: hidden;
}
.feature-fill {
  display: block;
  height: 100%;
  border-radius: var(--radius-full);
  background: var(--gradient-brand);
}
.feature-value {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  text-align: right;
}
.pending {
  color: var(--color-text-tertiary);
}
@media (max-width: 900px) {
  .detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .feature-item {
    grid-template-columns: 120px minmax(0, 1fr) 52px;
  }
}
@media (max-width: 520px) {
  .detail-card {
    padding: var(--space-5);
  }
}
</style>
