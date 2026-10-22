// 估值登录墙（票 #32 后续）：历史 / 报告这类「必须登录」的估值页，在路由层先问一次服务端会话。
// 为什么放在路由中间件而不是页面 setup：客户端导航时，setup 里那次 navigateTo 可能被「正在进行
// 的那次导航」吞掉——表现就是「点历史没反应，页面停在半路」。中间件是导航管线的一环，一定跑完。
//
// 判据以服务端会话为准（BFF 自己会做续期与令牌校验），不读浏览器侧的任何东西。
export default defineNuxtRouteMiddleware(async (to) => {
  const requestFetch = useRequestFetch()
  const session = await requestFetch<{ user: unknown }>('/__portal__/valuation/session').catch(() => null)
  if (session?.user) return
  // 拿不到会话（未登录，或会话端点本身不可用）一律去登录页：那里会再问一次，
  // 若其实还登录着就自动回跳，所以「网络抖一下」不会把人卡在门外。
  return navigateTo({ path: '/valuation/login', query: { redirect: to.fullPath } })
})
