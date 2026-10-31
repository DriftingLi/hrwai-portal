<template>
  <ShowcasePageShell>
    <div class="showcase-detail-top">
      <NuxtLink to="/showcase" class="showcase-back">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        全部车型
      </NuxtLink>
    </div>

    <ShowcaseIntro
      eyebrow="3D Product Showcase"
      :title="model.shortName"
      accent="三维展台"
      :subtitle="model.description"
    />

    <section class="showcase-stage" :aria-label="`${model.name}三维交互模型`">
      <ForkliftViewer v-if="model.viewer === 'forklift'" />
      <p v-else class="showcase-stage-fallback">该车型的三维展台正在接入。</p>
    </section>

    <dl class="showcase-specs" v-reveal="120">
      <div v-for="spec in model.detailSpecs" :key="spec.label" class="showcase-spec">
        <dt>{{ spec.label }}</dt>
        <dd>{{ spec.value }} <span v-if="spec.unit">{{ spec.unit }}</span></dd>
      </div>
    </dl>

    <p class="showcase-note" v-reveal="160">
      模型依据参考图按比例重构，尺寸为外观示意值，不作为工程设计依据。
      光源、阴影与地面纹理均为实时渲染。
    </p>
  </ShowcasePageShell>
</template>

<script setup lang="ts">
import { useSiteLinks } from '~/composables/useSiteLinks'
import { findShowcaseModel } from '~/utils/showcase/models'

const route = useRoute()
const found = findShowcaseModel(route.params.slug)
if (!found) {
  throw createError({ statusCode: 404, statusMessage: '车型不存在' })
}
const model = found
const { site } = useSiteLinks()

useSeoMeta({
  title: model.seoTitle,
  description: model.seoDescription,
  ogTitle: model.seoTitle,
  ogDescription: model.description,
  ogType: 'website',
  ogUrl: site(`/showcase/${model.slug}`),
  ogImage: site(model.preview),
  ogImageAlt: model.previewAlt,
  twitterCard: 'summary_large_image',
  twitterTitle: model.seoTitle
})

useHead({
  link: [{ rel: 'canonical', href: site(`/showcase/${model.slug}`) }],
  script: [
    {
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '首页', item: site('/') },
          { '@type': 'ListItem', position: 2, name: '三维展台', item: site('/showcase') },
          {
            '@type': 'ListItem',
            position: 3,
            name: model.name,
            item: site(`/showcase/${model.slug}`)
          }
        ]
      }),
      type: 'application/ld+json'
    } as any
  ]
})
</script>

<style scoped>
.showcase-detail-top {
  display: flex;
  align-items: center;
  max-width: 780px;
  min-height: 26px;
  margin: 0 auto 14px;
}

.showcase-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: var(--font-medium);
  line-height: 1.4;
  color: var(--color-text-tertiary);
  text-decoration: none;
  transition: color var(--duration-fast) var(--ease-default);
}

.showcase-back:hover {
  color: var(--color-primary-700);
}

.showcase-back:focus-visible {
  border-radius: var(--radius-sm);
  outline: 2px solid var(--color-primary-500);
  outline-offset: 3px;
}

.showcase-stage {
  position: relative;
  height: clamp(460px, 62vh, 700px);
}

.showcase-stage-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  margin: 0;
  border: 1px dashed var(--color-border-dark);
  border-radius: var(--radius-xl);
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  background: rgba(255, 255, 255, 0.6);
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
</style>
