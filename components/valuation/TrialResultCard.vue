<template>
  <section v-if="result.status === 'priced'" class="trial-card" data-test="trial-card" :data-status="result.status" :data-stale="stale ? 'true' : 'false'" :data-request-id="requestId" aria-live="polite">
    <p v-if="stale" class="trial-stale" role="status">草稿已修改：这张卡保留的是修改前的试算快照，请确认后主动重算。</p>
    <header class="trial-head">
      <div>
        <p class="trial-eyebrow">参考试算 · 目录与情景参考</p>
        <h2 class="trial-title">{{ vehicleTitle }}</h2>
        <p class="trial-note">这不是正式评估记录；区间反映目录候选与所采用假设的差异。</p>
      </div>
      <div class="trial-value">
        <span class="value-label">参考残值区间</span>
        <strong class="value-number">{{ intervalText }}</strong>
        <span class="value-range">区间宽度 {{ formatWanCurrency(result.interval.width) }}</span>
      </div>
    </header>

    <dl class="trial-metrics">
      <div class="trial-metric trial-metric-wide">
        <dt>候选原价范围</dt>
        <dd>{{ candidateRangeText || '无可用候选' }}</dd>
      </div>
      <div v-for="item in inputItems" :key="item.label" class="trial-metric">
        <dt>{{ item.label }}</dt>
        <dd>{{ item.value }}</dd>
      </div>
    </dl>

    <div v-if="result.candidates.length" class="trial-block">
      <h3 class="block-title">目录候选</h3>
      <ul class="candidate-list">
        <li v-for="item in result.candidates" :key="item.id" class="candidate-item">
          <span>{{ candidateSummary(item) }}</span>
          <strong>{{ formatWanCurrency(item.original_price) }}</strong>
        </li>
      </ul>
    </div>

    <div class="trial-block">
      <h3 class="block-title">采用的假设</h3>
      <ul class="trial-list">
        <li v-for="assumption in result.assumptions" :key="assumption">{{ assumption }}</li>
      </ul>
    </div>

    <div v-if="result.missing_fields.length" class="trial-block trial-followup">
      <h3 class="block-title">最有助于缩小范围的待补项</h3>
      <ul class="trial-list">
        <li v-for="item in result.missing_fields" :key="item">{{ missingFieldLabel(item) }}</li>
      </ul>
    </div>

    <footer class="trial-versions" aria-label="试算版本">
      <span>公式 {{ result.snapshot.formula_version }}</span>
      <span>快照 {{ result.snapshot.sha7 }}</span>
      <span>策略 {{ result.snapshot.policy }} · {{ result.snapshot.policy_version }}</span>
    </footer>
  </section>

  <section v-else-if="result.status === 'needs_info'" class="trial-card trial-card-notice" data-test="trial-card" :data-status="result.status" :data-stale="stale ? 'true' : 'false'" :data-request-id="requestId" aria-live="polite">
    <p v-if="stale" class="trial-stale" role="status">草稿已修改：这张卡保留的是修改前的试算快照，请确认后主动重算。</p>
    <p class="trial-eyebrow">参考试算 · 待补资料</p>
    <h2 class="trial-title">暂不给价</h2>
    <p class="trial-note">{{ result.message || '当前草稿还不足以给出有依据的参考区间。' }}</p>
    <div v-if="result.missing_fields.length" class="trial-block trial-followup">
      <h3 class="block-title">优先补充这些信息</h3>
      <ul class="trial-list">
        <li v-for="item in result.missing_fields" :key="item">{{ missingFieldLabel(item) }}</li>
      </ul>
    </div>
  </section>

  <section v-else class="trial-card trial-card-notice" data-test="trial-card" data-status="disabled" :data-stale="stale ? 'true' : 'false'" :data-request-id="requestId" aria-live="polite">
    <p v-if="stale" class="trial-stale" role="status">草稿已修改：这张卡保留的是修改前的试算快照，请确认后主动重算。</p>
    <p class="trial-eyebrow">参考试算 · 关闭策略</p>
    <h2 class="trial-title">参考试算暂未开放</h2>
    <p class="trial-note">{{ result.message || '参考试算仍在验证，请稍后再试。' }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TrialCandidate, TrialResult } from '~/api/valuation'
import { formatInteger, formatTonnage, formatWan, formatWanCurrency } from '~/utils/valuationFormat'

const props = withDefaults(
  defineProps<{ result: TrialResult; stale?: boolean; requestId?: string }>(),
  { stale: false, requestId: '' }
)

const FIELD_LABELS: Record<string, string> = {
  brand: '品牌',
  vehicle_type: '车辆类型',
  series: '系列',
  tonnage: '吨位',
  config_type: '配置类型',
  mast_type: '门架类型',
  mast_height_mm: '门架高度',
  factory_year: '出厂年份',
  factory_year_min: '出厂年份下限',
  factory_year_max: '出厂年份上限',
  sale_year: '估价年份',
  usage_hours: '累计工时',
  province: '省份',
  city: '城市',
  condition_rating: '车况评级',
  original_paint: '原厂原漆',
  has_license_plate: '车牌',
  has_registration_certificate: '登记证',
  has_maintenance_records: '保养记录'
}

const MISSING_FIELD_LABELS: Record<string, string> = {
  brand: '品牌',
  vehicle_type: '车辆类型',
  tonnage: '吨位',
  factory_year_or_range: '出厂年份或年份范围',
  factory_year: '出厂年份',
  factory_year_range: '出厂年份范围',
  original_price: '可核对的原价目录',
  series: '系列',
  config_type: '配置类型',
  mast_type: '门架类型',
  mast_height_mm: '门架高度',
  usage_hours: '累计工时',
  condition_rating: '车况评级',
  has_registration_certificate: '特种设备登记证',
  has_license_plate: '车牌',
  province_or_city: '所在省市'
}

function missingFieldLabel(field: string): string {
  return MISSING_FIELD_LABELS[field] || field
}

const vehicleTitle = computed(() => {
  if (props.result.status !== 'priced') return ''
  const input = props.result.input
  return [input.brand, input.vehicle_type, input.series].filter(Boolean).join(' ') || '车辆参考试算'
})

const inputItems = computed(() => {
  if (props.result.status !== 'priced') return []
  const items: Array<{ label: string; value: string }> = []
  for (const [key, value] of Object.entries(props.result.input)) {
    const label = FIELD_LABELS[key]
    if (!label || value === undefined || value === null || value === '') continue
    let text = String(value)
    if (typeof value === 'boolean') text = value ? '是' : '否'
    else if (key === 'usage_hours' && typeof value === 'number') text = `${formatInteger(value)} 小时`
    else if (key === 'tonnage' && typeof value === 'number') text = formatTonnage(value)
    else if ((key === 'factory_year' || key === 'sale_year') && typeof value === 'number') text = `${value} 年`
    else if (key === 'condition_rating') text = `${value} 级`
    items.push({ label, value: text })
  }
  return items
})

function amountRangeText(min: number, max: number): string {
  return `¥${formatWan(min)} ~ ¥${formatWan(max)} 万`
}

const intervalText = computed(() =>
  props.result.status === 'priced' ? amountRangeText(props.result.interval.min, props.result.interval.max) : ''
)

const candidateRangeText = computed(() => {
  if (props.result.status !== 'priced' || props.result.candidates.length === 0) return ''
  const prices = props.result.candidates.map((item) => item.original_price)
  return amountRangeText(Math.min(...prices), Math.max(...prices))
})

function candidateSummary(candidate: TrialCandidate): string {
  const mastHeight = candidate.mast_height_mm > 0 ? ` · ${candidate.mast_height_mm} mm` : ''
  return `${candidate.series} · ${candidate.config_type} · ${candidate.mast_type}${mastHeight}`
}
</script>

<style scoped>
.trial-card {
  min-width: 0;
  padding: var(--space-8);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
}
.trial-stale {
  margin: 0 0 var(--space-4);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-warning);
  border-radius: var(--radius-md);
  background: var(--color-warning-light);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
}
.trial-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: var(--space-6);
  padding-bottom: var(--space-6);
  border-bottom: 1px solid var(--color-border-light);
}
.trial-eyebrow {
  margin: 0 0 var(--space-2);
  color: var(--color-primary-600);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
}
.trial-title {
  margin: 0;
  color: var(--color-text-primary);
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
  overflow-wrap: anywhere;
}
.trial-note {
  max-width: 480px;
  margin: var(--space-3) 0 0;
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
}
.trial-value {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: var(--space-1);
  text-align: right;
}
.value-label,
.value-range {
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
}
.value-number {
  color: var(--color-primary-700);
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  line-height: 1.15;
  overflow-wrap: anywhere;
}
.trial-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
  margin: var(--space-6) 0 0;
}
.trial-metric {
  min-width: 0;
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-page);
  border-radius: var(--radius-md);
}
.trial-metric-wide {
  grid-column: span 3;
}
.trial-metric dt {
  margin-bottom: var(--space-1);
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
}
.trial-metric dd {
  margin: 0;
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  overflow-wrap: anywhere;
}
.candidate-list {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}
.candidate-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-4);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  overflow-wrap: anywhere;
}
.candidate-item strong {
  flex: 0 0 auto;
  color: var(--color-text-primary);
  font-family: var(--font-mono);
}
.trial-block {
  margin-top: var(--space-6);
}
.block-title {
  margin: 0 0 var(--space-3);
  color: var(--color-text-primary);
  font-family: var(--font-display);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
}
.trial-list {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding-left: var(--space-5);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  overflow-wrap: anywhere;
}
.trial-followup {
  padding: var(--space-4);
  background: var(--color-primary-50);
  border-radius: var(--radius-md);
}
.trial-versions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-4);
  margin-top: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border-light);
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  overflow-wrap: anywhere;
}
@media (max-width: 560px) {
  .trial-card {
    padding: var(--space-5);
  }
  .trial-value {
    text-align: left;
  }
  .value-number {
    font-size: var(--text-2xl);
  }
  .trial-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .trial-metric-wide {
    grid-column: span 2;
  }
}
</style>
