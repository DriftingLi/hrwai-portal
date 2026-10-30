<template>
  <div class="showcase-page">
    <div class="showcase-backdrop" aria-hidden="true">
      <div class="showcase-aurora" />
      <div class="showcase-grid" />
    </div>

    <div class="container showcase-container">
      <header class="showcase-header" v-reveal>
        <p class="showcase-eyebrow">
          <span class="showcase-eyebrow-line" aria-hidden="true" />
          3D Product Showcase
        </p>
        <h1 class="showcase-title">
          防爆叉车 <span class="showcase-title-dot" aria-hidden="true">·</span> 三维展台
        </h1>
        <p class="showcase-subtitle">
          1.5 吨防爆蓄电池叉车，按实车比例程序化建模。拖拽旋转或切换预设视角，
          从各个方向核验车身曲面、轴距与门架结构。
        </p>
      </header>

      <section class="showcase-stage" aria-label="防爆叉车三维交互模型">
        <ForkliftViewer />
      </section>

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
  </div>
</template>

<script setup lang="ts">
import { useSiteLinks } from '~/composables/useSiteLinks'

const { site } = useSiteLinks()

useSeoMeta({
  title: '防爆叉车三维展台',
  description:
    '1.5 吨防爆蓄电池叉车三维互动展台：按实车比例程序化建模，支持任意旋转、缩放与正面、侧面、前后 3/4、车尾等预设视角，用于核验车身比例与门架结构。',
  ogTitle: '防爆叉车三维展台',
  ogDescription:
    '1.5 吨防爆蓄电池叉车三维互动展台，支持多视角查看车身曲面、轴距与门架结构。',
  ogType: 'website',
  ogUrl: site('/showcase'),
  ogImage: site('/images/hero-bg.webp'),
  twitterCard: 'summary_large_image',
  twitterTitle: '防爆叉车三维展台'
})

useHead({
  link: [{ rel: 'canonical', href: site('/showcase') }],
  script: [
    {
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '首页', item: site('/') },
          { '@type': 'ListItem', position: 2, name: '三维展台', item: site('/showcase') }
        ]
      }),
      type: 'application/ld+json'
    } as any
  ]
})
</script>

<style scoped>
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

.showcase-aurora {
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

.showcase-grid {
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
}

.showcase-stage {
  position: relative;
  height: clamp(460px, 62vh, 700px);
}

.showcase-specs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 32px 0 0;
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
  font-weight: var(--font-medium);
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
  font-weight: var(--font-medium);
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

@media (max-width: 1023px) {
  .showcase-page {
    padding-top: 92px;
  }
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
  .showcase-page {
    padding: 84px 0 56px;
  }
  .showcase-header {
    margin-bottom: 24px;
  }
  .showcase-title {
    font-size: clamp(1.75rem, 8.4vw, 2.4rem);
  }
  .showcase-subtitle {
    font-size: var(--text-sm);
  }
  .showcase-stage {
    height: clamp(400px, 56vh, 480px);
  }
  .showcase-spec {
    padding: 13px 14px;
  }
  .showcase-spec dd {
    font-size: 15px;
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
