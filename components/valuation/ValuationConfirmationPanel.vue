<template>
  <div v-if="open" class="confirmation-panel">
    <h3>确认正式评估</h3>
    <p>将按当前版本 {{ reviewVersion }} 生成一条正式记录。匿名可提交；登录状态下首次受理时进入当前账号历史。</p>
    <dl class="confirmation-values">
      <div v-for="definition in fieldDefinitions" :key="definition.key">
        <dt>{{ definition.label }}</dt>
        <dd>{{ formatConversationField(definition.key, fields[definition.key]) }}</dd>
      </div>
    </dl>
    <label class="acknowledge">
      <input v-model="acknowledged" type="checkbox" data-test="acknowledge" />
      我已核对以上全部车辆信息，确认提交此版本
    </label>
    <button type="button" class="primary-button" data-test="confirm" :disabled="!acknowledged || busy || reviewVersion !== currentVersion" @click="emit('confirm')">
      {{ confirming ? '评估处理中…' : '确认并评估' }}
    </button>
    <button type="button" class="text-button" @click="emit('close')">返回修改</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  formatConversationField,
  valuationConversationFields as fieldDefinitions
} from '~/utils/valuationConversationFields'
import type { DraftFields } from '~/utils/valuationConversation'

const props = defineProps<{
  open: boolean
  reviewVersion: number
  currentVersion: number
  fields: DraftFields
  acknowledged: boolean
  busy: boolean
  confirming: boolean
}>()
const emit = defineEmits<{
  confirm: []
  close: []
  'update:acknowledged': [value: boolean]
}>()
const acknowledged = computed({
  get: () => props.acknowledged,
  set: (value: boolean) => emit('update:acknowledged', value)
})
</script>
