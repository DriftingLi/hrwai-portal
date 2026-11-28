import { nextTick, ref } from 'vue'
import type { EvaluationRecord, EvaluationRequest } from '~/api/valuation'
import type { ConversationTimelineEntry } from '~/components/valuation/ValuationTimeline.vue'

export function useConversationTimeline(touch: () => unknown) {
  const entries = ref<ConversationTimelineEntry[]>([{
    id: 1,
    kind: 'message',
    role: 'assistant',
    text: '先用一句话描述车辆或补充信息，AI 会整理成建议；也可点选字典或直接修改草稿。全部字段明确并核对后才能正式评估。'
  }])
  const messageText = ref('')
  let sequence = 1

  async function sendMessage(submit?: (text: string) => Promise<boolean>): Promise<boolean> {
    const text = messageText.value.trim()
    if (!text) return false
    entries.value.push({ id: ++sequence, kind: 'message', role: 'user', text })
    const applied = submit ? await submit(text) : true
    entries.value.push({
      id: ++sequence,
      kind: 'message',
      role: 'assistant',
      text: applied
        ? '建议已整理到草稿，请查看候选与字段依据；不会自动生成正式记录。'
        : '这次描述未应用为草稿修改。输入仍保留，可调整后重试或继续手动填写。'
    })
    if (applied) messageText.value = ''
    touch()
    return applied
  }

  async function appendResult(record: EvaluationRecord, snapshot: EvaluationRequest) {
    entries.value.push({ id: ++sequence, kind: 'result', record, snapshot })
    await nextTick()
    document.querySelector('.inline-result:last-of-type')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function reset() {
    entries.value = [{
      id: ++sequence,
      kind: 'message',
      role: 'assistant',
      text: '草稿已清除。可以重新点选或直接输入车辆信息。'
    }]
  }

  return { entries, messageText, sendMessage, appendResult, reset }
}
