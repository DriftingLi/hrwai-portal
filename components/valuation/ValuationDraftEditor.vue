<template>
  <div id="draft-editor" data-test="draft-editor" class="draft-editor">
    <div class="draft-toolbar">
      <p>{{ completeCount }} / {{ fieldDefinitions.length }} 项已明确</p>
      <div>
        <button type="button" class="secondary-button" data-test="load-demo" :disabled="busy" @click="emit('load-demo')">载入演示车辆</button>
        <button type="button" class="secondary-button" data-test="undo" :disabled="!canUndo || busy" @click="emit('undo')">撤回最近修改</button>
        <button type="button" class="text-button danger-text" :disabled="busy" @click="emit('reset')">清除草稿</button>
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
              <button type="button" :data-test="`${definition.key}-true`" :disabled="busy" @click="emit('save-field', definition.key, true)">是</button>
              <button type="button" :data-test="`${definition.key}-false`" :disabled="busy" @click="emit('save-field', definition.key, false)">否</button>
              <button type="button" :data-test="`${definition.key}-unknown`" :disabled="busy" @click="emit('mark-unknown', definition.key)">不知道</button>
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
                  @change="emit('choose-dictionary', definition.key, $event)"
                >
                  <option value="" disabled>请选择</option>
                  <option v-for="option in dictionaryOptions(definition.key)" :key="option" :value="option">
                    {{ conversationOptionLabel(definition.key, option, conditionRatings) }}
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
                  @change="emit('save-direct', definition.key, $event)"
                />
              </div>
            </div>

            <div v-if="field(definition.key).status === 'candidate'" class="candidate-row">
              <span>待确认候选：</span>
              <select :data-test="`${definition.key}-candidate`" :value="''" @change="emit('choose-dictionary', definition.key, $event)">
                <option value="" disabled>选择候选</option>
                <option v-for="candidate in field(definition.key).candidates" :key="candidate" :value="candidate">{{ candidate }}</option>
              </select>
            </div>
            <button type="button" class="unknown-button" :data-test="`${definition.key}-unknown`" :disabled="busy" @click="emit('mark-unknown', definition.key)">明确不知道</button>
          </template>

          <div v-if="definition.key === 'usage_hours'" class="range-editor">
            <button type="button" class="text-button" @click="rangeOpen = !rangeOpen">{{ rangeOpen ? '收起范围填写' : '只知道工时范围' }}</button>
            <div v-if="rangeOpen" class="range-inputs">
              <label>最小工时<input v-model.number="rangeMin" type="number" min="0" data-test="usage-min" /></label>
              <label>最大工时<input v-model.number="rangeMax" type="number" min="0" data-test="usage-max" /></label>
              <button type="button" class="secondary-button" data-test="save-range" :disabled="busy" @click="saveRange">保存范围</button>
            </div>
          </div>
          <p class="field-value">{{ formatConversationField(definition.key, field(definition.key)) }}</p>
          <details v-if="field(definition.key).evidence" class="evidence">
            <summary>字段依据</summary><p>{{ field(definition.key).evidence }}</p>
          </details>
        </div>
      </div>
    </div>

    <div class="review-list">
      <h3>提交前完整核对</h3>
      <dl>
        <div v-for="definition in fieldDefinitions" :key="definition.key">
          <dt>{{ definition.label }}</dt><dd>{{ formatConversationField(definition.key, field(definition.key)) }}</dd>
        </div>
      </dl>
    </div>

    <p v-if="error" class="notice error-notice" role="alert">{{ error }}</p>
    <div class="draft-actions">
      <button type="button" class="primary-button" data-test="review" :disabled="!complete || busy" @click="emit('review')">核对并评估</button>
      <span v-if="!complete">范围、未知和候选项需先确定具体值</span>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ConditionRating } from '~/api/valuation'
import {
  conversationOptionLabel,
  draftStatusLabels,
  formatConversationField,
  valuationConversationFieldGroups as fieldGroups,
  valuationConversationFields as fieldDefinitions
} from '~/utils/valuationConversationFields'
import type { DraftField, DraftFieldKey, DraftFields } from '~/utils/valuationConversation'

const props = defineProps<{
  fields: DraftFields
  conditionRatings: ConditionRating[]
  completeCount: number
  complete: boolean
  canUndo: boolean
  busy: boolean
  error: string
  dictionaryOptions: (key: DraftFieldKey) => Array<string | number>
}>()
const emit = defineEmits<{
  'load-demo': []
  undo: []
  reset: []
  'save-field': [key: DraftFieldKey, value: string | number | boolean]
  'save-direct': [key: DraftFieldKey, event: Event]
  'choose-dictionary': [key: DraftFieldKey, event: Event]
  'mark-unknown': [key: DraftFieldKey]
  'save-range': [min: number, max: number]
  'range-error': []
  review: []
}>()
const rangeOpen = ref(false)
const rangeMin = ref<number>()
const rangeMax = ref<number>()

function field(key: DraftFieldKey): DraftField {
  return props.fields[key] ?? { status: 'missing' }
}
function inputValue(key: DraftFieldKey): string | number | undefined {
  const value = field(key).value
  return typeof value === 'boolean' ? undefined : value
}
function dictionaryValue(key: DraftFieldKey): string | number {
  const value = field(key).value
  return typeof value === 'boolean' ? '' : value ?? ''
}
function saveRange() {
  if (rangeMin.value === undefined || rangeMax.value === undefined || rangeMin.value > rangeMax.value) {
    emit('range-error')
    return
  }
  emit('save-range', rangeMin.value, rangeMax.value)
  rangeOpen.value = false
}
</script>
