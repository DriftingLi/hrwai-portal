<template>
  <article class="showcase-card" :data-model="model.slug">
    <div class="showcase-card-media">
      <img
        :src="model.preview"
        :alt="model.previewAlt"
        width="828"
        height="621"
        :loading="priority ? 'eager' : 'lazy'"
        :fetchpriority="priority ? 'high' : undefined"
        decoding="async"
      />
      <span class="showcase-card-category">{{ model.category }}</span>
      <span class="showcase-card-static">静态预览</span>
    </div>

    <div class="showcase-card-body">
      <h2 class="showcase-card-title">{{ model.name }}</h2>
      <p class="showcase-card-summary">{{ model.summary }}</p>

      <dl class="showcase-card-specs">
        <div v-for="spec in model.cardSpecs" :key="spec.label" class="showcase-card-spec">
          <dt>{{ spec.label }}</dt>
          <dd>{{ spec.value }}<span v-if="spec.unit"> {{ spec.unit }}</span></dd>
        </div>
      </dl>

      <NuxtLink
        :to="`/showcase/${model.slug}`"
        class="showcase-card-action"
        :aria-label="`在线预览 ${model.name}`"
        no-prefetch
      >
        <span>在线预览</span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </NuxtLink>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { ShowcaseModel } from '~/utils/showcase/models'

withDefaults(
  defineProps<{
    model: ShowcaseModel
    priority?: boolean
  }>(),
  { priority: false }
)
</script>

<style scoped>
.showcase-card {
  display: flex;
  flex: 0 1 380px;
  flex-direction: column;
  min-width: min(100%, 300px);
  max-width: 100%;
  overflow: hidden;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow:
    0 24px 50px -40px rgba(15, 23, 42, 0.42),
    var(--shadow-sm);
  transition:
    transform var(--duration-normal) var(--ease-default),
    box-shadow var(--duration-normal) var(--ease-default),
    border-color var(--duration-fast) var(--ease-default);
}

.showcase-card:hover {
  transform: translateY(-4px);
  border-color: var(--color-primary-300);
  box-shadow:
    0 30px 60px -38px rgba(15, 23, 42, 0.38),
    var(--shadow-lg);
}

.showcase-card-media {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: #eef3f8;
}

.showcase-card-media img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--duration-slow) var(--ease-default);
}

.showcase-card:hover .showcase-card-media img {
  transform: scale(1.035);
}

.showcase-card-category,
.showcase-card-static {
  position: absolute;
  top: 14px;
  z-index: 1;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: var(--font-semibold);
  line-height: 1.4;
  white-space: nowrap;
}

.showcase-card-category {
  left: 14px;
  color: #fff;
  background: var(--gradient-brand);
  box-shadow: var(--shadow-sm);
}

.showcase-card-static {
  right: 14px;
  color: #fff;
  letter-spacing: 0.04em;
  background: rgba(15, 23, 42, 0.68);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.16);
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .showcase-card-static {
    background: rgba(15, 23, 42, 0.9);
  }
}

.showcase-card-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 22px;
}

.showcase-card-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: var(--font-bold);
  line-height: 1.3;
  color: var(--color-text-primary);
}

.showcase-card-summary {
  display: -webkit-box;
  margin: 10px 0 0;
  overflow: hidden;
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--color-text-secondary);
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.showcase-card-specs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 18px 0 20px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}

.showcase-card-spec {
  min-width: 0;
}

.showcase-card-spec dt {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: var(--font-medium);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.showcase-card-spec dd {
  margin: 5px 0 0;
  font-family: var(--font-display);
  font-size: 12.5px;
  font-weight: var(--font-semibold);
  line-height: 1.35;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.showcase-card-spec dd span {
  margin-left: 2px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: var(--font-medium);
  color: var(--color-text-tertiary);
}

.showcase-card-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: auto;
  padding: 12px 16px;
  border-radius: 10px;
  background: var(--color-text-primary);
  color: #fff;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  line-height: 1.3;
  text-decoration: none;
  transition:
    background var(--duration-fast) var(--ease-default),
    box-shadow var(--duration-fast) var(--ease-default);
}

.showcase-card-action svg {
  flex: 0 0 auto;
  transition: transform var(--duration-fast) var(--ease-default);
}

.showcase-card-action:hover {
  background: var(--gradient-brand);
  box-shadow: var(--shadow-glow-brand);
}

.showcase-card-action:hover svg {
  transform: translateX(3px);
}

.showcase-card-action:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}

@media (max-width: 639px) {
  .showcase-card-body {
    padding: 20px;
  }
  .showcase-card-title {
    font-size: 22px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .showcase-card,
  .showcase-card-media img,
  .showcase-card-action,
  .showcase-card-action svg {
    transition: none;
  }
  .showcase-card:hover {
    transform: none;
  }
  .showcase-card:hover .showcase-card-media img {
    transform: none;
  }
}
</style>
