<template>
  <section id="tech" class="section tech-advantages has-texture has-texture-light has-fade" style="--next-bg: var(--color-accent-50)">
    <div class="light-aurora" aria-hidden="true"><div class="light-aurora__blob"></div></div>
    <div class="section-fade" aria-hidden="true"></div>
    <div class="container">
      <div class="section-title-wrap" v-reveal>
        <h2 class="section-title">核心技术优势<span class="title-underline"></span></h2>
        <p class="section-subtitle">自研技术底座，让 AI 真正落地叉车产业场景</p>
      </div>
      <div class="tech-grid">
        <div
          v-for="(item, index) in techAdvantages"
          :key="item.title"
          v-spotlight
          class="tech-card"
          v-reveal="index * 100"
        >
          <div class="tech-icon" :style="{ background: palette[index]!.bg, color: palette[index]!.fg }">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="item.icon"></svg>
          </div>
          <h3 class="tech-title">{{ item.title }}</h3>
          <p class="tech-desc">{{ item.desc }}</p>
          <span class="tech-metric" :style="{ color: palette[index]!.fg }">{{ item.metric }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { techAdvantages, palette } from '~/config/homeContent'
</script>

<style scoped>
.tech-advantages {
  background: var(--color-bg-page);
}
.tech-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-8);
}
.tech-card {
  position: relative;
  overflow: hidden;
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  padding: var(--space-8);
  transition: box-shadow var(--duration-normal), transform var(--duration-normal), border-color var(--duration-fast);
}
.tech-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
  border-color: var(--color-primary-300);
}
.tech-icon {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-6);
  transition: transform var(--duration-normal) var(--ease-spring);
}
.tech-card:hover .tech-icon {
  transform: scale(1.08) rotate(-3deg);
}
.tech-title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--space-3);
}
.tech-desc {
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-6);
}
.tech-metric {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  letter-spacing: 0.02em;
}

@media (min-width: 900px) {
  .tech-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
