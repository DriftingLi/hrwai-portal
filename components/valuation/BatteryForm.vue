<template>
  <form class="valuation-card" @submit.prevent="submit">
    <div class="form-grid">
      <label class="field">
        <span class="field-label">电池类型 <em>*</em></span>
        <select v-model="batteryType" class="field-input" data-test="battery-type">
          <option v-for="option in batteryTypeOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>

      <label class="field">
        <span class="field-label">电池型号</span>
        <input
          v-model="batteryModel"
          class="field-input"
          type="text"
          maxlength="80"
          placeholder="选填，如 LFP-100Ah、NCM-50Ah"
          data-test="battery-model"
        />
      </label>
    </div>

    <label class="field field-block">
      <span class="field-label">循环充放电数据（JSON，至少 {{ BATTERY_MIN_CYCLES }} 条）</span>
      <textarea
        v-model="cyclesJson"
        class="field-input code-area"
        rows="12"
        spellcheck="false"
        placeholder='[{"cycle_index":1,"voltage_series":[3.2,3.3],"current_series":[1,1],"capacity":1.1}]'
        data-test="cycles-json"
        @input="parse"
      ></textarea>
    </label>

    <div class="toolbar">
      <input
        ref="fileInput"
        type="file"
        accept=".json,application/json"
        class="file-input"
        data-test="cycles-file"
        @change="onFileChange"
      />
      <button type="button" class="btn-ghost" data-test="upload-file" @click="fileInput?.click()">
        上传 .json
      </button>
      <button type="button" class="btn-ghost" data-test="load-sample" @click="loadSample">加载示例</button>
      <button type="button" class="btn-ghost" data-test="reset" @click="reset">重置</button>
      <span v-if="parseError" class="hint hint-error" data-test="parse-error">{{ parseError }}</span>
      <span v-else-if="parsedCycles.length > 0" class="hint hint-ok" data-test="parse-ok">
        已识别 {{ parsedCycles.length }} 个循环
      </span>
    </div>

    <div class="submit-row">
      <p v-if="submitError" class="form-error" role="alert">{{ submitError }}</p>
      <button type="submit" class="btn-primary" :disabled="submitting || !canSubmit" data-test="submit">
        {{ submitting ? '评估中…' : '开始评估' }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { BatteryCycle, BatteryType, CreateBatteryResponse } from '~/api/valuation'
import { valuationErrorMessage } from '~/api/valuation'
import { useValuationApi } from '~/composables/useValuationApi'
import { BATTERY_MIN_CYCLES, buildSampleBatteryCycles, parseBatteryCycles } from '~/utils/valuationBattery'

const emit = defineEmits<{ evaluated: [result: CreateBatteryResponse] }>()

const api = useValuationApi()

const batteryTypeOptions: Array<{ value: BatteryType; label: string }> = [
  { value: 'lfp', label: '磷酸铁锂（LFP）' },
  { value: 'ncm', label: '三元锂（NCM）' },
  { value: 'other', label: '其他' }
]

const batteryType = ref<BatteryType>('lfp')
const batteryModel = ref('')
const cyclesJson = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const parsedCycles = ref<BatteryCycle[]>([])
const parseError = ref('')
const submitError = ref('')
const submitting = ref(false)

const canSubmit = computed(() => !parseError.value && parsedCycles.value.length >= BATTERY_MIN_CYCLES)

function parse() {
  const result = parseBatteryCycles(cyclesJson.value)
  parsedCycles.value = result.cycles
  parseError.value = result.error ?? ''
}

function loadSample() {
  cyclesJson.value = JSON.stringify(buildSampleBatteryCycles(), null, 2)
  parse()
}

/** 读本地 .json 到文本框（旧 SPA 的「上传 .json」）——不直接提交，先让用户看一眼解析结果 */
function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    cyclesJson.value = String(reader.result || '')
    parse()
  }
  reader.readAsText(file, 'utf-8')
  // 同一个文件连选两次也要能触发 change
  input.value = ''
}

function reset() {
  batteryModel.value = ''
  cyclesJson.value = ''
  parsedCycles.value = []
  parseError.value = ''
  submitError.value = ''
}

async function submit() {
  parse()
  if (parseError.value || parsedCycles.value.length < BATTERY_MIN_CYCLES) {
    submitError.value = parseError.value || `至少需要 ${BATTERY_MIN_CYCLES} 个完整循环`
    return
  }
  submitError.value = ''
  submitting.value = true
  try {
    const result = await api.createBatteryEvaluation({
      battery_type: batteryType.value,
      ...(batteryModel.value.trim() ? { battery_model: batteryModel.value.trim() } : {}),
      cycles: parsedCycles.value
    })
    emit('evaluated', result)
  } catch (error) {
    submitError.value = valuationErrorMessage(error, '电池评估失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.valuation-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-8);
  box-shadow: var(--shadow-sm);
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4) var(--space-5);
  margin-bottom: var(--space-5);
}
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}
.field-block {
  margin-bottom: var(--space-4);
}
.field-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  font-weight: var(--font-medium);
}
.field-label em {
  color: var(--color-danger);
  font-style: normal;
}
.field-input {
  width: 100%;
  min-height: 42px;
  padding: 10px 12px;
  border: 1px solid var(--color-border-dark);
  border-radius: var(--radius-md);
  background: #fff;
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: var(--text-base);
}
.field-input:focus {
  outline: none;
  border-color: var(--color-primary-400);
  box-shadow: 0 0 0 3px var(--color-primary-50);
}
.code-area {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
  resize: vertical;
}
/* 隐藏原生 file input：由「上传 .json」按钮代按，视觉与其他 ghost 按钮一致 */
.file-input {
  display: none;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}
.btn-ghost {
  min-height: 40px;
  padding: 8px 20px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-dark);
  background: #fff;
  color: var(--color-text-secondary);
  font-family: inherit;
  font-size: var(--text-sm);
  cursor: pointer;
  transition: border-color var(--duration-fast), color var(--duration-fast);
}
.btn-ghost:hover {
  border-color: var(--color-primary-400);
  color: var(--color-primary-600);
}
.hint {
  font-size: var(--text-sm);
}
.hint-ok {
  color: var(--color-success);
}
.hint-error {
  color: var(--color-danger);
}
.submit-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-4);
  flex-wrap: wrap;
  border-top: 1px solid var(--color-border-light);
  margin-top: var(--space-6);
  padding-top: var(--space-6);
}
.form-error {
  margin: 0;
  color: var(--color-danger);
  font-size: var(--text-sm);
}
.btn-primary {
  min-height: 44px;
  padding: 12px 36px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--gradient-brand);
  color: #fff;
  font-family: inherit;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  cursor: pointer;
  transition: opacity var(--duration-fast);
}
.btn-primary:hover:not(:disabled) {
  opacity: 0.92;
}
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
@media (max-width: 640px) {
  .valuation-card {
    padding: var(--space-5);
  }
  .form-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
