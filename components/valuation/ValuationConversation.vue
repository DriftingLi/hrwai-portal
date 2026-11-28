<template>
  <div class="conversation-layout">
    <ValuationTimeline :entries="timeline.entries.value" :load-error="loadError" :expired-notice="expiredNotice" />

    <section v-if="controller.suggestionStatus.value !== 'idle'" class="suggestion-status" data-test="suggestion-status" :data-status="controller.suggestionStatus.value" aria-live="polite">
      <p v-if="controller.suggesting.value">正在整理描述并等待结构化建议；此时仍可展开草稿手动修改，晚到的结果不会覆盖新版本。</p>
      <p v-else-if="controller.suggestionStatus.value === 'succeeded'">建议已应用到当前版本。候选必须由你点选，手动修改与点选都不占建议额度。</p>
      <p v-else-if="controller.suggestionStatus.value === 'stale'">{{ controller.suggestionError.value }}</p>
      <p v-else class="notice error-notice" role="alert">{{ controller.suggestionError.value }}</p>
    </section>
    <ValuationSuggestionReview
      v-if="controller.suggestion.value"
      :result="controller.suggestion.value"
      :busy="saving"
      @choose="chooseSuggestionCandidate"
    />

    <section v-if="trialEnabled" class="trial-results" aria-labelledby="trial-results-title" data-test="trial-results">
      <header class="trial-results-head">
        <div>
          <p class="eyebrow">参考区间 · 非正式记录</p>
          <h2 id="trial-results-title">参考试算</h2>
          <p class="draft-summary">首次补齐品牌、车型、吨位和有效年份后自动试算；修改草稿不会覆盖旧卡。FL 策略为最终权威，正式评估需另行核对确认。</p>
        </div>
        <button type="button" class="secondary-button" data-test="recalculate-trial" :disabled="!trialReady || trial.loading.value" :aria-busy="trial.loading.value" @click="trial.recalculate">
          {{ trial.loading.value ? '试算中…' : '按当前草稿重算' }}
        </button>
      </header>
      <p v-if="!trialReady" class="demo-note">补齐品牌、车型、吨位和有效出厂年份（或年份范围）后可试算。</p>
      <p v-if="trial.error.value" class="notice error-notice" role="alert">{{ trial.error.value }}</p>
      <TrialResultCard
        v-for="card in trial.cards.value"
        :key="card.requestId"
        :result="card.result"
        :stale="card.stale"
        :request-id="card.requestId"
      />
    </section>

    <section class="draft-card" aria-labelledby="draft-title">
      <header class="draft-head">
        <div>
          <p class="eyebrow">当前草稿</p>
          <h2 id="draft-title">车辆确认卡</h2>
          <p class="draft-summary">{{ summary }}</p>
        </div>
        <div class="draft-head-actions">
          <span class="version" data-test="draft-version">版本 {{ draft?.version ?? '—' }}</span>
          <button type="button" class="text-button" data-test="toggle-draft" :aria-expanded="draftExpanded" aria-controls="draft-editor" @click="toggleDraft">
            {{ draftExpanded ? '收起草稿' : '查看或编辑草稿' }}
          </button>
        </div>
      </header>

      <ValuationDraftEditor
        v-if="draftExpanded"
        :fields="fields"
        :condition-ratings="props.conditionRatings"
        :complete-count="dictionaries.completeCount.value"
        :complete="controller.complete.value"
        :can-undo="controller.canUndo.value"
        :busy="busy"
        :error="controller.error.value || actionError"
        :dictionary-options="dictionaries.dictionaryOptions"
        @load-demo="loadDemo"
        @undo="undo"
        @reset="reset"
        @save-field="saveField"
        @save-direct="saveDirect"
        @choose-dictionary="chooseDictionary"
        @mark-unknown="markUnknown"
        @save-range="saveRange"
        @range-error="actionError = '请填写有效的最小和最大值'"
        @review="review.openReview"
      >
        <ValuationConfirmationPanel
          :open="review.open.value"
          :review-version="review.version.value"
          :current-version="review.currentVersion.value"
          :fields="fields"
          :acknowledged="review.acknowledged.value"
          :busy="busy"
          :confirming="controller.confirming.value"
          @update:acknowledged="review.acknowledged.value = $event"
          @confirm="submitFormal"
          @close="review.close"
        />
      </ValuationDraftEditor>
    </section>

    <form class="composer" data-test="message-form" @submit.prevent="timeline.sendMessage(submitSuggestion)">
      <label class="sr-only" for="conversation-message">用一句话描述叉车信息</label>
      <input id="conversation-message" v-model="timeline.messageText.value" data-test="message-input" maxlength="4000" placeholder="例如：林德 3.5 吨，0 小时，没有登记证" />
      <button type="submit" class="primary-button" data-test="suggestion-submit" :disabled="!timeline.messageText.value.trim() || controller.suggesting.value || controller.quotaExhausted.value">
        {{ controller.suggesting.value ? '整理中…' : '让 AI 整理' }}
      </button>
    </form>
    <p class="quota-note" data-test="suggestion-quota">本页已受理 {{ controller.acceptedSuggestions.value }} 次 · 估算剩余 {{ controller.suggestionRemaining.value }} / 8（服务端为准；手动填写与候选点选不占额度）</p>
    <p class="memory-note">模型不可用、校验失败或超时时，输入与草稿都会保留，可继续手动填写。建议不会自动正式评估、参考试算、改价或存档。</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Brand, ConditionRating, TrialPolicy } from '~/api/valuation'
import { useValuationApi } from '~/composables/useValuationApi'
import { isTrialDraftReady, useTrialEstimate } from '~/composables/useTrialEstimate'
import { useValuationConversation } from '~/composables/useValuationConversation'
import { useConversationDictionaries } from '~/composables/useConversationDictionaries'
import { useConversationReview } from '~/composables/useConversationReview'
import { useConversationTimeline } from '~/composables/useConversationTimeline'
import {
  createDraftFields,
  draftFieldsToTrial,
  draftToEvaluationRequest,
  type DraftFieldKey
} from '~/utils/valuationConversation'
import { conversationDraftSummary, valuationConversationDemo as demoValues } from '~/utils/valuationConversationFields'

const props = withDefaults(defineProps<{
  brands: Brand[]
  provinces: string[]
  conditionRatings: ConditionRating[]
  trialEnabled?: boolean
  trialPolicy?: TrialPolicy
}>(), {
  trialEnabled: false,
  trialPolicy: 'demo'
})
const controller = useValuationConversation()
const { draft, loading, saving, confirming, complete } = controller
const fields = computed(() => draft.value?.fields ?? createDraftFields())
const dictionaries = useConversationDictionaries(useValuationApi(), props, fields, controller.revalidateFields)
const summary = computed(() => conversationDraftSummary(fields.value))
const timeline = useConversationTimeline(() => controller.touch())
const review = useConversationReview(draft, complete, () => controller.touch())
const trial = useTrialEstimate({ enabled: props.trialEnabled, policy: props.trialPolicy })
const trialDraft = computed(() => draftFieldsToTrial(fields.value))
const trialReady = computed(() => isTrialDraftReady(trialDraft.value))
const applyingSuggestion = ref(false)
watch(fields, (value) => {
  void trial.updateDraft(draftFieldsToTrial(value), !applyingSuggestion.value)
}, { deep: true, immediate: true, flush: 'sync' })
const draftExpanded = ref(false)
const loadError = ref('')
const actionError = ref('')
const expiredNotice = ref(false)
const submittingFormal = ref(false)
const busy = computed(() => saving.value || confirming.value || loading.value || submittingFormal.value)

async function guarded(action: () => Promise<unknown>) {
  actionError.value = ''
  try {
    await action()
  } catch (cause) {
    actionError.value = cause instanceof Error ? cause.message : '操作失败，请重试'
  }
}

async function saveField(key: DraftFieldKey, value: string | number | boolean, evidence?: string) {
  await guarded(async () => {
    await controller.setField(key, value, evidence)
    dictionaries.refreshAfterChange(key)
  })
}
async function saveDirect(key: DraftFieldKey, event: Event) {
  await saveField(key, (event.target as HTMLInputElement).value, '用户直接输入')
}
async function chooseDictionary(key: DraftFieldKey, event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (value === '') return
  await guarded(async () => {
    await controller.setDictionaryValue(key, value)
    dictionaries.refreshAfterChange(key)
  })
}
async function markUnknown(key: DraftFieldKey) {
  await guarded(() => controller.setUnknown(key, '用户明确表示不知道'))
}
async function saveRange(key: DraftFieldKey, min: number, max: number) {
  await guarded(() => controller.setRange(key, min, max, key === 'factory_year' ? '用户提供出厂年份范围' : '用户提供工时范围'))
}
async function submitSuggestion(text: string) {
  applyingSuggestion.value = true
  try {
    const applied = await controller.submitSuggestion(text)
    if (applied) dictionaries.refresh()
    return applied
  } finally {
    applyingSuggestion.value = false
  }
}
async function chooseSuggestionCandidate(key: DraftFieldKey, value: string | number | boolean) {
  applyingSuggestion.value = true
  try {
    await guarded(() => controller.chooseSuggestionCandidate(key, value))
    dictionaries.refreshAfterChange(key)
  } finally {
    applyingSuggestion.value = false
  }
}
async function loadDemo() {
  await guarded(async () => {
    await controller.setFields(demoValues, '演示车辆数据')
    dictionaries.refresh()
  })
}
async function undo() {
  await guarded(async () => {
    await controller.undo()
    dictionaries.refresh()
  })
}
async function reset() {
  await guarded(async () => {
    await controller.reset()
    dictionaries.clearOptions()
    timeline.reset()
    review.reset()
    draftExpanded.value = false
    expiredNotice.value = false
  })
}
function toggleDraft() {
  draftExpanded.value = !draftExpanded.value
  void controller.touch()
}
async function submitFormal() {
  if (submittingFormal.value) return
  const snapshot = draft.value ? draftToEvaluationRequest(draft.value) : null
  if (!snapshot) return
  submittingFormal.value = true
  await guarded(async () => {
    const record = await controller.confirm(review.version.value)
    await timeline.appendResult(record, snapshot)
    review.close()
    draftExpanded.value = false
  })
  submittingFormal.value = false
}

let expiryTimer: ReturnType<typeof setInterval> | undefined
const activityEvents: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'input', 'click']
onMounted(async () => {
  try {
    await controller.restore()
  } catch (cause) {
    loadError.value = cause instanceof Error ? cause.message : '草稿暂时不可用，请刷新重试'
  }
  for (const event of activityEvents) window.addEventListener(event, controller.touch)
  expiryTimer = setInterval(() => {
    if (controller.expireIfIdle()) expiredNotice.value = true
  }, 30000)
})
onBeforeUnmount(() => {
  if (expiryTimer) clearInterval(expiryTimer)
  for (const event of activityEvents) window.removeEventListener(event, controller.touch)
})
</script>

<style scoped>
.trial-results {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
}
.trial-results-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-4);
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-bg-card);
  box-shadow: var(--shadow-sm);
}
.trial-results-head h2 {
  margin: var(--space-1) 0 0;
  color: var(--color-text-primary);
  font-family: var(--font-display);
  font-size: var(--text-xl);
}
.trial-results-head .secondary-button {
  flex-shrink: 0;
}
@media (max-width: 560px) {
  .trial-results-head {
    padding: var(--space-4);
  }
  .trial-results-head .secondary-button {
    width: 100%;
  }
}
</style>
<style src="~/assets/css/valuation-conversation.css"></style>
