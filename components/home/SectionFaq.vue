<template>
  <section id="faq" class="section faq-section has-texture has-texture-light has-fade" style="--next-bg: var(--color-bg-card)">
    <div class="light-aurora" aria-hidden="true"><div class="light-aurora__blob"></div></div>
    <div class="section-fade" aria-hidden="true"></div>
    <div class="container">
      <div class="section-title-wrap" v-reveal>
        <h2 class="section-title">常见问题<span class="title-underline"></span></h2>
        <p class="section-subtitle">关于评估、培训、交易与合作的高频疑问</p>
      </div>
      <FaqAccordion :faqs="faqs" v-reveal="100" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { faqs } from '~/config/homeContent'
</script>

<style scoped>
.faq-section {
  background: var(--color-bg-page);
}
</style>
