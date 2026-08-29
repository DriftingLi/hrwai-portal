<template>
  <section id="milestones" class="section milestones has-texture has-texture-light has-fade" style="--next-bg: var(--surface-dark)">
    <div class="light-aurora" aria-hidden="true"><div class="light-aurora__blob"></div></div>
    <div class="section-fade" aria-hidden="true"></div>
    <div class="container">
      <div class="section-title-wrap" v-reveal>
        <h2 class="section-title">发展历程<span class="title-underline"></span></h2>
        <p class="section-subtitle">从技术积累到产业生态，一步一个脚印</p>
      </div>
      <ol class="timeline">
        <li
          v-for="(item, index) in milestones"
          :key="item.year"
          class="timeline-item"
          v-reveal="index * 140"
        >
          <div class="timeline-marker" aria-hidden="true">
            <span class="timeline-dot"></span>
          </div>
          <div class="timeline-card">
            <span class="timeline-year text-gradient">{{ item.year }}</span>
            <h3 class="timeline-title">{{ item.title }}</h3>
            <p class="timeline-desc">{{ item.desc }}</p>
          </div>
        </li>
      </ol>
    </div>
  </section>
</template>

<script setup lang="ts">
import { milestones } from '~/config/homeContent'
</script>

<style scoped>
.milestones {
  background: var(--color-bg-card);
}
.timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}
/* 移动端：纵向左侧连线 */
.timeline::before {
  content: '';
  position: absolute;
  left: 7px;
  top: 6px;
  bottom: 6px;
  width: 2px;
  border-radius: 1px;
  background: linear-gradient(to bottom, rgba(14, 165, 233, 0.35), rgba(20, 184, 166, 0.35));
}
.timeline-item {
  position: relative;
  padding-left: var(--space-10);
}
.timeline-marker {
  position: absolute;
  left: 0;
  top: 4px;
}
.timeline-dot {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: var(--radius-full);
  background: var(--color-bg-card);
  border: 3px solid var(--color-primary-500);
  box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.12);
}
.timeline-card {
  background: var(--surface-card-alt);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  transition: box-shadow var(--duration-normal), transform var(--duration-normal), border-color var(--duration-fast);
}
.timeline-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
  border-color: var(--color-primary-300);
}
.timeline-year {
  font-family: var(--font-mono);
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  line-height: 1;
  display: inline-block;
  margin-bottom: var(--space-2);
}
.timeline-title {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--space-2);
}
.timeline-desc {
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--color-text-secondary);
  margin: 0;
}

@media (min-width: 900px) {
  /* 桌面端：横向时间线 */
  .timeline {
    flex-direction: row;
    align-items: flex-start;
    gap: var(--space-6);
  }
  .timeline::before {
    left: 8px;
    right: 8px;
    top: 7px;
    bottom: auto;
    width: auto;
    height: 2px;
    background: linear-gradient(to right, rgba(14, 165, 233, 0.35), rgba(20, 184, 166, 0.35));
  }
  .timeline-item {
    flex: 1;
    padding-left: 0;
    padding-top: var(--space-10);
  }
  .timeline-marker {
    top: 0;
    left: 0;
  }
}
</style>
