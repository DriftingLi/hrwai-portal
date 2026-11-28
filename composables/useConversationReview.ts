import { computed, ref, watch, type Ref } from 'vue'
import type { ConversationDraft } from '~/utils/valuationConversation'

export function useConversationReview(draft: Ref<ConversationDraft | null>, complete: Ref<boolean>, touch: () => unknown) {
  const open = ref(false)
  const version = ref(0)
  const acknowledged = ref(false)

  watch(() => draft.value?.version, (current) => {
    if (open.value && current !== version.value) acknowledged.value = false
  })

  function openReview() {
    if (!draft.value || !complete.value) return
    version.value = draft.value.version
    acknowledged.value = false
    open.value = true
    touch()
  }

  function close() {
    open.value = false
    acknowledged.value = false
  }

  function reset() {
    close()
    version.value = 0
  }

  return { open, version, acknowledged, openReview, close, reset, currentVersion: computed(() => draft.value?.version ?? 0) }
}
