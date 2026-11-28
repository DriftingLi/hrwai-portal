<template>
  <div class="conversation-layout">
    <section class="conversation-stream" aria-label="估值对话">
      <div v-for="(entry, index) in timeline" :key="entry.id">
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

    <section class="draft-card" aria-labelledby="draft-title">
      <header class="draft-head">
        <div>
          <p class="eyebrow">当前草稿</p>
          <h2 id="draft-title">车辆确认卡</h2>
          <p class="draft-summary">{{ summary }}</p>
        </div>
        <div class="draft-head-actions">
          <span class="version" data-test="draft-version">版本 {{ draft?.draft_version ?? '—' }}</span>
          <button
            type="button"
            class="text-button"
            data-test="toggle-draft"
            :aria-expanded="draftExpanded"
            aria-controls="draft-editor"
            @click="toggleDraft"
          >
            {{ draftExpanded ? '收起草稿' : '查看或编辑草稿' }}
          </button>
        </div>
      </header>

      <div v-if="draftExpanded" id="draft-editor" data-test="draft-editor" class="draft-editor">
        <div class="draft-toolbar">
          <p>{{ completeCount }} / {{ fieldDefinitions.length }} 项已明确</p>
          <div>
            <button type="button" class="secondary-button" data-test="load-demo" :disabled="busy" @click="loadDemo">
              载入演示车辆
            </button>
            <button type="button" class="secondary-button" data-test="undo" :disabled="!canUndo || busy" @click="undo">撤回最近修改</button>
            <button type="button" class="text-button danger-text" :disabled="busy" @click="reset">清除草稿</button>
          </div>
        </div>
        <p class="demo-note">演示数据只会填入草稿，不会自动提交。未知项不会折成 0 或“否”。</p>

        <div v-for="group in fieldGroups" :key="group.title" class="field-group">
          <h3>{{ group.title }}</h3>
          <div class="field-list">
            <div v-for="definition in group.fields" :key="definition.key" class="draft-field">
              <div class="field-heading">
                <label :for="`direct-${definition.key}`">{{ definition.label }}</label>
                <span class="status-badge" :class="`status-${field(definition.key).status}`">
                  {{ draftStatusLabels[field(definition.key).status] }}
                </span>
              </div>

              <template v-if="definition.kind === 'boolean'">
                <div class="segmented" :aria-label="`${definition.label}取值`">
                  <button type="button" :data-test="`${definition.key}-true`" :disabled="busy" @click="saveField(definition.key, true)">是</button>
                  <button type="button" :data-test="`${definition.key}-false`" :disabled="busy" @click="saveField(definition.key, false)">否</button>
                  <button type="button" :data-test="`${definition.key}-unknown`" :disabled="busy" @click="markUnknown(definition.key)">不知道</button>
                </div>
              </template>

              <template v-else>
                <div class="value-inputs">
                  <div class="dictionary-input">
                    <span>字典点选</span>
                    <select
                      :data-test="`${definition.key}-dictionary`"
                      :value="dictionaryValue(definition.key)"
                      :disabled="busy || dictionaryOptions(definition.key).length === 0"
                      @change="chooseDictionary(definition.key, $event)"
                    >
                      <option value="" disabled>请选择</option>
                      <option v-for="option in dictionaryOptions(definition.key)" :key="option" :value="option">
                        {{ optionLabel(definition.key, option) }}
                      </option>
                    </select>
                  </div>
                  <div class="direct-input">
                    <span>直接输入</span>
                    <input
                      :id="`direct-${definition.key}`"
                      :data-test="definition.key"
                      :type="definition.kind === 'number' ? 'number' : 'text'"
                      :value="inputValue(definition.key)"
                      :placeholder="`直接输入${definition.label}`"
                      :disabled="busy"
                      @change="saveDirect(definition.key, $event)"
                    />
                  </div>
                </div>

                <div v-if="field(definition.key).status === 'candidate'" class="candidate-row">
                  <span>待确认候选：</span>
                  <select
                    :data-test="`${definition.key}-candidate`"
                    :value="''"
                    @change="chooseDictionary(definition.key, $event)"
                  >
                    <option value="" disabled>选择候选</option>
                    <option v-for="candidate in field(definition.key).candidates" :key="candidate" :value="candidate">{{ candidate }}</option>
                  </select>
                </div>

                <button type="button" class="unknown-button" :data-test="`${definition.key}-unknown`" :disabled="busy" @click="markUnknown(definition.key)">
                  明确不知道
                </button>
              </template>

              <div v-if="definition.key === 'usage_hours'" class="range-editor">
                <button type="button" class="text-button" @click="rangeOpen = !rangeOpen">
                  {{ rangeOpen ? '收起范围填写' : '只知道工时范围' }}
                </button>
                <div v-if="rangeOpen" class="range-inputs">
                  <label>最小工时<input v-model.number="rangeMin" type="number" min="0" data-test="usage-min" /></label>
                  <label>最大工时<input v-model.number="rangeMax" type="number" min="0" data-test="usage-max" /></label>
                  <button type="button" class="secondary-button" data-test="save-range" :disabled="busy" @click="saveRange">保存范围</button>
                </div>
              </div>

              <p class="field-value">{{ formatConversationField(definition.key, field(definition.key)) }}</p>
              <details v-if="field(definition.key).evidence" class="evidence">
                <summary>字段依据</summary>
                <p>{{ field(definition.key).evidence }}</p>
              </details>
            </div>
          </div>
        </div>

        <div class="review-list">
          <h3>提交前完整核对</h3>
          <dl>
            <div v-for="definition in fieldDefinitions" :key="definition.key">
              <dt>{{ definition.label }}</dt>
              <dd>{{ formatConversationField(definition.key, field(definition.key)) }}</dd>
            </div>
          </dl>
        </div>

        <p v-if="controller.error.value || actionError" class="notice error-notice" role="alert">
          {{ controller.error.value || actionError }}
        </p>
        <div class="draft-actions">
          <button type="button" class="primary-button" data-test="review" :disabled="!controller.complete.value || busy" @click="openReview">
            核对并评估
          </button>
          <span v-if="!controller.complete.value">范围、未知和候选项需先确定具体值</span>
        </div>

        <div v-if="reviewOpen" class="confirmation-panel">
          <h3>确认正式评估</h3>
          <p>将按当前版本 {{ reviewVersion }} 生成一条正式记录。匿名可提交；登录状态下首次受理时进入当前账号历史。</p>
          <dl class="confirmation-values">
            <div v-for="definition in fieldDefinitions" :key="definition.key">
              <dt>{{ definition.label }}</dt>
              <dd>{{ formatConversationField(definition.key, field(definition.key)) }}</dd>
            </div>
          </dl>
          <label class="acknowledge">
            <input v-model="acknowledged" type="checkbox" data-test="acknowledge" />
            我已核对以上全部车辆信息，确认提交此版本
          </label>
          <button
            type="button"
            class="primary-button"
            data-test="confirm"
            :disabled="!acknowledged || busy || reviewVersion !== draft?.draft_version"
            @click="submitFormal"
          >
            {{ controller.confirming.value ? '评估处理中…' : '确认并评估' }}
          </button>
          <button type="button" class="text-button" @click="reviewOpen = false">返回修改</button>
        </div>
      </div>
    </section>

    <form class="composer" data-test="message-form" @submit.prevent="sendMessage">
      <label class="sr-only" for="conversation-message">叉车信息或问题</label>
      <input
        id="conversation-message"
        v-model="messageText"
        data-test="message-input"
        placeholder="描述车辆，或补充工时；当前版本请用下方草稿完成字段确认"
      />
      <button type="submit" class="primary-button" :disabled="!messageText.trim()">发送</button>
    </form>
    <p class="memory-note">消息与结果卡仅保留在当前页面；刷新只恢复未过期的草稿与字段依据。</p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Brand, ConditionRating, EvaluationRecord, EvaluationRequest } from '~/api/valuation'
import { useValuationApi } from '~/composables/useValuationApi'
import { useValuationConversation } from '~/composables/useValuationConversation'
import {
  useWholeMachineDictionaries,
  type WholeMachineDictionaryForm
} from '~/composables/useWholeMachineDictionaries'
import {
  createDraftFields,
  draftToEvaluationRequest,
  draftValues,
  type DraftField,
  type DraftFieldKey
} from '~/utils/valuationConversation'

const props = defineProps<{
  brands: Brand[]
  provinces: string[]
  conditionRatings: ConditionRating[]
}>()

import {
  conversationDictionaryOptions,
  conversationDraftSummary,
  conversationOptionLabel,
  conversationUpstreamKeys as upstreamKeys,
  countExplicitFields,
  draftStatusLabels,
  formatConversationField,
  valuationConversationDemo as demoValues,
  valuationConversationFieldGroups as fieldGroups,
  valuationConversationFields as fieldDefinitions
} from '~/utils/valuationConversationFields'

interface MessageEntry {
  id: number
  kind: 'message'
  role: 'assistant' | 'user'
  text: string
}
interface ResultEntry {
  id: number
  kind: 'result'
  record: EvaluationRecord
  snapshot: EvaluationRequest
}
type TimelineEntry = MessageEntry | ResultEntry

const timeline = ref<TimelineEntry[]>([{
  id: 1,
  kind: 'message',
  role: 'assistant',
  text: '先填写车辆信息。可点选字典或直接修改；全部字段明确并核对后才能正式评估。'
}])
let entrySequence = 1
const messageText = ref('')
const draftExpanded = ref(false)
const reviewOpen = ref(false)
const reviewVersion = ref(0)
const acknowledged = ref(false)
const rangeOpen = ref(false)
const rangeMin = ref<number>()
const rangeMax = ref<number>()
const loadError = ref('')
const actionError = ref('')
const expiredNotice = ref(false)
const submittingFormal = ref(false)

const controller = useValuationConversation()
const { draft, loading, saving, confirming, error, canUndo, complete } = controller
const busy = computed(() => saving.value || confirming.value || loading.value || submittingFormal.value)
const fields = computed(() => draft.value?.fields ?? createDraftFields())
const dictionaryForm = computed<WholeMachineDictionaryForm>(() => draftValues(fields.value))
const dictionaries = useWholeMachineDictionaries(useValuationApi(), dictionaryForm)
const {
  vehicleTypes,
  seriesOptions,
  tonnages,
  configTypes,
  mastTypeOptions,
  mastHeightOptions,
  cities,
  factoryYearOptions,
  refresh: refreshDictionaries
} = dictionaries

const completeCount = computed(() => countExplicitFields(fields.value, fieldDefinitions))
const summary = computed(() => conversationDraftSummary(fields.value))

function field(key: DraftFieldKey): DraftField {
  return fields.value[key] ?? { status: 'missing' }
}

function inputValue(key: DraftFieldKey): string | number | undefined {
  const value = field(key).value
  return typeof value === 'boolean' ? undefined : value
}

function dictionaryValue(key: DraftFieldKey): string | number {
  const value = field(key).value
  return typeof value === 'boolean' ? '' : value ?? ''
}

function dictionaryEnabled(key: DraftFieldKey): boolean {
  const value = (fieldKey: DraftFieldKey) => field(fieldKey).status === 'value'
  switch (key) {
    case 'vehicle_type': return value('brand')
    case 'series': return value('brand') && value('vehicle_type')
    case 'tonnage': return value('brand') && value('vehicle_type') && value('series')
    case 'config_type': return value('brand') && value('vehicle_type') && value('series') && value('tonnage')
    case 'mast_type': return dictionaryEnabled('config_type') && value('config_type')
    case 'mast_height_mm': return dictionaryEnabled('mast_type') && value('mast_type')
    case 'factory_year': return value('tonnage')
    case 'city': return value('province')
    default: return true
  }
}

function dictionaryOptions(key: DraftFieldKey): Array<string | number> {
  if (!dictionaryEnabled(key)) return []
  return conversationDictionaryOptions(key, {
    brands: props.brands,
    provinces: props.provinces,
    conditionRatings: props.conditionRatings,
    vehicleTypes: vehicleTypes.value,
    seriesOptions: seriesOptions.value,
    tonnages: tonnages.value,
    configTypes: configTypes.value,
    mastTypeOptions: mastTypeOptions.value,
    mastHeightOptions: mastHeightOptions.value,
    cities: cities.value,
    factoryYearOptions: factoryYearOptions.value
  })
}

function optionLabel(key: DraftFieldKey, option: string | number) {
  return conversationOptionLabel(key, option, props.conditionRatings)
}

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
    if (upstreamKeys.has(key)) refreshDictionaries()
  })
}

async function saveDirect(key: DraftFieldKey, event: Event) {
  const value = (event.target as HTMLInputElement).value
  await saveField(key, value, '用户直接输入')
}

async function chooseDictionary(key: DraftFieldKey, event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (value === '') return
  await guarded(async () => {
    await controller.setDictionaryValue(key, value)
    if (upstreamKeys.has(key)) refreshDictionaries()
  })
}

async function markUnknown(key: DraftFieldKey) {
  await guarded(() => controller.setUnknown(key, '用户明确表示不知道'))
}

async function saveRange() {
  if (rangeMin.value === undefined || rangeMax.value === undefined || rangeMin.value > rangeMax.value) {
    actionError.value = '请填写有效的最小和最大工时'
    return
  }
  await guarded(() => controller.setRange('usage_hours', rangeMin.value!, rangeMax.value!, '用户提供工时范围'))
  rangeOpen.value = false
}

async function loadDemo() {
  await guarded(async () => {
    await controller.setFields(demoValues, '演示车辆数据')
    refreshDictionaries()
  })
}

async function undo() {
  await guarded(async () => {
    await controller.undo()
    refreshDictionaries()
  })
}

async function reset() {
  await guarded(async () => {
    await controller.reset()
    dictionaries.clearOptions()
    timeline.value = [{
      id: ++entrySequence,
      kind: 'message',
      role: 'assistant',
      text: '草稿已清除。可以重新点选或直接输入车辆信息。'
    }]
    draftExpanded.value = false
    reviewOpen.value = false
    acknowledged.value = false
    expiredNotice.value = false
  })
}

function toggleDraft() {
  draftExpanded.value = !draftExpanded.value
  controller.touch()
}

function sendMessage() {
  const text = messageText.value.trim()
  if (!text) return
  timeline.value.push({ id: ++entrySequence, kind: 'message', role: 'user', text })
  timeline.value.push({
    id: ++entrySequence,
    kind: 'message',
    role: 'assistant',
    text: '这段描述已保留在当前页面。当前版本请展开草稿，用字典点选或直接输入逐项确认；不会自动生成正式记录。'
  })
  messageText.value = ''
  controller.touch()
}

function openReview() {
  if (!draft.value || !complete.value) return
  reviewVersion.value = draft.value.draft_version
  acknowledged.value = false
  reviewOpen.value = true
  controller.touch()
}

async function submitFormal() {
  if (submittingFormal.value) return
  const snapshot = draft.value ? draftToEvaluationRequest(draft.value) : null
  if (!snapshot) return
  submittingFormal.value = true
  await guarded(async () => {
    const record = await controller.confirm(reviewVersion.value)
    timeline.value.push({ id: ++entrySequence, kind: 'result', record, snapshot })
    reviewOpen.value = false
    acknowledged.value = false
    draftExpanded.value = false
    await nextTick()
    document.querySelector('.inline-result:last-of-type')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
  submittingFormal.value = false
}

watch(() => draft.value?.draft_version, (version) => {
  if (reviewOpen.value && version !== reviewVersion.value) acknowledged.value = false
})

watch([vehicleTypes, seriesOptions, tonnages, configTypes, mastTypeOptions, mastHeightOptions, cities, factoryYearOptions], () => {
  const allowed: Partial<Record<DraftFieldKey, Array<string | number>>> = {}
  if (vehicleTypes.value.length) allowed.vehicle_type = vehicleTypes.value
  if (seriesOptions.value.length) allowed.series = seriesOptions.value.map((item) => item.name)
  if (tonnages.value.length) allowed.tonnage = tonnages.value
  if (configTypes.value.length) allowed.config_type = configTypes.value.map((item) => item.name)
  if (mastTypeOptions.value.length) allowed.mast_type = mastTypeOptions.value.map((item) => item.name)
  if (mastHeightOptions.value.length) allowed.mast_height_mm = mastHeightOptions.value.map((item) => item.value_mm)
  if (factoryYearOptions.value.length) allowed.factory_year = factoryYearOptions.value
  if (cities.value.length) allowed.city = cities.value
  if (Object.keys(allowed).length) void controller.revalidateFields(allowed).catch(() => undefined)
})

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

<style scoped src="~/assets/css/valuation-conversation.css"></style>
