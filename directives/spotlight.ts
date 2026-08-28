import type { Directive } from 'vue'

/**
 * v-spotlight —— 卡片鼠标追随高光
 *
 * mousemove 时把光标相对坐标写入 --mx/--my CSS 变量，
 * 卡片 ::before 用 radial-gradient 在光标处渲染柔和高光。
 * 纯 CSS 变量方案，零库依赖；reduced-motion / 触屏不绑定。
 *
 * 用法（组件模板）：
 *   <div v-spotlight class="service-card">…</div>
 * CSS 侧需要（已在 index.vue 各卡片样式中提供）：
 *   .service-card::before {
 *     content: ''; position: absolute; inset: 0;
 *     background: radial-gradient(360px circle at var(--mx, 50%) var(--my, 50%), rgba(14,165,233,0.08), transparent 60%);
 *     opacity: 0; transition: opacity .3s;
 *   }
 *   .service-card:hover::before { opacity: 1; }
 */

const metaMap = new WeakMap<HTMLElement, EventListener>()

function enabled(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export const vSpotlight: Directive<HTMLElement> = {
  mounted(el) {
    if (!enabled()) return
    const handler = (e: Event) => {
      const me = e as MouseEvent
      const rect = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${me.clientX - rect.left}px`)
      el.style.setProperty('--my', `${me.clientY - rect.top}px`)
    }
    el.addEventListener('mousemove', handler, { passive: true })
    metaMap.set(el, handler)
  },
  unmounted(el) {
    const handler = metaMap.get(el)
    if (handler) {
      el.removeEventListener('mousemove', handler)
      metaMap.delete(el)
    }
  }
}
