<template>
  <section id="hero" ref="heroSectionRef" class="hero" @mousemove="onHeroMouseMove">
    <img src="/images/hero-bg.webp" alt="" class="hero-bg" fetchpriority="high" />
    <!-- 极光光斑层：SSR 静态兜底 + 桌面端鼠标视差 -->
    <div class="hero-aurora" :style="auroraStyle" aria-hidden="true">
      <div class="aurora-blob aurora-blob--1"></div>
      <div class="aurora-blob aurora-blob--2"></div>
      <div class="aurora-blob aurora-blob--3"></div>
    </div>
    <div class="hero-grid bg-grid" aria-hidden="true"></div>
    <ClientOnly>
      <HeroCanvas />
    </ClientOnly>
    <div class="hero-overlay" aria-hidden="true"></div>
    <div class="hero-content">
      <!-- 入场 stagger 为纯 CSS 动画：随首帧 paint 立即播放，不等待 JS 水合 -->
      <span class="hero-badge hero-in hero-in--1">AI × 叉车全生命周期</span>
      <h1 class="hero-title hero-in hero-in--2">
        和润天下 <span class="text-gradient">HRWAI</span>
      </h1>
      <p class="hero-subtitle hero-in hero-in--3">
        和润天下人工智能科技有限公司 —— 深耕工程车辆垂直领域，以 AI
        驱动叉车全生命周期智能化升级。
      </p>
      <div class="hero-cta hero-in hero-in--4">
        <a href="#about" class="btn-primary" @click.prevent="scrollToId('about')">了解我们</a>
        <a href="#products" class="btn-outline" @click.prevent="scrollToId('products')">核心服务</a>
      </div>
    </div>
    <!-- 向下探索指示器 -->
    <div class="hero-scroll-hint hero-in hero-in--5" aria-hidden="true">
      <div class="mouse-icon"><span class="mouse-wheel"></span></div>
      <span class="hero-scroll-text">向下探索</span>
    </div>
    <!-- 底部渐隐：深色 Hero 无缝过渡到浅色内容区 -->
    <div class="hero-fade" aria-hidden="true"></div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { scrollToId } from '~/utils/scroll'
import { prefersReducedMotion } from '~/utils/motion'
import { useInViewport } from '~/composables/useInViewport'

/* ---------- Hero 极光层鼠标视差（仅桌面精准指针 + 未开启减少动画） ---------- */
const heroSectionRef = ref<HTMLElement | null>(null)
const { isActive: heroVisible } = useInViewport(heroSectionRef)
const auroraStyle = ref<Record<string, string>>({})
let parallaxRaf = 0
let parallaxTargetX = 0
let parallaxTargetY = 0
let parallaxX = 0
let parallaxY = 0
let parallaxEnabled = false

function onHeroMouseMove(e: MouseEvent) {
  if (!parallaxEnabled) return
  parallaxTargetX = (e.clientX / window.innerWidth - 0.5) * 40 // ±20px
  parallaxTargetY = (e.clientY / window.innerHeight - 0.5) * 40
}

function parallaxLoop() {
  // lerp 缓动：光斑层以 6% 步长追随目标，避免生硬跳变
  parallaxX += (parallaxTargetX - parallaxX) * 0.06
  parallaxY += (parallaxTargetY - parallaxY) * 0.06
  auroraStyle.value = {
    transform: `translate3d(${parallaxX.toFixed(2)}px, ${parallaxY.toFixed(2)}px, 0)`
  }
  parallaxRaf = requestAnimationFrame(parallaxLoop)
}

// 离屏停帧、回屏恢复
watch(heroVisible, (visible) => {
  if (!parallaxEnabled) return
  cancelAnimationFrame(parallaxRaf)
  if (visible) parallaxRaf = requestAnimationFrame(parallaxLoop)
})

onMounted(() => {
  parallaxEnabled =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: fine)').matches &&
    !prefersReducedMotion()
  if (parallaxEnabled) {
    parallaxRaf = requestAnimationFrame(parallaxLoop)
  }
})

onBeforeUnmount(() => {
  cancelAnimationFrame(parallaxRaf)
})
</script>

<style scoped>
.hero {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--surface-hero);
}
.hero-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.16;
  filter: saturate(0.55);
}
/* 极光光斑层：品牌色 radial 光斑缓慢漂移（SSR 静态兜底 + 桌面端鼠标视差） */
.hero-aurora {
  position: absolute;
  inset: -8%;
  will-change: transform;
}
.aurora-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
}
.aurora-blob--1 {
  width: 46vw;
  height: 46vw;
  left: -8%;
  top: -12%;
  background: radial-gradient(circle, rgba(14, 165, 233, 0.4) 0%, transparent 65%);
  animation: auroraDrift 16s var(--ease-default) infinite alternate;
}
.aurora-blob--2 {
  width: 40vw;
  height: 40vw;
  right: -6%;
  top: 8%;
  background: radial-gradient(circle, rgba(20, 184, 166, 0.34) 0%, transparent 65%);
  animation: auroraDrift 20s var(--ease-default) infinite alternate-reverse;
}
.aurora-blob--3 {
  width: 34vw;
  height: 34vw;
  left: 32%;
  bottom: -16%;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.22) 0%, transparent 65%);
  animation: auroraDrift 24s var(--ease-default) infinite alternate;
}
@keyframes auroraDrift {
  from { transform: translate3d(0, 0, 0) scale(1); }
  to { transform: translate3d(4%, 6%, 0) scale(1.08); }
}
/* 网格纹理：径向遮罩让边缘自然淡出 */
.hero-grid {
  position: absolute;
  inset: 0;
  -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 42%, #000 25%, transparent 78%);
  mask-image: radial-gradient(ellipse 70% 60% at 50% 42%, #000 25%, transparent 78%);
}
.hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    180deg,
    rgba(11, 17, 32, 0.5) 0%,
    rgba(11, 17, 32, 0.2) 40%,
    rgba(11, 17, 32, 0.62) 100%
  );
}
.hero-content {
  position: relative;
  z-index: 1;
  max-width: var(--container-page);
  margin: 0 auto;
  padding: var(--space-32) var(--space-6) var(--space-16);
  text-align: center;
}
.hero-badge {
  display: inline-flex;
  align-items: center;
  padding: var(--space-2) var(--space-5);
  border-radius: var(--radius-full);
  background: var(--glass-bg-dark);
  -webkit-backdrop-filter: blur(var(--blur-glass));
  backdrop-filter: blur(var(--blur-glass));
  border: 1px solid var(--glass-border-dark);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-primary-200);
  letter-spacing: 0.08em;
  margin-bottom: var(--space-8);
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .hero-badge {
    background: rgba(15, 23, 42, 0.92);
  }
}
.hero-title {
  font-family: var(--font-display);
  font-size: clamp(2.75rem, 6.5vw, 5rem);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
  letter-spacing: -0.025em;
  color: #fff;
  margin: 0 auto var(--space-8);
  max-width: 860px;
  word-break: keep-all;
  overflow-wrap: break-word;
}
.hero-subtitle {
  font-size: clamp(var(--text-base), 2vw, var(--text-lg));
  line-height: var(--leading-relaxed);
  color: rgba(226, 232, 240, 0.88);
  max-width: 640px;
  margin: 0 auto var(--space-12);
}
.hero-cta {
  display: flex;
  gap: var(--space-4);
  justify-content: center;
  flex-wrap: wrap;
}
/* 入场 stagger：纯 CSS 动画，随首帧 paint 立即播放，不依赖 JS 水合 */
.hero-in {
  animation: heroIn 0.55s var(--ease-out) both;
}
.hero-in--1 { animation-delay: 0s; }
.hero-in--2 { animation-delay: 0.12s; }
.hero-in--3 { animation-delay: 0.24s; }
.hero-in--4 { animation-delay: 0.36s; }
.hero-in--5 { animation-duration: 0.6s; animation-delay: 0.9s; }
@keyframes heroIn {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 12px 32px;
  background: var(--gradient-brand);
  color: #fff;
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  border-radius: var(--radius-md);
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: opacity var(--duration-fast), transform var(--duration-fast);
}
.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
.btn-outline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 12px 32px;
  background: transparent;
  color: #fff;
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  border-radius: var(--radius-md);
  text-decoration: none;
  border: 2px solid rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: border-color var(--duration-fast), background var(--duration-fast);
}
.btn-outline:hover {
  border-color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.1);
}
/* 向下探索指示器 */
.hero-scroll-hint {
  position: absolute;
  left: 50%;
  bottom: 72px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  z-index: 1;
}
.mouse-icon {
  width: 24px;
  height: 38px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-radius: var(--radius-full);
  display: flex;
  justify-content: center;
  padding-top: 7px;
}
.mouse-wheel {
  width: 3px;
  height: 8px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.75);
  animation: scrollWheel 1.8s var(--ease-default) infinite;
}
@keyframes scrollWheel {
  0% { opacity: 1; transform: translateY(0); }
  65% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 0; transform: translateY(0); }
}
.hero-scroll-text {
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.55);
  letter-spacing: 0.2em;
}
/* 底部渐隐：深色 Hero 无缝过渡到浅色内容区 */
.hero-fade {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 120px;
  background: linear-gradient(to bottom, transparent 0%, var(--color-bg-card) 100%);
  pointer-events: none;
}

@media (max-width: 639px) {
  .hero-content {
    padding: var(--space-32) var(--space-4) var(--space-12);
  }
  /* 移动端降低光斑模糊开销、收紧指示器位置 */
  .aurora-blob {
    filter: blur(48px);
  }
  .hero-scroll-hint {
    bottom: 20px;
  }
  .hero-fade {
    height: 80px;
  }
  .hero-cta {
    flex-direction: column;
    align-items: stretch;
  }
  .hero-cta .btn-primary,
  .hero-cta .btn-outline {
    width: 100%;
  }
}
</style>
