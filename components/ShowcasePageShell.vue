<template>
  <div class="showcase-page">
    <div class="showcase-backdrop" aria-hidden="true">
      <div class="showcase-backdrop-aurora" />
      <div class="showcase-backdrop-grid" />
    </div>

    <div class="container showcase-container">
      <slot />
    </div>
  </div>
</template>

<style scoped>
/* 列表页与详情页共用的页面外壳：背景、容器和顶栏留白保持一致。 */
.showcase-page {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
  padding: 104px 0 80px;
  background: linear-gradient(180deg, #ffffff 0%, #f6f9fc 64%, #f2f7fb 100%);
}

.showcase-container {
  position: relative;
  z-index: 1;
}

.showcase-backdrop {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.showcase-backdrop-aurora {
  position: absolute;
  top: -12%;
  left: 50%;
  width: min(960px, 94vw);
  height: 540px;
  transform: translateX(-50%);
  background: radial-gradient(
    ellipse at 50% 38%,
    rgba(14, 165, 233, 0.13) 0%,
    rgba(20, 184, 166, 0.07) 44%,
    transparent 72%
  );
}

.showcase-backdrop-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(148, 163, 184, 0.13) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(148, 163, 184, 0.13) 1px, transparent 1px);
  background-size: 44px 44px;
  -webkit-mask-image: radial-gradient(ellipse 62% 46% at 50% 26%, #000 18%, transparent 78%);
  mask-image: radial-gradient(ellipse 62% 46% at 50% 26%, #000 18%, transparent 78%);
  opacity: 0.55;
}

@media (max-width: 1023px) {
  .showcase-page {
    padding-top: 92px;
  }
}

@media (max-width: 639px) {
  .showcase-page {
    padding: 84px 0 56px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .showcase-backdrop-grid {
    opacity: 0.3;
  }
}
</style>
