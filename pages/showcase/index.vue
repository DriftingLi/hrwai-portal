<template>
  <ShowcasePageShell>
    <ShowcaseIntro
      eyebrow="3D Product Showcase"
      title="防爆车型"
      accent="三维展台"
      subtitle="按实车比例构建的车型三维模型库。先通过卡片了解车型与关键参数，点击「在线预览」进入可交互展台。"
    />

    <section class="showcase-list" aria-label="车型列表" v-reveal="80">
      <div class="showcase-model-grid">
        <ShowcaseModelCard
          v-for="(model, index) in SHOWCASE_MODELS"
          :key="model.slug"
          :model="model"
          :priority="index === 0"
        />
      </div>

      <p class="showcase-more">
        <span class="showcase-more-dot" aria-hidden="true" />
        更多车型正在接入，展台将随车型库持续扩充
      </p>
    </section>
  </ShowcasePageShell>
</template>

<script setup lang="ts">
import { useSiteLinks } from '~/composables/useSiteLinks'
import { SHOWCASE_MODELS } from '~/utils/showcase/models'

const { site } = useSiteLinks()
const firstModel = SHOWCASE_MODELS[0]
const ogImage = firstModel?.preview ?? '/images/hero-bg.webp'

useSeoMeta({
  title: '防爆车型三维展台',
  description:
    '和润天下防爆车型三维展台：以静态车型卡片快速了解核心参数，点击在线预览进入可交互 3D 展台，按实车比例查看车身、门架与结构细节。',
  ogTitle: '防爆车型三维展台',
  ogDescription:
    '按实车比例构建的防爆车型三维模型库，先从静态卡片了解车型，再进入可交互 3D 展台查看细节。',
  ogType: 'website',
  ogUrl: site('/showcase'),
  ogImage: site(ogImage),
  ogImageAlt: firstModel?.previewAlt ?? '防爆车型三维展台',
  twitterCard: 'summary_large_image',
  twitterTitle: '防爆车型三维展台'
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
    } as any,
    {
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: '防爆车型三维展台',
        url: site('/showcase'),
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: SHOWCASE_MODELS.map((model, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: `${model.code} ${model.name}`,
            url: site(`/showcase/${model.slug}`)
          }))
        }
      }),
      type: 'application/ld+json'
    } as any
  ]
})
</script>

<style scoped>
.showcase-list {
  margin: 0;
}

/* 卡片数量变化时保持居中：一辆车时是单张卡片，后续加车会自然排成一行。 */
.showcase-model-grid {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  justify-content: center;
  gap: 28px;
}

.showcase-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 32px auto 0;
  font-size: var(--text-xs);
  line-height: var(--leading-normal);
  text-align: center;
  color: var(--color-text-muted);
}

.showcase-more-dot {
  width: 5px;
  height: 5px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--gradient-brand);
}

@media (max-width: 639px) {
  .showcase-model-grid {
    gap: 20px;
  }
  .showcase-more {
    margin-top: 26px;
    font-size: 11px;
  }
}
</style>
