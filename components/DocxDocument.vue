<template>
  <div class="docx-document">
    <div v-if="failed" class="docx-error" role="alert">
      <strong>文档加载失败</strong>
      <span>文件可能已被移除，或网络异常。请刷新重试。</span>
    </div>
    <div v-else-if="loading" class="docx-skeleton" aria-hidden="true">
      <span v-for="n in 2" :key="n" class="docx-skeleton__block" />
    </div>
    <!-- docx-preview 的样式容器：它会把一段 <style> 塞进来，必须与正文分开挂 -->
    <div ref="styleRef" class="docx-document__style" />
    <div ref="bodyRef" class="docx-document__body" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

/**
 * docx 正文渲染（2026-11）：内容精选 `content_type = docx` 的门户读者面。
 *
 * 为什么客户端渲染：docx-preview 只认 DOM（解析 OOXML 后建节点），SSR 里没有 document；
 * 强上服务端要么引无头浏览器、要么先转 HTML 再丢排版 —— 都与「直接渲染 .docx」相悖。
 * 因此此组件由页面套 `<ClientOnly>` 使用，SSR 期输出占位骨架（SEO 由标题/摘要承担）。
 *
 * 与 frontend/ 里同名组件保持同一套三件事（少一件就静默出空白）：
 *   1. 先 fetch 成 Blob 再交给 renderAsync（它不接受跨域 URL）；
 *   2. 样式挂第二个容器；
 *   3. 换文件/卸载先清容器，否则旧节点残留。
 */
const props = withDefaults(defineProps<{ src?: string }>(), { src: '' })

const bodyRef = ref<HTMLElement | null>(null)
const styleRef = ref<HTMLElement | null>(null)
const loading = ref(false)
const failed = ref(false)
/** 竞态守卫：换文件/卸载时作废在飞渲染 */
let renderToken = 0
let unmounted = false

function clearContainers() {
  if (bodyRef.value) bodyRef.value.innerHTML = ''
  if (styleRef.value) styleRef.value.innerHTML = ''
}

async function renderDocx(url: string) {
  const token = ++renderToken
  clearContainers()
  failed.value = false
  if (!url || !bodyRef.value) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    // 动态导入：docx-preview 只在 docx 文章页才加载，列表页与常规文章不承担这份体积
    const { renderAsync } = await import('docx-preview')
    if (token !== renderToken) return
    const res = await fetch(url)
    if (!res.ok) throw new Error(`下载文档失败：${res.status}`)
    const blob = await res.blob()
    if (token !== renderToken) return
    await renderAsync(blob, bodyRef.value, styleRef.value ?? undefined, {
      inWrapper: true,
      breakPages: false,
      ignoreWidth: false,
      renderHeaders: true,
      renderFooters: true,
      useBase64URL: false
    })
    if (token !== renderToken) {
      clearContainers()
      return
    }
  } catch {
    if (token === renderToken) failed.value = true
  } finally {
    if (token === renderToken) loading.value = false
  }
}

onMounted(() => {
  // 首屏必须在挂载后渲染：挂载前 bodyRef 还是 null，会因「没有容器」静默返回、整块空白
  void renderDocx(props.src)
})

watch(
  () => props.src,
  (url) => {
    void renderDocx(url)
  }
)

onBeforeUnmount(() => {
  unmounted = true
  renderToken++
  clearContainers()
})
</script>

<style scoped>
.docx-document {
  /* docx-preview 输出固定版心宽度的 .docx-wrapper：窄屏靠横向滚动兜住，不压扁排版 */
  overflow-x: auto;
}

.docx-document__style {
  display: none;
}

.docx-document__body :deep(.docx-wrapper) {
  background: transparent;
  padding: 0;
}

.docx-document__body :deep(.docx-wrapper > section.docx) {
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgb(0 0 0 / 8%);
  border-radius: 8px;
}

.docx-document__body :deep(table) {
  max-width: 100%;
}

.docx-error {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  border: 1px solid #f3d19e;
  border-radius: 6px;
  background-color: #fdf6ec;
  color: #606266;
  font-size: 14px;
}

.docx-skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.docx-skeleton__block {
  display: block;
  height: 220px;
  border-radius: 8px;
  background-color: #f5f7fa;
  animation: docx-skeleton-pulse 1.4s ease-in-out infinite;
}

@keyframes docx-skeleton-pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.55;
  }
}

@media (prefers-reduced-motion: reduce) {
  .docx-skeleton__block {
    animation: none;
  }
}
</style>
