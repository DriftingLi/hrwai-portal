// v-reveal 滚动入场动画指令（客户端专用；SSR 首屏不参与）。
import { vReveal } from '~/directives/reveal'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('reveal', vReveal)
})
