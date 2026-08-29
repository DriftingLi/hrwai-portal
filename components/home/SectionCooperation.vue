<template>
  <section id="cooperation" class="section cooperation has-texture has-texture-light has-fade" style="--next-bg: var(--color-bg-card)">
    <div class="light-aurora" aria-hidden="true"><div class="light-aurora__blob"></div></div>
    <div class="section-fade" aria-hidden="true"></div>
    <div class="container">
      <div class="section-title-wrap" v-reveal>
        <h2 class="section-title">合作模式<span class="title-underline"></span></h2>
        <p class="section-subtitle">携手多方伙伴，共建叉车产业智能生态</p>
      </div>
      <div class="cooperation-grid">
        <div v-for="(item, index) in cooperations" :key="item.title" v-spotlight v-reveal="index * 120" class="coop-card">
          <div class="coop-icon" :style="{ background: coopColors[index]!.bg, color: coopColors[index]!.fg }">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="item.icon"></svg>
          </div>
          <h3 class="coop-title">{{ item.title }}</h3>
          <ul class="coop-list">
            <li v-for="point in item.points" :key="point">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>{{ point }}</span>
            </li>
          </ul>
          <a href="#footer" class="btn-coop" @click.prevent="scrollToId('footer')">联系我们</a>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { cooperations, coopColors } from '~/config/homeContent'
import { scrollToId } from '~/utils/scroll'
</script>

<style scoped>
.cooperation {
  background: var(--color-accent-50);
}
.cooperation-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-8);
}
.coop-card {
  position: relative;
  overflow: hidden;
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  padding: var(--space-8);
  text-align: center;
  transition: box-shadow var(--duration-normal), transform var(--duration-normal);
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}
.coop-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
.coop-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-lg);
  background: var(--color-primary-50);
  color: var(--color-primary-500);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--space-6);
}
.coop-title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  line-height: var(--leading-snug);
  color: var(--color-text-primary);
  margin: 0 0 var(--space-6);
}
.coop-list {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--space-8);
  text-align: left;
  width: 100%;
  flex: 1;
}
.coop-list li {
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--color-text-secondary);
  padding: var(--space-2) 0;
  display: flex;
  gap: var(--space-3);
}
.coop-list svg {
  flex-shrink: 0;
  margin-top: 4px;
  color: var(--color-primary-500);
}
.btn-coop {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 12px 28px;
  border: 2px solid var(--color-primary-500);
  color: var(--color-primary-500);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  border-radius: var(--radius-md);
  text-decoration: none;
  transition: background var(--duration-fast), color var(--duration-fast);
}
.btn-coop:hover {
  background: var(--color-primary-500);
  color: #fff;
}

@media (min-width: 768px) {
  .cooperation-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 639px) {
  .cooperation-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
