<template>
  <section class="explanation-panel" data-test="explanation-panel" aria-labelledby="explanation-title">
    <header class="explanation-panel-head">
      <div>
        <p class="eyebrow">结果解释</p>
        <h2 id="explanation-title">选一张卡，问原因</h2>
      </div>
      <button v-if="selection" type="button" class="text-button" data-test="clear-explanation-card" @click="emit('clear')">取消选择</button>
    </header>

    <p v-if="!selection" class="explanation-hint">请先点击正式评估卡或参考试算卡上的“解释这张卡”。解释只引用所选卡的已有快照。</p>
    <div v-else class="selected-explanation" data-test="selected-explanation-card">
      <span>正在解释</span>
      <strong>{{ selection.cardLabel }}</strong>
      <small>切换卡片后，新问题只引用新卡；已输出的答复保留原卡片标签。</small>
    </div>

    <p v-if="degraded" class="explanation-degraded" data-test="explanation-degraded" role="status">本次为降级答复；卡片与报告仍按原权限使用。</p>

    <form class="composer" data-test="message-form" @submit.prevent="emit('submit')">
      <label class="sr-only" for="conversation-message">叉车信息或问题</label>
      <input
        id="conversation-message"
        :value="question"
        data-test="message-input"
        maxlength="500"
        :placeholder="selection ? '例如：为什么区间较宽？改成 6200 小时会差多少？' : '描述车辆，或补充工时；当前版本请用下方草稿完成字段确认'"
        @input="emit('update:question', ($event.target as HTMLInputElement).value)"
      />
      <button type="submit" class="primary-button" :disabled="!question.trim() || loading">
        {{ loading ? '解释中…' : selection ? '解释所选结果' : '发送' }}
      </button>
    </form>
  </section>
</template>

<script setup lang="ts">
import type { ExplanationSelection } from '~/utils/valuationExplanations'

defineProps<{
  selection: ExplanationSelection | null
  question: string
  loading: boolean
  degraded: boolean
}>()

const emit = defineEmits<{
  'update:question': [question: string]
  submit: []
  clear: []
}>()
</script>

<style scoped>
.explanation-panel {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-bg-card);
  box-shadow: var(--shadow-sm);
}
.explanation-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}
.explanation-panel h2 {
  margin: var(--space-1) 0 0;
  color: var(--color-text-primary);
  font-family: var(--font-display);
  font-size: var(--text-xl);
}
.explanation-hint,
.explanation-degraded {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
}
.selected-explanation {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-primary-200);
  border-radius: var(--radius-md);
  background: var(--color-primary-50);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  overflow-wrap: anywhere;
}
.selected-explanation strong {
  color: var(--color-text-primary);
}
.selected-explanation small {
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
  line-height: var(--leading-relaxed);
}
.explanation-degraded {
  font-size: var(--text-xs);
}
.explanation-degraded {
  color: #92400e;
}
@media (max-width: 560px) {
  .explanation-panel {
    padding: var(--space-4);
  }
  .explanation-panel-head {
    flex-direction: column;
  }
}
</style>
