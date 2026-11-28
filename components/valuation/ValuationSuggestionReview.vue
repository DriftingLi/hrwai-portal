<template>
  <section class="trial-card suggestion-review" data-test="suggestion-review" aria-labelledby="suggestion-review-title">
    <header class="suggestion-head">
      <div>
        <p class="trial-eyebrow">AI 整理建议 · 待核对</p>
        <h2 id="suggestion-review-title" class="trial-title">已整理到当前草稿</h2>
        <p class="trial-note">明确值已预填；范围、未知与冲突仍以草稿为准。建议不会触发正式评估、参考试算、改价或存档。</p>
      </div>
    </header>

    <div v-if="candidateFields.length" class="trial-block">
      <h3 class="block-title">目录候选需你点选</h3>
      <p class="suggestion-note">以下身份来自 FL 校验后的真实目录。不会自动选择价高或排第一的候选；点选不占用建议额度。</p>
      <div v-for="field in candidateFields" :key="field.key" class="suggestion-candidate-group">
        <h4>{{ fieldLabel(field.key) }}</h4>
        <ul class="candidate-list">
          <li v-for="candidate in field.candidates" :key="candidate.id ?? String(candidate.value)">
            <button
              type="button"
              class="candidate-item candidate-choice"
              :data-test="`candidate-${field.key}-${candidate.value}`"
              :disabled="busy"
              @click="emit('choose', field.key, candidate.value)"
            >
              <span>
                <strong>{{ candidate.label || formatValue(field.key, candidate.value) }}</strong>
                <small>{{ candidate.id || '当前确认值' }} · {{ candidate.source === 'dictionary' ? '真实目录' : '当前草稿' }}</small>
              </span>
              <span class="choose-label">选择此项</span>
            </button>
          </li>
        </ul>
      </div>
    </div>

    <div v-if="valueItems.length" class="trial-block">
      <h3 class="block-title">已预填的明确值</h3>
      <ul class="trial-list">
        <li v-for="item in valueItems" :key="item.key">{{ fieldLabel(item.key) }}：{{ item.text }}</li>
      </ul>
    </div>

    <div v-if="supplementItems.length" class="trial-block">
      <h3 class="block-title">补充资料</h3>
      <ul class="trial-list">
        <li v-for="item in supplementItems" :key="item.key">{{ fieldLabel(item.key) }}：{{ item.value }}</li>
      </ul>
    </div>

    <div v-if="result.questions.length" class="trial-block trial-followup">
      <h3 class="block-title">还需确认</h3>
      <ul class="trial-list">
        <li v-for="question in result.questions" :key="question">{{ question }}</li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DraftFieldKey, DraftFields } from '~/utils/valuationConversation'
import type { UpstreamDraftField, ValuationSuggestionResult } from '~/api/valuation'
import { valuationConversationFields } from '~/utils/valuationConversationFields'

const props = withDefaults(defineProps<{ result: ValuationSuggestionResult; busy?: boolean }>(), { busy: false })
const emit = defineEmits<{ choose: [key: DraftFieldKey, value: string | number | boolean] }>()

const labels = new Map(valuationConversationFields.map((field) => [field.key, field.label]))
function fieldLabel(key: string) {
  return labels.get(key as DraftFieldKey) ?? key
}

function formatValue(key: DraftFieldKey, value: string | number | boolean): string {
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (key === 'tonnage') return `${value} 吨`
  if (key === 'usage_hours') return `${value} 小时`
  if (key === 'mast_height_mm') return value === 0 ? '无' : `${value} mm`
  if (key === 'factory_year' || key === 'sale_year') return `${value} 年`
  return String(value)
}

const candidateFields = computed(() => Object.entries(props.result.patches)
  .filter((entry): entry is [DraftFieldKey, UpstreamDraftField & { state: 'candidate' }] => entry[1]?.state === 'candidate')
  .map(([key, field]) => ({ key, candidates: field.candidates ?? [] }))
  .filter((field) => field.candidates.length > 0))

const valueItems = computed(() => Object.entries(props.result.patches)
  .filter((entry): entry is [DraftFieldKey, UpstreamDraftField & { state: 'value' }] => entry[1]?.state === 'value')
  .map(([key, field]) => ({ key, text: formatValue(key, field.value as string | number | boolean) })))

const supplementItems = computed(() => Object.entries(props.result.supplements)
  .map(([key, value]) => ({ key: key as keyof DraftFields, value })))
</script>

<style scoped>
.suggestion-review { display: grid; gap: var(--space-2); }
.suggestion-head { padding-bottom: var(--space-4); border-bottom: 1px solid var(--color-border-light); }
.suggestion-note { margin: 0 0 var(--space-3); color: var(--color-text-tertiary); font-size: var(--text-sm); line-height: var(--leading-relaxed); }
.suggestion-candidate-group { margin-top: var(--space-4); }
.suggestion-candidate-group h4 { margin: 0 0 var(--space-2); color: var(--color-text-secondary); font-size: var(--text-sm); }
.candidate-choice { width: 100%; color: var(--color-text-primary); text-align: left; cursor: pointer; }
.candidate-choice span { display: grid; gap: var(--space-1); min-width: 0; }
.candidate-choice small { color: var(--color-text-tertiary); font-family: var(--font-mono); font-size: var(--text-xs); overflow-wrap: anywhere; }
.candidate-choice .choose-label { flex: 0 0 auto; color: var(--color-primary-700); font-size: var(--text-xs); }
.candidate-choice:hover:not(:disabled) { border-color: var(--color-primary-400); background: var(--color-primary-50); }
.candidate-choice:focus-visible { outline: 2px solid var(--color-primary-500); outline-offset: 2px; }
@media (max-width: 560px) { .candidate-choice .choose-label { width: 100%; } }
</style>
