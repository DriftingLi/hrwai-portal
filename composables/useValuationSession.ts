// 估值登录态（票 #32）：页面只拿会话摘要，令牌留在服务端 Cookie 里。
import { computed } from 'vue'
import type { ValuationSessionResponse } from '~/api/valuation'

export const VALUATION_SESSION_KEY = 'valuation-session'

export function useValuationSession() {
  const api = useValuationApi()
  const { data, refresh } = useAsyncData<ValuationSessionResponse>(
    VALUATION_SESSION_KEY,
    () => api.getSession(),
    { default: () => ({ user: null }) }
  )

  return {
    user: computed(() => data.value?.user ?? null),
    refreshSession: refresh
  }
}
