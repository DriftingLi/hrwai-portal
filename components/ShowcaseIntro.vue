<template>
  <header class="showcase-header" v-reveal>
    <p class="showcase-eyebrow">
      <span class="showcase-eyebrow-line" aria-hidden="true" />
      {{ eyebrow }}
    </p>
    <h1 class="showcase-title">
      {{ title }} <span class="showcase-title-dot" aria-hidden="true">·</span> {{ accent }}
    </h1>
    <p class="showcase-subtitle">{{ subtitle }}</p>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  eyebrow: string
  title: string
  accent: string
  subtitle: string
}>()
</script>

<style scoped>
.showcase-header {
  max-width: 780px;
  margin: 0 auto 30px;
  text-align: center;
}

/* 关键：英文眉题必须是块级元素，独立占一行；中文主标题 h1 另起一行。
   旧版眉题用 inline-flex、标题用 inline-block，二者会在同一行互相挤占。 */
.showcase-eyebrow {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  width: 100%;
  margin: 0 0 16px;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: var(--font-semibold);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--color-primary-700);
}

.showcase-eyebrow-line {
  width: 28px;
  height: 1px;
  flex: 0 0 auto;
  background: linear-gradient(90deg, transparent, var(--color-primary-500));
}

.showcase-title {
  display: block;
  margin: 0 auto 16px;
  font-family: var(--font-display);
  font-size: clamp(2rem, 4.2vw, 3.1rem);
  font-weight: var(--font-bold);
  line-height: 1.18;
  letter-spacing: -0.025em;
  color: var(--color-text-primary);
  text-wrap: balance;
}

.showcase-title-dot {
  padding: 0 0.12em;
  font-weight: var(--font-normal);
  color: var(--color-primary-500);
}

.showcase-subtitle {
  max-width: 680px;
  margin: 0 auto;
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--color-text-tertiary);
  /* 两行时均分长度，避免最后一行只剩三五个字 */
  text-wrap: balance;
}

@media (max-width: 639px) {
  .showcase-header {
    margin-bottom: 24px;
  }
  .showcase-title {
    font-size: clamp(1.75rem, 8.4vw, 2.4rem);
  }
  .showcase-subtitle {
    font-size: var(--text-sm);
  }
}
</style>
