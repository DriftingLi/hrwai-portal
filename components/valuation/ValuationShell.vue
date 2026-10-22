<template>
  <div class="valuation-page">
    <div class="valuation-container">
      <!-- 估值子导航：整机 / 电池 / 历史 + 登录态 -->
      <nav class="valuation-subnav" aria-label="残值评估导航">
        <NuxtLink to="/valuation" class="subnav-link" :class="{ active: active === 'whole' }">
          整机残值评估
        </NuxtLink>
        <NuxtLink to="/valuation/battery" class="subnav-link" :class="{ active: active === 'battery' }">
          电池 RUL 评估
        </NuxtLink>
        <NuxtLink to="/valuation/history" class="subnav-link" :class="{ active: active === 'history' }">
          评估历史
        </NuxtLink>
        <span class="subnav-spacer" aria-hidden="true"></span>
        <template v-if="user">
          <span class="subnav-user" :title="user.account">{{ displayName }}</span>
          <button type="button" class="subnav-action" :disabled="loggingOut" @click="handleLogout">
            退出
          </button>
        </template>
        <NuxtLink v-else to="/valuation/login" class="subnav-action">登录</NuxtLink>
      </nav>

      <header class="valuation-head">
        <p class="valuation-eyebrow">叉车残值评估 · HRWAI Valuation</p>
        <h1 class="valuation-title">{{ title }}</h1>
        <p v-if="subtitle" class="valuation-subtitle">{{ subtitle }}</p>
      </header>

      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useValuationApi } from '~/composables/useValuationApi'
import { useValuationHead } from '~/composables/useValuationHead'
import { useValuationSession, VALUATION_SESSION_KEY } from '~/composables/useValuationSession'

const props = withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    /** 当前子导航项（whole / battery / history）；不给则都不高亮 */
    active?: 'whole' | 'battery' | 'history' | ''
  }>(),
  { subtitle: '', active: '' }
)

// /valuation/** 一律 noindex（页面 meta + nuxt.config 的 X-Robots-Tag 两层）
useValuationHead({ title: props.title })

const api = useValuationApi()
const { user } = useValuationSession()

const displayName = computed(() => user.value?.username || user.value?.account || '')
const loggingOut = ref(false)

async function handleLogout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await api.logout()
  } catch {
    // 上游吊销失败不阻断本地登出（服务端也只在日志里留痕）
  } finally {
    loggingOut.value = false
    clearNuxtData(VALUATION_SESSION_KEY)
    await navigateTo('/valuation')
  }
}
</script>

<style scoped>
.valuation-page {
  background: var(--color-bg-page);
  padding: 120px 0 80px;
  min-height: 100vh;
  min-height: 100dvh;
}
.valuation-container {
  max-width: var(--container-page);
  margin: 0 auto;
  padding: 0 var(--space-6);
}

/* 子导航 */
.valuation-subnav {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  padding: var(--space-2);
  margin-bottom: var(--space-6);
  box-shadow: var(--shadow-xs);
}
.subnav-link {
  padding: 8px 16px;
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: background var(--duration-fast), color var(--duration-fast);
}
.subnav-link:hover {
  background: var(--color-primary-50);
  color: var(--color-primary-700);
}
.subnav-link.active {
  background: var(--gradient-brand);
  color: #fff;
}
.subnav-spacer {
  flex: 1;
}
.subnav-user {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.subnav-action {
  min-height: 34px;
  padding: 6px 16px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: #fff;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-family: inherit;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  transition: border-color var(--duration-fast), color var(--duration-fast);
}
.subnav-action:hover {
  border-color: var(--color-primary-400);
  color: var(--color-primary-600);
}
.subnav-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 页头 */
.valuation-head {
  margin-bottom: var(--space-8);
}
.valuation-eyebrow {
  margin: 0 0 var(--space-2);
  font-size: var(--text-xs);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-primary-600);
  font-family: var(--font-mono);
}
.valuation-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  line-height: var(--leading-tight);
}
.valuation-subtitle {
  margin: var(--space-3) 0 0;
  font-size: var(--text-base);
  color: var(--color-text-tertiary);
  max-width: 720px;
  line-height: var(--leading-relaxed);
}

@media (max-width: 767px) {
  .valuation-page {
    padding: 92px 0 56px;
  }
  .valuation-container {
    padding: 0 var(--space-4);
  }
  .valuation-title {
    font-size: var(--text-2xl);
  }
}
</style>
