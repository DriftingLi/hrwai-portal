<template>
  <ValuationShell
    :title="record ? `整机评估报告 #${record.id}` : '整机评估报告'"
    subtitle="报告由后端按评估时点的事实生成；下载为服务端流式转发，不经过浏览器内存拼装。"
    active="history"
  >
    <template v-if="record">
      <EvaluationResultCard :record="record" :show-detail-link="false" />

      <section class="detail-card">
        <h2 class="detail-title">评估输入参数</h2>
        <dl class="detail-grid">
          <div><dt>品牌</dt><dd>{{ record.brand }}</dd></div>
          <div><dt>车型</dt><dd>{{ record.vehicle_type }}</dd></div>
          <div><dt>系列</dt><dd>{{ record.series }}</dd></div>
          <div><dt>吨位</dt><dd>{{ formatTonnage(record.tonnage) }}</dd></div>
          <div><dt>配置类型</dt><dd>{{ record.config_type }}</dd></div>
          <div><dt>门架类型</dt><dd>{{ record.mast_type }}</dd></div>
          <div><dt>门架高度</dt><dd>{{ formatMastHeight(record.mast_height_mm) }}</dd></div>
          <div><dt>出厂年份</dt><dd>{{ record.factory_year }}</dd></div>
          <div><dt>成交年份</dt><dd>{{ record.sale_year }}</dd></div>
          <div><dt>累计使用小时</dt><dd>{{ formatInteger(record.usage_hours) }}</dd></div>
          <div><dt>原厂漆</dt><dd>{{ record.original_paint ? '是' : '否' }}</dd></div>
          <div><dt>区域</dt><dd>{{ record.province }}{{ record.city }}</dd></div>
          <div><dt>车牌 / 登记证 / 维保</dt>
            <dd>
              {{ record.has_license_plate ? '有' : '无' }} /
              {{ record.has_registration_certificate ? '有' : '无' }} /
              {{ record.has_maintenance_records ? '有' : '无' }}
            </dd>
          </div>
          <div><dt>车况评级</dt><dd>{{ record.condition_rating }} 级</dd></div>
          <div><dt>评估时间</dt><dd>{{ formatDate(record.created_at) }}</dd></div>
          <div><dt>记录编号</dt><dd>#{{ record.id }}</dd></div>
        </dl>
      </section>
    </template>

    <p v-else class="pending">正在前往登录页…</p>
  </ValuationShell>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'valuation-auth' })

import type { EvaluationRecord } from '~/api/valuation'
import { valuationErrorStatus } from '~/api/valuation'
import { useValuationApi } from '~/composables/useValuationApi'
import { formatDate } from '~/utils/formatDate'
import { formatInteger, formatMastHeight, formatTonnage } from '~/utils/valuationFormat'

const route = useRoute()
const api = useValuationApi()

const reportId = Number(route.params.id)
if (!Number.isInteger(reportId) || reportId <= 0) {
  throw createError({ statusCode: 404, statusMessage: '评估记录不存在' })
}

// 详情需要登录：服务端会话注入 Bearer，401 由下面统一回登录页
const { data: record, error } = await useAsyncData<EvaluationRecord>(
  `valuation-report-${reportId}`,
  () => api.getEvaluation(reportId)
)

const status = valuationErrorStatus(error.value)
if (status === 401) {
  await navigateTo({ path: '/valuation/login', query: { redirect: route.fullPath } })
} else if (status === 404) {
  throw createError({ statusCode: 404, statusMessage: '评估记录不存在' })
} else if (!record.value) {
  throw createError({ statusCode: 502, statusMessage: '评估记录暂时无法加载' })
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
.detail-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-4) var(--space-5);
  margin: 0;
}
.detail-grid div {
  min-width: 0;
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
.pending {
  color: var(--color-text-tertiary);
}
@media (max-width: 900px) {
  .detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 520px) {
  .detail-card {
    padding: var(--space-5);
  }
}
</style>
