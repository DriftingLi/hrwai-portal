<template>
  <ValuationShell
    title="评估历史"
    subtitle="这里只显示当前账号的评估记录；打开任一记录可查看完整报告并下载 PDF。"
    active="history"
  >
    <!-- 类型切换：整机 / 电池 -->
    <nav class="tabs" aria-label="评估类型">
      <NuxtLink
        :to="{ path: '/valuation/history', query: wholeTabQuery }"
        class="tab"
        :class="{ active: listType === 'whole' }"
      >
        整机残值评估
      </NuxtLink>
      <NuxtLink
        :to="{ path: '/valuation/history', query: batteryTabQuery }"
        class="tab"
        :class="{ active: listType === 'battery' }"
      >
        电池 RUL 评估
      </NuxtLink>
    </nav>

    <!-- 筛选 -->
    <form class="filter-bar" @submit.prevent="applyFilters">
      <template v-if="listType === 'whole'">
        <label class="filter-field">
          <span>品牌</span>
          <input v-model="filterForm.brand" class="filter-input" type="text" placeholder="如 合力" />
        </label>
        <label class="filter-field">
          <span>车型</span>
          <input v-model="filterForm.vehicle_type" class="filter-input" type="text" placeholder="如 电动平衡重" />
        </label>
      </template>
      <label v-else class="filter-field">
        <span>电池类型</span>
        <select v-model="filterForm.battery_type" class="filter-input">
          <option value="">全部</option>
          <option v-for="option in batteryTypeOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>
      <button type="submit" class="btn-filter">查询</button>
      <NuxtLink to="/valuation" class="btn-reset">去评估</NuxtLink>
    </form>

    <p v-if="loadError" class="notice" role="alert" data-test="history-error">{{ loadError }}</p>

    <section v-else class="table-card">
      <table v-if="listType === 'whole' && wholeRows.length > 0" class="data-table">
        <thead>
          <tr>
            <th>编号</th>
            <th>品牌</th>
            <th>车型</th>
            <th>系列</th>
            <th class="align-right">吨位</th>
            <th>车况</th>
            <th class="align-right">残值（万元）</th>
            <th class="align-right">残值率</th>
            <th>评估时间</th>
            <th>报告</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in wholeRows" :key="row.id">
            <td class="mono">#{{ row.id }}</td>
            <td>{{ row.brand }}</td>
            <td>{{ row.vehicle_type }}</td>
            <td>{{ row.series }}</td>
            <td class="align-right mono">{{ formatTonnage(row.tonnage) }}</td>
            <td>{{ row.condition_rating }}</td>
            <td class="align-right mono strong">{{ formatWan(row.estimated_value) }}</td>
            <td class="align-right mono">
              {{ formatPercent(residualRate(row.estimated_value, row.original_price)) }}
            </td>
            <td class="muted">{{ formatDate(row.created_at) }}</td>
            <td>
              <NuxtLink :to="`/valuation/report/${row.id}`" class="link">查看</NuxtLink>
              <a :href="evaluationReportPath(row.id)" class="link" target="_blank" rel="noopener">PDF</a>
            </td>
          </tr>
        </tbody>
      </table>

      <table v-else-if="listType === 'battery' && batteryRows.length > 0" class="data-table">
        <thead>
          <tr>
            <th>编号</th>
            <th>电池类型</th>
            <th>型号</th>
            <th class="align-right">循环数</th>
            <th class="align-right">RUL（次）</th>
            <th class="align-right">SOH</th>
            <th>评估时间</th>
            <th>报告</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in batteryRows" :key="row.id">
            <td class="mono">#{{ row.id }}</td>
            <td>{{ batteryTypeLabels[row.battery_type] || row.battery_type }}</td>
            <td>{{ row.battery_model || '-' }}</td>
            <td class="align-right mono">{{ formatInteger(row.cycle_count) }}</td>
            <td class="align-right mono strong">{{ formatInteger(row.rul_cycles) }}</td>
            <td class="align-right mono">{{ formatPercent(row.soh_percent) }}</td>
            <td class="muted">{{ formatDate(row.created_at) }}</td>
            <td>
              <NuxtLink :to="`/valuation/battery/report/${row.id}`" class="link">查看</NuxtLink>
              <a :href="batteryReportPath(row.id)" class="link" target="_blank" rel="noopener">PDF</a>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="empty-state">
        <p class="empty-title">还没有{{ listType === 'battery' ? '电池' : '整机' }}评估记录</p>
        <p class="empty-hint">去提交一次评估，记录会自动归到当前账号。</p>
        <NuxtLink :to="listType === 'battery' ? '/valuation/battery' : '/valuation'" class="btn-filter">
          开始评估
        </NuxtLink>
      </div>

      <div v-if="totalPages > 1" class="pager">
        <NuxtLink v-if="page > 1" :to="pageLink(page - 1)" class="pager-link">上一页</NuxtLink>
        <span class="pager-status">第 {{ page }} / {{ totalPages }} 页 · 共 {{ total }} 条</span>
        <NuxtLink v-if="page < totalPages" :to="pageLink(page + 1)" class="pager-link">下一页</NuxtLink>
      </div>
    </section>
  </ValuationShell>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'valuation-auth' })

import { computed, reactive } from 'vue'
import type { BatterySummary, EvaluationRecord } from '~/api/valuation'
import {
  batteryReportPath,
  batteryTypeLabels,
  evaluationReportPath,
  valuationErrorStatus
} from '~/api/valuation'
import { useValuationApi } from '~/composables/useValuationApi'
import { formatDate } from '~/utils/formatDate'
import {
  formatInteger,
  formatPercent,
  formatTonnage,
  formatWan,
  residualRate
} from '~/utils/valuationFormat'

const PAGE_SIZE = 10

const route = useRoute()
const api = useValuationApi()

const batteryTypeOptions = [
  { value: 'lfp', label: '磷酸铁锂（LFP）' },
  { value: 'ncm', label: '三元锂（NCM）' },
  { value: 'other', label: '其他' }
] as const

function queryText(key: string): string {
  const value = route.query[key]
  return typeof value === 'string' ? value : ''
}

const listType = computed<'whole' | 'battery'>(() => (queryText('type') === 'battery' ? 'battery' : 'whole'))
const page = computed(() => {
  const value = Number(queryText('page'))
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1
})
const brandFilter = computed(() => (listType.value === 'whole' ? queryText('brand') : ''))
const vehicleTypeFilter = computed(() => (listType.value === 'whole' ? queryText('vehicle_type') : ''))
const batteryTypeFilter = computed(() => (listType.value === 'battery' ? queryText('battery_type') : ''))

const filterForm = reactive({
  brand: brandFilter.value,
  vehicle_type: vehicleTypeFilter.value,
  battery_type: batteryTypeFilter.value
})

const { data: history, error: historyError } = await useAsyncData(
  () =>
    `valuation-history-${listType.value}-${page.value}-${brandFilter.value}-${vehicleTypeFilter.value}-${batteryTypeFilter.value}`,
  async () => {
    if (listType.value === 'battery') {
      const result = await api.listBatteryEvaluations({
        page: page.value,
        page_size: PAGE_SIZE,
        battery_type: batteryTypeFilter.value || undefined
      })
      return { kind: 'battery' as const, total: result.total, items: result.items }
    }
    const result = await api.listEvaluations({
      page: page.value,
      page_size: PAGE_SIZE,
      brand: brandFilter.value || undefined,
      vehicle_type: vehicleTypeFilter.value || undefined
    })
    return { kind: 'whole' as const, total: result.total, items: result.list }
  }
)

// 未登录 / 令牌过期：回登录页并把当前地址带上，登录后回到同一页
const status = valuationErrorStatus(historyError.value)
if (status === 401) {
  await navigateTo({ path: '/valuation/login', query: { redirect: route.fullPath } })
}

const wholeRows = computed<EvaluationRecord[]>(() =>
  history.value?.kind === 'whole' ? history.value.items : []
)
const batteryRows = computed<BatterySummary[]>(() =>
  history.value?.kind === 'battery' ? history.value.items : []
)
const total = computed(() => history.value?.total ?? 0)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

const loadError = computed(() => {
  if (!historyError.value) return ''
  const code = valuationErrorStatus(historyError.value)
  if (code === 401) return '登录已过期，正在前往登录页…'
  return '评估历史暂时加载失败，请稍后重试。'
})

function queryFor(nextPage: number): Record<string, string> {
  const query: Record<string, string> = { type: listType.value }
  if (nextPage > 1) query.page = String(nextPage)
  if (listType.value === 'whole') {
    if (brandFilter.value) query.brand = brandFilter.value
    if (vehicleTypeFilter.value) query.vehicle_type = vehicleTypeFilter.value
  } else if (batteryTypeFilter.value) {
    query.battery_type = batteryTypeFilter.value
  }
  return query
}

const wholeTabQuery = computed(() => {
  const query: Record<string, string> = {}
  if (brandFilter.value) query.brand = brandFilter.value
  if (vehicleTypeFilter.value) query.vehicle_type = vehicleTypeFilter.value
  return query
})
const batteryTabQuery = computed(() => {
  const query: Record<string, string> = { type: 'battery' }
  if (batteryTypeFilter.value) query.battery_type = batteryTypeFilter.value
  return query
})

function pageLink(target: number) {
  return { path: '/valuation/history', query: queryFor(target) }
}

async function applyFilters() {
  await navigateTo({ path: '/valuation/history', query: queryFor(1) })
}
</script>

<style scoped>
.tabs {
  display: inline-flex;
  gap: var(--space-1);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  padding: var(--space-1);
  margin-bottom: var(--space-4);
}
.tab {
  padding: 8px 18px;
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
  font-weight: var(--font-medium);
}
.tab.active {
  background: var(--gradient-brand);
  color: #fff;
}
.filter-bar {
  display: flex;
  align-items: flex-end;
  gap: var(--space-3);
  flex-wrap: wrap;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4) var(--space-5);
  margin-bottom: var(--space-4);
}
.filter-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}
.filter-input {
  min-width: 180px;
  min-height: 40px;
  padding: 8px 12px;
  border: 1px solid var(--color-border-dark);
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: var(--text-base);
  background: #fff;
}
.filter-input:focus {
  outline: none;
  border-color: var(--color-primary-400);
}
.btn-filter,
.btn-reset {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 8px 22px;
  border-radius: var(--radius-md);
  border: none;
  background: var(--gradient-brand);
  color: #fff;
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  text-decoration: none;
  cursor: pointer;
}
.btn-reset {
  background: #fff;
  border: 1px solid var(--color-border-dark);
  color: var(--color-text-secondary);
}
.notice {
  padding: var(--space-4) var(--space-5);
  border-radius: var(--radius-lg);
  background: var(--color-danger-light);
  color: #991b1b;
  font-size: var(--text-sm);
}
.table-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4) var(--space-5) var(--space-5);
  overflow-x: auto;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}
.data-table th {
  text-align: left;
  padding: 12px;
  color: var(--color-text-tertiary);
  font-weight: var(--font-medium);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}
.data-table td {
  padding: 14px 12px;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border-light);
  white-space: nowrap;
}
.align-right {
  text-align: right;
}
.mono {
  font-family: var(--font-mono);
}
.strong {
  color: var(--color-text-primary);
  font-weight: var(--font-semibold);
}
.muted {
  color: var(--color-text-tertiary);
}
.link {
  color: var(--color-primary-600);
  text-decoration: none;
  margin-right: var(--space-3);
}
.link:hover {
  text-decoration: underline;
}
.empty-state {
  text-align: center;
  padding: var(--space-12) var(--space-4);
}
.empty-title {
  margin: 0 0 var(--space-2);
  font-size: var(--text-lg);
  color: var(--color-text-primary);
  font-weight: var(--font-semibold);
}
.empty-hint {
  margin: 0 0 var(--space-5);
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}
.pager {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-4);
  margin-top: var(--space-4);
  font-size: var(--text-sm);
}
.pager-link {
  color: var(--color-primary-600);
  text-decoration: none;
}
.pager-status {
  color: var(--color-text-tertiary);
}
@media (max-width: 640px) {
  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }
  .filter-input {
    width: 100%;
    min-width: 0;
  }
}
</style>
