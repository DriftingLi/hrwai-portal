import { nextTick, ref } from 'vue'
import type { EvaluationRecord, EvaluationRequest } from '~/api/valuation'
import type { ConversationTimelineEntry } from '~/components/valuation/ValuationTimeline.vue'
import type { ExplanationAnswer } from '~/utils/valuationExplanations'

export function useConversationTimeline(touch: () => unknown) {
  const entries = ref<ConversationTimelineEntry[]>([{
    id: 1,
    kind: 'message',
    role: 'assistant',
    text: '先填写车辆信息。可点选字典或直接修改；全部字段明确并核对后才能正式评估。'
  }])
  const messageText = ref('')
  let sequence = 1

  function sendMessage() {
    const text = messageText.value.trim()
    if (!text) return
    entries.value.push({ id: ++sequence, kind: 'message', role: 'user', text })
    entries.value.push({
      id: ++sequence,
      kind: 'message',
      role: 'assistant',
      text: '这段描述已保留在当前页面。当前版本请展开草稿，用字典点选或直接输入逐项确认；不会自动生成正式记录。'
    })
    messageText.value = ''
    touch()
  }

  async function appendResult(record: EvaluationRecord, snapshot: EvaluationRequest, operationId?: string) {
    entries.value.push({ id: ++sequence, kind: 'result', record, snapshot, operationId: operationId ?? `evaluation-${record.id}` })
    await nextTick()
    document.querySelector('.inline-result:last-of-type')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function appendExplanation(answer: ExplanationAnswer) {
    entries.value.push({ id: ++sequence, kind: 'explanation', answer })
  }

  function reset() {
    entries.value = [{
      id: ++sequence,
      kind: 'message',
      role: 'assistant',
      text: '草稿已清除。可以重新点选或直接输入车辆信息。'
    }]
  }

  return { entries, messageText, sendMessage, appendResult, appendExplanation, reset }
}
