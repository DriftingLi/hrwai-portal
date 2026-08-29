<template>
  <section id="products" class="section products has-texture has-texture-light has-fade" style="--next-bg: var(--color-bg-page)">
    <div class="light-aurora" aria-hidden="true"><div class="light-aurora__blob"></div></div>
    <div class="section-fade" aria-hidden="true"></div>
    <div class="container">
      <div class="section-title-wrap" v-reveal>
        <h2 class="section-title">核心服务<span class="title-underline"></span></h2>
        <p class="section-subtitle">四大业务板块，覆盖叉车全生命周期服务</p>
      </div>
      <div class="products-grid">
        <div
          v-for="(item, index) in products"
          :key="item.title"
          v-spotlight
          class="service-card"
          v-reveal="index * 100"
          @click="handleCardClick(item)"
        >
          <span class="service-no">0{{ index + 1 }}</span>
          <div class="service-icon" :style="{ background: palette[index]!.bg, color: palette[index]!.fg }">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="item.icon"></svg>
          </div>
          <h3 class="service-title">{{ item.title }}</h3>
          <p class="service-desc">{{ item.desc }}</p>
          <div class="service-cta">
            <span class="service-cta-text">进入板块</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { products, palette, type ProductCard } from '~/config/homeContent'
import { useSiteLinks } from '~/composables/useSiteLinks'
import { externalMallUrl } from '~/config/links'

const { subdomain } = useSiteLinks()

function handleCardClick(item: ProductCard) {
  // 门户不再持有登录态：核心服务入口统一整页跳转到对应功能子域名
  switch (item.module) {
    case 'training':
      window.location.href = subdomain('training', '/')
      break

    case 'valuation':
      window.location.href = subdomain('valuation', '/')
      break

    case 'ai-assistant':
      window.location.href = subdomain('training', '/ai-assistant')
      break

    case 'trade':
      window.open(externalMallUrl, '_blank', 'noopener,noreferrer')
      break
  }
}
</script>

<style scoped>
.products {
  background: var(--color-primary-50);
}
.products-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-8);
}
.service-card {
  position: relative;
  overflow: hidden;
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  padding: var(--space-8);
  cursor: pointer;
  transition: box-shadow var(--duration-normal), transform var(--duration-normal), border-color var(--duration-fast);
}
.service-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
  border-color: var(--color-primary-300);
}
/* 右上角灰色半透明编号 */
.service-no {
  position: absolute;
  top: var(--space-4);
  right: var(--space-5);
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  opacity: 0.08;
  line-height: 1;
  pointer-events: none;
  user-select: none;
}
.service-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  background: var(--color-primary-50);
  color: var(--color-primary-500);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-6);
}
.service-title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  line-height: var(--leading-snug);
  color: var(--color-text-primary);
  margin: 0 0 var(--space-4);
}
.service-desc {
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-6);
}
.service-cta {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-primary-600);
  transition: gap var(--duration-fast), color var(--duration-fast);
}
.service-card:hover .service-cta {
  gap: var(--space-3);
  color: var(--color-primary-700);
}
.service-cta-text {
  letter-spacing: 0.05em;
}

@media (min-width: 768px) {
  .products-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 639px) {
  .products-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
