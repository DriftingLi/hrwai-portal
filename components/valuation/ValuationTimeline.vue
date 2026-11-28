<template>
  <section class="conversation-stream" aria-label="估值对话">
    <div v-for="entry in entries" :key="entry.id">
      <article v-if="entry.kind === 'message'" class="message" :class="entry.role">
        <span class="message-author">{{ entry.role === 'user' ? '你' : '估值助手' }}</span>
        <p>{{ entry.text }}</p>
      </article>
      <div v-else-if="entry.kind === 'explanation'" class="inline-result explanation-result" :data-state="entry.answer.state">
        <article class="message assistant explanation-entry" data-test="explanation-entry" :data-state="entry.answer.state">
          <span class="message-author">估值助手 · {{ entry.answer.cardLabel }}</span>
          <p class="explanation-question">你的问题：{{ entry.answer.question }}</p>
          <p data-test="explanation-answer">{{ entry.answer.message }}</p>
          <p class="explanation-meta" data-test="explanation-meta" :data-failure-kind="entry.answer.failureKind ?? ''">
            {{ entry.answer.state === 'failure' ? '固定说明' : '依据已校验' }}
            <span v-if="entry.answer.evidenceIds.length"> · {{ entry.answer.evidenceIds.length }} 条证据</span>
            <span v-if="entry.answer.degraded"> · 降级</span>
          </p>
          <button
            v-if="entry.answer.action === 'recalculate'"
            type="button"
            class="primary-button"
            :data-test="entry.answer.card.kind === 'formal' ? 'recalculate-formal' : 'recalculate-trial-from-explanation'"
            @click="emit('recalculate', entry.answer.card)"
          >
            {{ entry.answer.card.kind === 'formal' ? '按当前草稿重新评估' : '按当前草稿重新试算' }}
          </button>
          <p v-if="entry.answer.action === 'recalculate'" class="explanation-meta">由你触发重算；旧卡及其解释保持不变。</p>
        </article>
      </div>
      <div v-else class="inline-result" :data-selected="entrySelected(entry) ? 'true' : 'false'">
        <p class="result-caption">
          正式评估 · 采用确认时输入
          <span :data-test="`result-snapshot-${entry.record.id}`">
            {{ entry.snapshot.brand }} {{ entry.snapshot.tonnage }} 吨 · {{ entry.snapshot.usage_hours }} 小时
          </span>
        </p>
        <EvaluationResultCard :record="entry.record" explainable :selected="entrySelected(entry)" @explain="selectEntry(entry)" />
      </div>
    </div>
    <p v-if="loadError" class="notice error-notice" role="alert">{{ loadError }}</p>
    <p v-if="expiredNotice" class="notice" role="status">草稿已闲置 30 分钟并过期。可重新填写，历史结果仍保留在当前页面。</p>
  </section>
</template>

<script setup lang="ts">
import type { EvaluationRecord, EvaluationRequest, ValuationExplanationCard } from '~/api/valuation'
import {
  explanationCardKey,
  formalExplanationCard,
  formalExplanationLabel,
  type ExplanationAnswer
} from '~/utils/valuationExplanations'

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
  operationId: string
}
export interface ConversationExplanationEntry {
  id: number
  kind: 'explanation'
  answer: ExplanationAnswer
}
export type ConversationTimelineEntry = ConversationMessageEntry | ConversationResultEntry | ConversationExplanationEntry

const props = defineProps<{
  entries: ConversationTimelineEntry[]
  loadError: string
  expiredNotice: boolean
  selectedCardKey: string
}>()
const emit = defineEmits<{
  select: [selection: { card: ValuationExplanationCard; label: string }]
  recalculate: [card: ValuationExplanationCard]
}>()

function entrySelected(entry: ConversationResultEntry): boolean {
  return props.selectedCardKey === explanationCardKey(formalExplanationCard(entry.record, entry.operationId))
}

function selectEntry(entry: ConversationResultEntry) {
  emit('select', {
    card: formalExplanationCard(entry.record, entry.operationId),
    label: formalExplanationLabel(entry.record)
  })
}
</script>

<style scoped>
.explanation-result {
  padding: var(--space-2) 0 var(--space-4);
  scroll-margin-top: 96px;
}
.explanation-entry {
  width: 100%;
  max-width: 100%;
  border-color: var(--color-primary-200);
  background: var(--color-primary-50);
}
.explanation-entry[data-state='failure'] {
  border-color: var(--color-warning);
  background: var(--color-warning-light);
}
.explanation-question {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}
.explanation-meta {
  margin-top: var(--space-2);
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
}
.explanation-entry .primary-button {
  margin-top: var(--space-3);
}
</style>
