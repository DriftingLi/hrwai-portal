<template>
  <section class="conversation-stream" aria-label="估值对话">
    <div v-for="entry in entries" :key="entry.id">
      <article v-if="entry.kind === 'message'" class="message" :class="entry.role">
        <span class="message-author">{{ entry.role === 'user' ? '你' : '估值助手' }}</span>
        <p>{{ entry.text }}</p>
      </article>
      <div v-else class="inline-result">
        <p class="result-caption">
          正式评估 · 采用确认时输入
          <span :data-test="`result-snapshot-${entry.record.id}`">
            {{ entry.snapshot.brand }} {{ entry.snapshot.tonnage }} 吨 · {{ entry.snapshot.usage_hours }} 小时
          </span>
        </p>
        <EvaluationResultCard :record="entry.record" />
      </div>
    </div>
    <p v-if="loadError" class="notice error-notice" role="alert">{{ loadError }}</p>
    <p v-if="expiredNotice" class="notice" role="status">草稿已闲置 30 分钟并过期。可重新填写，历史结果仍保留在当前页面。</p>
  </section>
</template>

<script setup lang="ts">
import type { EvaluationRecord, EvaluationRequest } from '~/api/valuation'

export interface ConversationMessageEntry {
  id: number
  kind: 'message'
  role: 'assistant' | 'user'
  text: string
}
export interface ConversationResultEntry {
  id: number
  kind: 'result'
  record: EvaluationRecord
  snapshot: EvaluationRequest
}
export type ConversationTimelineEntry = ConversationMessageEntry | ConversationResultEntry

defineProps<{
  entries: ConversationTimelineEntry[]
  loadError: string
  expiredNotice: boolean
}>()
</script>
