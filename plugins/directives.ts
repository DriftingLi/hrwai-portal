// 客户端自定义指令注册。
import { vReveal } from '~/directives/reveal'
import { vSpotlight } from '~/directives/spotlight'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('reveal', vReveal)
  nuxtApp.vueApp.directive('spotlight', vSpotlight)
})
