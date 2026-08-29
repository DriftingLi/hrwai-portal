<template>
  <section class="cta-banner bg-noise">
    <div class="cta-aurora" aria-hidden="true">
      <div class="cta-blob cta-blob--1"></div>
      <div class="cta-blob cta-blob--2"></div>
    </div>
    <div class="container narrow cta-content">
      <h2 class="cta-title" v-reveal>准备好开启AI驱动的叉车之旅了吗？</h2>
      <p class="cta-subtitle" v-reveal="100">加入和润天下，获取一整套成熟的叉车行业AI解决方案。</p>
      <div class="cta-actions" v-reveal="200">
        <a href="#footer" class="btn-cta" @click.prevent="scrollToId('footer')">联系我们</a>
        <a href="#products" class="btn-cta-ghost" @click.prevent="scrollToId('products')">了解服务</a>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { scrollToId } from '~/utils/scroll'
</script>

<style scoped>
.cta-banner {
  position: relative;
  overflow: hidden;
  background: var(--gradient-cta-banner);
  padding: var(--space-20) var(--space-6);
}
.cta-aurora {
  position: absolute;
  inset: -30%;
  pointer-events: none;
}
.cta-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
}
.cta-blob--1 {
  width: 40vw;
  height: 40vw;
  left: -5%;
  top: -30%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.22) 0%, transparent 65%);
  animation: auroraDrift 18s var(--ease-default) infinite alternate;
}
.cta-blob--2 {
  width: 36vw;
  height: 36vw;
  right: -5%;
  bottom: -40%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.16) 0%, transparent 65%);
  animation: auroraDrift 22s var(--ease-default) infinite alternate-reverse;
}
.cta-content {
  position: relative;
  z-index: 1;
  text-align: center;
}
.cta-title {
  font-family: var(--font-display);
  font-size: clamp(var(--text-2xl), 4vw, var(--text-4xl));
  font-weight: var(--font-bold);
  line-height: var(--leading-snug);
  color: #fff;
  margin: 0 0 var(--space-6);
  word-break: keep-all;
  overflow-wrap: break-word;
}
.cta-subtitle {
  font-size: var(--text-lg);
  line-height: var(--leading-relaxed);
  color: rgba(255, 255, 255, 0.9);
  max-width: 560px;
  margin: 0 auto var(--space-10);
}
.cta-actions {
  display: flex;
  gap: var(--space-4);
  justify-content: center;
  flex-wrap: wrap;
}
.btn-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 12px 32px;
  border: 2px solid #fff;
  color: #fff;
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  border-radius: var(--radius-md);
  text-decoration: none;
  transition: background var(--duration-fast);
}
.btn-cta:hover {
  background: rgba(255, 255, 255, 0.15);
}
.btn-cta-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 12px 32px;
  background: rgba(255, 255, 255, 0.12);
  -webkit-backdrop-filter: blur(var(--blur-glass));
  backdrop-filter: blur(var(--blur-glass));
  border: 1px solid rgba(255, 255, 255, 0.45);
  color: #fff;
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  border-radius: var(--radius-md);
  text-decoration: none;
  transition: background var(--duration-fast), border-color var(--duration-fast);
}
.btn-cta-ghost:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.7);
}
@media (prefers-reduced-motion: reduce) {
  .cta-blob {
    animation: none !important;
  }
}
</style>
