<template>
  <section id="showcase" class="section showcase">
    <div class="showcase-glow" aria-hidden="true" />
    <div class="showcase-grid" aria-hidden="true" />

    <div class="container">
      <div class="section-title-wrap showcase-head" v-reveal>
        <p class="showcase-eyebrow">
          <span class="showcase-eyebrow-line" />
          3D PRODUCT SHOWCASE
        </p>
        <h2 class="section-title">
          防爆叉车 · 三维展台<span class="title-underline" />
        </h2>
        <p class="section-subtitle">
          1.5 吨防爆蓄电池叉车，按实车比例程序化建模。拖拽旋转或切换预设视角，
          从各个方向核验车身曲面、轴距与门架结构。
        </p>
      </div>

      <div ref="stageRef" class="showcase-stage" v-reveal.zoom>
        <LazyForkliftViewer v-if="shouldMount" />
        <div v-else class="showcase-skeleton" aria-hidden="true">
          <span class="showcase-skeleton-badge">3D</span>
          <span class="showcase-skeleton-text">展台准备中</span>
        </div>
      </div>

      <dl class="showcase-specs" v-reveal="120">
        <div class="showcase-spec">
          <dt>整车尺寸（长 × 宽，含货叉）</dt>
          <dd>3,720 × 1,250 <span>mm</span></dd>
        </div>
        <div class="showcase-spec">
          <dt>护顶架高 / 轴距</dt>
          <dd>2,140 / 1,500 <span>mm</span></dd>
        </div>
        <div class="showcase-spec">
          <dt>额定载荷</dt>
          <dd>1,500 <span>kg</span></dd>
        </div>
        <div class="showcase-spec">
          <dt>防爆标志</dt>
          <dd>Ex d IIB T4 Gb</dd>
        </div>
      </dl>

      <p class="showcase-note" v-reveal="160">
        模型依据参考图按比例重构，尺寸为外观示意值，不作为工程设计依据。
        光源、阴影与地面纹理均为实时渲染。
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * 首页 3D 展台区块。
 *
 * 懒加载策略分两层：
 * 1. 组件层：距视口 480px 时才挂载 <LazyForkliftViewer>（Nuxt 异步组件分块）；
 * 2. 场景层：ForkliftViewer 挂载后才动态 import three + 模型代码。
 * 首屏只承担占位块，不加载 three.js 体积。
 */
const stageRef = ref<HTMLElement | null>(null)
const shouldMount = ref(false)

let observer: IntersectionObserver | null = null

onMounted(() => {
  const el = stageRef.value
  if (!el) return

  if (typeof IntersectionObserver === 'undefined') {
    shouldMount.value = true
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        shouldMount.value = true
        observer?.disconnect()
        observer = null
      }
    },
    { rootMargin: '480px 0px' }
  )
  observer.observe(el)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>

<style scoped>
.showcase {
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #ffffff 0%, #f6f9fc 62%, #f3f7fb 100%);
  padding-top: calc(var(--section-padding) * 0.82);
}

.showcase-glow {
  position: absolute;
  top: -12%;
  left: 50%;
  width: min(920px, 92vw);
  height: 520px;
  transform: translateX(-50%);
  background: radial-gradient(
    ellipse at 50% 40%,
    rgba(14, 165, 233, 0.12) 0%,
    rgba(20, 184, 166, 0.07) 42%,
    transparent 70%
  );
  pointer-events: none;
  z-index: 0;
}

.showcase-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(148, 163, 184, 0.13) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(148, 163, 184, 0.13) 1px, transparent 1px);
  background-size: 44px 44px;
  -webkit-mask-image: radial-gradient(ellipse 62% 46% at 50% 30%, #000 18%, transparent 76%);
  mask-image: radial-gradient(ellipse 62% 46% at 50% 30%, #000 18%, transparent 76%);
  opacity: 0.55;
  pointer-events: none;
  z-index: 0;
}

.container {
  position: relative;
  z-index: 1;
}

.showcase-head {
  margin-bottom: 40px;
}

.showcase-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 16px;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--color-primary-700);
}

.showcase-eyebrow-line {
  width: 28px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-primary-500));
}

.showcase-head .section-title {
  font-size: clamp(1.75rem, 3.2vw, 2.5rem);
}

.showcase-head .section-subtitle {
  max-width: 680px;
  margin-left: auto;
  margin-right: auto;
}

.showcase-stage {
  position: relative;
  height: clamp(430px, 52vw, 660px);
}

.showcase-skeleton {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100%;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: var(--radius-xl);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.65), rgba(236, 242, 248, 0.9)),
    repeating-linear-gradient(
      90deg,
      rgba(148, 163, 184, 0.12) 0 1px,
      transparent 1px 44px
    ),
    repeating-linear-gradient(
      0deg,
      rgba(148, 163, 184, 0.12) 0 1px,
      transparent 1px 44px
    );
  color: var(--color-text-muted);
}

.showcase-skeleton-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border: 1px solid var(--color-primary-200);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.8);
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  letter-spacing: 0.04em;
  color: var(--color-primary-500);
}

.showcase-skeleton-text {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.16em;
  color: var(--color-text-muted);
}

.showcase-specs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 34px 0 0;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.showcase-spec {
  padding: 18px 22px;
}

.showcase-spec + .showcase-spec {
  border-left: 1px solid var(--color-border);
}

.showcase-spec dt {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.showcase-spec dd {
  margin: 7px 0 0;
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: var(--font-semibold);
  line-height: 1.35;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.showcase-spec dd span {
  margin-left: 3px;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-tertiary);
}

.showcase-note {
  max-width: 720px;
  margin: 18px auto 0;
  text-align: center;
  font-size: var(--text-xs);
  line-height: var(--leading-relaxed);
  color: var(--color-text-muted);
}

@media (max-width: 860px) {
  .showcase-specs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .showcase-spec {
    padding: 15px 16px;
  }
  .showcase-spec + .showcase-spec {
    border-left: 0;
  }
  .showcase-spec:nth-child(even) {
    border-left: 1px solid var(--color-border);
  }
  .showcase-spec:nth-child(n + 3) {
    border-top: 1px solid var(--color-border);
  }
}

@media (max-width: 639px) {
  .showcase {
    padding-top: var(--section-padding-mobile);
  }
  .showcase-stage {
    height: clamp(380px, 110vw, 440px);
  }
  .showcase-head {
    margin-bottom: 28px;
  }
  .showcase-spec dd {
    font-size: 15px;
  }
  .showcase-spec {
    padding: 13px 14px;
  }
  .showcase-note {
    margin-top: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .showcase-grid {
    opacity: 0.3;
  }
}
</style>
