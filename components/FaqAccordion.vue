<template>
  <div class="faq-list">
    <div
      v-for="(item, index) in faqs"
      :key="item.q"
      class="faq-item"
      :class="{ open: openIndex === index }"
    >
      <button
        class="faq-question"
        :aria-expanded="openIndex === index"
        :aria-controls="`faq-panel-${index}`"
        @click="toggle(index)"
      >
        <span class="faq-q-text">{{ item.q }}</span>
        <span class="faq-chevron" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      <!-- grid-template-rows 0fr→1fr 过渡实现平滑展开（无需测量高度） -->
      <div :id="`faq-panel-${index}`" class="faq-answer" role="region">
        <div class="faq-answer-inner">
          <p class="faq-a-text">{{ item.a }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { FaqItem } from '~/config/homeContent'

/**
 * FAQ 手风琴（单开模式）
 * 原生 button + aria-expanded/aria-controls 保证可访问性。
 * 文案由调用方传入（首页来自 config/homeContent.ts）。
 */

defineProps<{ faqs: FaqItem[] }>()

const openIndex = ref<number | null>(0)

function toggle(index: number) {
  openIndex.value = openIndex.value === index ? null : index
}
</script>

<style scoped>
.faq-list {
  max-width: 860px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.faq-item {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: border-color var(--duration-fast), box-shadow var(--duration-normal);
}
.faq-item:hover {
  border-color: var(--color-primary-300);
}
.faq-item.open {
  border-color: var(--color-primary-400);
  box-shadow: var(--shadow-md);
}
.faq-question {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-5) var(--space-6);
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
}
.faq-q-text {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  line-height: var(--leading-snug);
}
.faq-chevron {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-50);
  color: var(--color-primary-600);
  transition: transform var(--duration-normal) var(--ease-default), background var(--duration-fast);
}
.faq-item.open .faq-chevron {
  transform: rotate(180deg);
  background: var(--color-primary-100);
}
.faq-answer {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--duration-normal) var(--ease-default);
}
.faq-item.open .faq-answer {
  grid-template-rows: 1fr;
}
.faq-answer-inner {
  overflow: hidden;
}
.faq-a-text {
  padding: 0 var(--space-6) var(--space-6);
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--color-text-secondary);
  margin: 0;
}
@media (prefers-reduced-motion: reduce) {
  .faq-answer,
  .faq-chevron {
    transition: none !important;
  }
}
</style>
