<template>
  <div
    ref="panelRef"
    class="fv"
    :class="{
      'is-ready': ready,
      'is-error': Boolean(error),
      'is-fullscreen': isFullscreen
    }"
    role="group"
    aria-label="防爆叉车三维展台"
  >
    <canvas
      ref="canvasRef"
      class="fv__canvas"
      role="img"
      aria-label="1.5 吨防爆蓄电池叉车三维模型，可拖拽旋转、缩放查看"
      @dblclick.prevent="handleReset"
    />

    <div class="fv__vignette" aria-hidden="true" />

    <!-- 加载 / 错误遮罩 -->
    <div v-if="!ready || error" class="fv__veil" :aria-hidden="ready || Boolean(error)">
      <svg
        v-if="!error"
        class="fv__loader-art"
        viewBox="0 0 300 170"
        fill="none"
        stroke="currentColor"
        stroke-width="2.1"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M12 150h276" class="fv__loader-ground" />
        <circle cx="88" cy="122" r="26" />
        <circle cx="88" cy="122" r="9" opacity=".5" />
        <circle cx="226" cy="132" r="17" />
        <circle cx="226" cy="132" r="6" opacity=".5" />
        <path d="M58 122V84q0-12 12-12h104q14 0 22 12l20 38" />
        <path d="M58 122h166" opacity=".55" />
        <path d="M119 72V56h34v16" />
        <path d="M136 56V38h26v18" opacity=".75" />
        <path d="M48 132V38h13v94" opacity=".9" />
        <path d="M61 52v38H14v9l50-4" opacity=".9" />
        <path d="M70 72V30h118v42" />
        <path d="M70 30h118" opacity=".55" />
        <path d="M86 30v42M173 30v42" opacity=".35" />
        <path d="M206 92h16v14h-16z" opacity=".45" />
      </svg>

      <div v-if="error" class="fv__error" role="alert">
        <p class="fv__error-title">三维展台未能加载</p>
        <p class="fv__error-text">{{ error }}</p>
        <button type="button" class="fv__retry" @click="reloadPage">重新加载页面</button>
      </div>

      <template v-else>
        <p class="fv__loader-title">正在构建三维展台</p>
        <p class="fv__loader-note">CPD15-Ex · 1.5 t 防爆蓄电池叉车</p>
        <div class="fv__loader-bar" aria-hidden="true"><span /></div>
      </template>
    </div>

    <template v-if="ready && !error">
      <div class="fv__brand" aria-hidden="true">
        <span class="fv__live-dot" />
        <span class="fv__brand-live">LIVE 3D</span>
        <span class="fv__brand-sep" />
        <span class="fv__brand-model">CPD15-Ex · 1.5 t</span>
      </div>

      <div class="fv__tools" role="group" aria-label="展台操作">
        <button
          type="button"
          class="fv__tool"
          aria-label="缩小"
          title="缩小"
          @click="handleZoom(1.22)"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true">
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="M12.6 12.6L17 17M6 8.5h5" />
          </svg>
        </button>
        <button
          type="button"
          class="fv__tool"
          aria-label="放大"
          title="放大"
          @click="handleZoom(0.8)"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true">
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="M12.6 12.6L17 17M6 8.5h5M8.5 6v5" />
          </svg>
        </button>
        <button
          type="button"
          class="fv__tool"
          :class="{ 'is-active': autoRotate }"
          :aria-pressed="autoRotate"
          aria-label="自动旋转"
          title="自动旋转"
          @click="handleAutoRotate"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M16.4 8.2A6.6 6.6 0 1 0 16.5 12" />
            <path d="M16.7 3.9v4.4h-4.3" />
          </svg>
        </button>
        <button
          type="button"
          class="fv__tool"
          aria-label="复位视角"
          title="复位视角"
          @click="handleReset"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3.4 8.2A6.8 6.8 0 1 1 3.5 12" />
            <path d="M3.3 3.9v4.4h4.3" />
            <path d="M8 10h4" />
          </svg>
        </button>
        <button
          v-if="fullscreenSupported"
          type="button"
          class="fv__tool"
          :aria-label="isFullscreen ? '退出全屏' : '全屏查看'"
          :title="isFullscreen ? '退出全屏' : '全屏查看'"
          @click="toggleFullscreen"
        >
          <svg
            v-if="!isFullscreen"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M7.4 3.4H3.4v4M12.6 3.4h4v4M16.6 12.6v4h-4M7.4 16.6h-4v-4" />
          </svg>
          <svg
            v-else
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M3.4 7.4h4v-4M16.6 7.4h-4v-4M16.6 12.6h-4v4M3.4 12.6h4v4" />
          </svg>
        </button>
      </div>

      <div class="fv__views" role="group" aria-label="预设视角">
        <button
          v-for="view in views"
          :key="view.id"
          type="button"
          class="fv__view"
          :class="{ 'is-active': activeView === view.id }"
          :aria-pressed="activeView === view.id"
          :title="view.hint"
          @click="handleView(view.id)"
        >
          {{ view.label }}
        </button>
      </div>

      <div class="fv__caption">
        <span class="fv__caption-label">{{ activePreset ? activePreset.hint : '自由视角' }}</span>
        <span class="fv__caption-hint">拖拽旋转 · 滚轮缩放 · 双击复位</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { FORKLIFT_VIEWS, type ForkliftViewId } from '~/utils/forklift/views'
import type { ForkliftSceneHandle } from '~/utils/forklift/scene'
import { prefersReducedMotion } from '~/utils/motion'

const views = FORKLIFT_VIEWS
const panelRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const sceneHandle = shallowRef<ForkliftSceneHandle | null>(null)
const ready = ref(false)
const error = ref('')
const activeView = ref<ForkliftViewId | null>('front34')
const autoRotate = ref(false)
const isFullscreen = ref(false)
const fullscreenSupported = ref(false)

const activePreset = computed(
  () => views.find((view) => view.id === activeView.value) ?? null
)

let unmounted = false

function handleView(id: ForkliftViewId) {
  sceneHandle.value?.setAutoRotate(false)
  sceneHandle.value?.setView(id)
}

function handleReset() {
  sceneHandle.value?.resetView()
}

function handleAutoRotate() {
  sceneHandle.value?.setAutoRotate(!autoRotate.value)
}

function handleZoom(factor: number) {
  sceneHandle.value?.zoomBy(factor)
}

function reloadPage() {
  window.location.reload()
}

async function toggleFullscreen() {
  const panel = panelRef.value
  if (!panel) return
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else if (typeof panel.requestFullscreen === 'function') {
      await panel.requestFullscreen()
    }
  } catch {
    // 用户取消或被浏览器拒绝时静默处理
  }
}

function onFullscreenChange() {
  isFullscreen.value = document.fullscreenElement === panelRef.value
}

onMounted(async () => {
  fullscreenSupported.value =
    typeof panelRef.value?.requestFullscreen === 'function'
  document.addEventListener('fullscreenchange', onFullscreenChange)

  const canvas = canvasRef.value
  const panel = panelRef.value
  if (!canvas || !panel) {
    error.value = '页面初始化失败，请刷新后重试。'
    return
  }

  try {
    // 关键：three.js 场景代码在组件挂载后才动态加载，列表页不承担 3D 体积
    const { createForkliftScene } = await import('~/utils/forklift/scene')
    if (unmounted) return

    const handle = createForkliftScene({
      canvas,
      container: panel,
      reducedMotion: prefersReducedMotion(),
      onReady: () => {
        if (!unmounted) ready.value = true
      },
      onViewChange: (id) => {
        activeView.value = id
      },
      onAutoRotateChange: (on) => {
        autoRotate.value = on
      }
    })

    if (unmounted) {
      handle.dispose()
      return
    }
    sceneHandle.value = handle
  } catch (reason) {
    console.error('[forklift] 3D 场景初始化失败', reason)
    error.value =
      '当前浏览器可能未启用 WebGL，或图形设备暂时不可用。建议使用最新版 Chrome / Edge / Safari 打开。'
  }
})

onBeforeUnmount(() => {
  unmounted = true
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  sceneHandle.value?.dispose()
  sceneHandle.value = null
})
</script>

<style scoped>
.fv {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 360px;
  overflow: hidden;
  border-radius: var(--radius-xl);
  background:
    radial-gradient(ellipse at 50% 40%, #fbfcfe 0%, #eef3f8 58%, #e4eaf1 100%);
  border: 1px solid rgba(15, 23, 42, 0.1);
  box-shadow:
    0 24px 60px -30px rgba(15, 23, 42, 0.4),
    0 2px 0 rgba(255, 255, 255, 0.7) inset;
  isolation: isolate;
}

.fv:fullscreen,
.fv.is-fullscreen {
  height: 100%;
  width: 100%;
  border-radius: 0;
  border: 0;
  background: #e9eef4;
}

.fv__canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  touch-action: pan-y;
  cursor: grab;
  opacity: 0;
  transition: opacity 0.55s var(--ease-default);
}

.fv.is-ready .fv__canvas {
  opacity: 1;
}

.fv__canvas:active {
  cursor: grabbing;
}

.fv__vignette {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: radial-gradient(
    ellipse at 50% 46%,
    transparent 52%,
    rgba(15, 23, 42, 0.07) 100%
  );
}

/* ---------- 加载 / 错误 ---------- */

.fv__veil {
  position: absolute;
  inset: 0;
  z-index: 6;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  text-align: center;
  color: #0f172a;
  background:
    radial-gradient(ellipse at 50% 42%, #fcfdfe 0%, #eff4f9 58%, #e5ebf2 100%);
  transition: opacity 0.5s var(--ease-default), visibility 0.5s;
}

.fv.is-ready .fv__veil {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.fv__loader-art {
  width: min(280px, 62%);
  height: auto;
  color: var(--color-primary-600);
  opacity: 0.62;
  filter: drop-shadow(0 10px 18px rgba(14, 165, 233, 0.12));
}

.fv__loader-ground {
  stroke-dasharray: 3 7;
  opacity: 0.4;
}

.fv__loader-title {
  margin: 8px 0 0;
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  letter-spacing: 0.02em;
  color: var(--color-text-primary);
}

.fv__loader-note {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: 0.12em;
  color: var(--color-text-tertiary);
}

.fv__loader-bar {
  width: 168px;
  height: 3px;
  margin-top: 16px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: rgba(148, 163, 184, 0.28);
}

.fv__loader-bar span {
  display: block;
  width: 44%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--color-primary-400), var(--color-accent-400));
  animation: fvLoad 1.15s var(--ease-default) infinite;
}

@keyframes fvLoad {
  from { transform: translateX(-110%); }
  to { transform: translateX(260%); }
}

.fv__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  max-width: 420px;
}

.fv__error-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.fv__error-text {
  margin: 0;
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--color-text-tertiary);
}

.fv__retry {
  margin-top: 4px;
  padding: 9px 18px;
  border: 1px solid var(--color-border-dark);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  font: inherit;
  font-size: var(--text-sm);
  cursor: pointer;
  transition: background var(--duration-fast), border-color var(--duration-fast);
}

.fv__retry:hover {
  background: var(--color-primary-50);
  border-color: var(--color-primary-300);
}

/* ---------- HUD ---------- */

.fv__brand {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 12px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.78);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  box-shadow: 0 6px 18px -14px rgba(15, 23, 42, 0.4);
  pointer-events: none;
}

.fv__live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.16);
  animation: fvLive 2.6s var(--ease-default) infinite;
}

@keyframes fvLive {
  0%, 100% { box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.16); }
  50% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
}

.fv__brand-live {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--color-text-primary);
}

.fv__brand-sep {
  width: 1px;
  height: 12px;
  background: rgba(15, 23, 42, 0.16);
}

.fv__brand-model {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--color-text-tertiary);
}

.fv__tools {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.78);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  box-shadow: 0 6px 18px -14px rgba(15, 23, 42, 0.4);
}

.fv__tool {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #334155;
  cursor: pointer;
  transition: background var(--duration-fast), color var(--duration-fast);
}

.fv__tool svg {
  width: 18px;
  height: 18px;
}

.fv__tool:hover {
  background: rgba(15, 23, 42, 0.06);
  color: var(--color-text-primary);
}

.fv__tool.is-active {
  background: var(--color-text-primary);
  color: #fff;
}

.fv__tool.is-active svg {
  animation: fvSpin 5.5s linear infinite;
}

@keyframes fvSpin {
  to { transform: rotate(360deg); }
}

.fv__tool:focus-visible,
.fv__view:focus-visible,
.fv__retry:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}

.fv__views {
  position: absolute;
  left: 50%;
  bottom: 16px;
  z-index: 4;
  display: flex;
  gap: 3px;
  max-width: calc(100% - 32px);
  padding: 5px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.82);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  box-shadow: 0 14px 34px -22px rgba(15, 23, 42, 0.5);
  transform: translateX(-50%);
  overflow-x: auto;
  scrollbar-width: none;
}

.fv__views::-webkit-scrollbar {
  display: none;
}

.fv__view {
  flex: 0 0 auto;
  padding: 8px 13px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: var(--font-medium);
  line-height: 1.2;
  white-space: nowrap;
  color: #475569;
  cursor: pointer;
  transition: background var(--duration-fast), color var(--duration-fast);
}

.fv__view:hover {
  background: rgba(15, 23, 42, 0.06);
  color: var(--color-text-primary);
}

.fv__view.is-active {
  background: var(--color-text-primary);
  color: #fff;
  font-weight: var(--font-semibold);
}

.fv__caption {
  position: absolute;
  left: 18px;
  bottom: 18px;
  z-index: 3;
  display: flex;
  flex-direction: column;
  gap: 3px;
  pointer-events: none;
}

.fv__caption-label {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-primary-700);
}

.fv__caption-hint {
  font-size: 11px;
  letter-spacing: 0.02em;
  color: var(--color-text-muted);
}

@media (max-width: 1023px) {
  .fv__caption {
    display: none;
  }
}

@media (max-width: 639px) {
  .fv {
    min-height: 320px;
    border-radius: var(--radius-lg);
  }
  .fv__brand {
    top: 12px;
    left: 12px;
    height: 30px;
    padding: 0 10px;
  }
  .fv__brand-model,
  .fv__brand-sep {
    display: none;
  }
  .fv__tools {
    top: 12px;
    right: 12px;
    padding: 4px;
  }
  .fv__tool {
    width: 30px;
    height: 30px;
  }
  .fv__views {
    left: 12px;
    right: 12px;
    bottom: 12px;
    max-width: none;
    transform: none;
    justify-content: flex-start;
    gap: 2px;
    padding: 4px;
  }
  .fv__view {
    padding: 9px 8px;
    font-size: 11.5px;
  }
  .fv__loader-art {
    width: 58%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fv__canvas,
  .fv__veil {
    transition: none;
  }
  .fv__live-dot,
  .fv__loader-bar span,
  .fv__tool.is-active svg {
    animation: none !important;
  }
}
</style>
