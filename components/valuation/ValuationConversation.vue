<template>
  <div class="conversation-layout">
    <ValuationTimeline :entries="timeline.entries.value" :load-error="loadError" :expired-notice="expiredNotice" />

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
        @range-error="actionError = '请填写有效的最小和最大工时'"
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

    <form class="composer" data-test="message-form" @submit.prevent="timeline.sendMessage">
      <label class="sr-only" for="conversation-message">叉车信息或问题</label>
      <input id="conversation-message" v-model="timeline.messageText.value" data-test="message-input" placeholder="描述车辆，或补充工时；当前版本请用下方草稿完成字段确认" />
      <button type="submit" class="primary-button" :disabled="!timeline.messageText.value.trim()">发送</button>
    </form>
    <p class="memory-note">消息与结果卡仅保留在当前页面；刷新只恢复未过期的草稿与字段依据。</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Brand, ConditionRating } from '~/api/valuation'
import { useValuationApi } from '~/composables/useValuationApi'
import { useValuationConversation } from '~/composables/useValuationConversation'
import { useConversationDictionaries } from '~/composables/useConversationDictionaries'
import { useConversationReview } from '~/composables/useConversationReview'
import { useConversationTimeline } from '~/composables/useConversationTimeline'
import {
  createDraftFields,
  draftToEvaluationRequest,
  type DraftFieldKey
} from '~/utils/valuationConversation'
import { conversationDraftSummary, valuationConversationDemo as demoValues } from '~/utils/valuationConversationFields'

const props = defineProps<{ brands: Brand[]; provinces: string[]; conditionRatings: ConditionRating[] }>()
const controller = useValuationConversation()
const { draft, loading, saving, confirming, complete } = controller
const fields = computed(() => draft.value?.fields ?? createDraftFields())
const dictionaries = useConversationDictionaries(useValuationApi(), props, fields, controller.revalidateFields)
const summary = computed(() => conversationDraftSummary(fields.value))
const timeline = useConversationTimeline(() => controller.touch())
const review = useConversationReview(draft, complete, () => controller.touch())
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
async function saveRange(min: number, max: number) {
  await guarded(() => controller.setRange('usage_hours', min, max, '用户提供工时范围'))
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

<style src="~/assets/css/valuation-conversation.css"></style>
