<template>
  <Teleport to="body">
    <Transition name="lightbox">
      <div
        v-if="visible"
        ref="maskRef"
        class="lightbox-mask"
        role="dialog"
        aria-modal="true"
        aria-label="图片查看"
        @click.self="close"
      >
        <button v-if="images.length > 1" class="lb-nav lb-prev" aria-label="上一张" @click.stop="step(-1)">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <img :src="images[index]" alt="图片放大查看" class="lb-img" />
        <button v-if="images.length > 1" class="lb-nav lb-next" aria-label="下一张" @click.stop="step(1)">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
        <button ref="closeBtnRef" class="lb-close" aria-label="关闭" @click.stop="close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
        <span v-if="images.length > 1" class="lb-counter">{{ index + 1 }} / {{ images.length }}</span>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'

/**
 * 正文图片灯箱：收集 .markdown-body img，点击放大；ESC / 遮罩 / 关闭按钮退出，
 * 多图支持左右切换（含键盘方向键）。
 * 焦点管理：打开时焦点移入对话框（Tab 在控件间循环），关闭后还原到触发元素。
 */

const visible = ref(false)
const images = ref<string[]>([])
const index = ref(0)
const maskRef = ref<HTMLElement | null>(null)
const closeBtnRef = ref<HTMLButtonElement | null>(null)
let lastFocused: HTMLElement | null = null

function open(src: string, list: string[], idx: number) {
  images.value = list
  index.value = idx
  lastFocused = document.activeElement as HTMLElement | null
  visible.value = true
  document.body.style.overflow = 'hidden'
  nextTick(() => closeBtnRef.value?.focus())
}

function close() {
  visible.value = false
  document.body.style.overflow = ''
  lastFocused?.focus()
  lastFocused = null
}

function step(delta: number) {
  if (images.value.length === 0) return
  index.value = (index.value + delta + images.value.length) % images.value.length
}

// Tab 焦点圈定：在对话框内控件间循环，防止焦点穿透到背景页面
function trapTab(e: KeyboardEvent) {
  const mask = maskRef.value
  if (!mask) return
  const focusables = Array.from(mask.querySelectorAll<HTMLElement>('button:not([disabled])'))
  if (focusables.length === 0) return
  const first = focusables[0]!
  const last = focusables[focusables.length - 1]!
  const active = document.activeElement
  const inside = active instanceof Node && mask.contains(active)
  if (e.shiftKey && (active === first || !inside)) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && (active === last || !inside)) {
    e.preventDefault()
    first.focus()
  }
}

function onKeydown(e: KeyboardEvent) {
  if (!visible.value) return
  if (e.key === 'Escape') {
    close()
    return
  }
  if (e.key === 'Tab') {
    trapTab(e)
    return
  }
  if (e.key === 'ArrowLeft') step(-1)
  if (e.key === 'ArrowRight') step(1)
}

let clickHandler: ((e: Event) => void) | null = null

onMounted(() => {
  const body = document.querySelector('.markdown-body')
  if (!body) return
  const imgs = Array.from(body.querySelectorAll<HTMLImageElement>('img'))
  const srcs = imgs.map((img) => img.getAttribute('src') || '')
  clickHandler = (e: Event) => {
    const target = e.target as HTMLElement
    if (target.tagName !== 'IMG') return
    const src = target.getAttribute('src') || ''
    const idx = srcs.indexOf(src)
    if (src) open(src, srcs, Math.max(idx, 0))
  }
  body.addEventListener('click', clickHandler)
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  const body = document.querySelector('.markdown-body')
  if (body && clickHandler) body.removeEventListener('click', clickHandler)
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.lightbox-mask {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: rgba(11, 17, 32, 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
}
.lb-img {
  max-width: min(1100px, 92vw);
  max-height: 88vh;
  object-fit: contain;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xl);
}
.lb-nav,
.lb-close {
  position: absolute;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(15, 23, 42, 0.55);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background var(--duration-fast);
}
.lb-nav:hover,
.lb-close:hover {
  background: rgba(15, 23, 42, 0.8);
}
.lb-prev {
  left: var(--space-5);
  top: 50%;
  transform: translateY(-50%);
}
.lb-next {
  right: var(--space-5);
  top: 50%;
  transform: translateY(-50%);
}
.lb-close {
  top: var(--space-5);
  right: var(--space-5);
}
.lb-counter {
  position: absolute;
  bottom: var(--space-5);
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.75);
  font-size: var(--text-sm);
  letter-spacing: 0.1em;
}
.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity var(--duration-normal);
}
.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .lightbox-enter-active,
  .lightbox-leave-active {
    transition: none !important;
  }
}
</style>
