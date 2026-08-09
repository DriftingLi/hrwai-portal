<template>
  <div class="error-page">
    <div class="container">
      <div class="error-card">
        <div class="error-code">{{ error?.statusCode || '错误' }}</div>
        <h1 class="error-title">
          {{ error?.statusCode === 404 ? '页面不存在' : '服务暂时不可用' }}
        </h1>
        <p class="error-desc">
          {{
            error?.statusCode === 404
              ? '您访问的内容不存在或已下架，请返回首页继续浏览。'
              : '服务器开小差了，请稍后重试。'
          }}
        </p>
        <div class="error-actions">
          <NuxtLink to="/" class="btn-home">返回首页</NuxtLink>
          <NuxtLink to="/news" class="btn-news">浏览内容精选</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ error?: { statusCode?: number | string } | null }>()
</script>

<style scoped>
.error-page {
  min-height: 100vh;
  background: var(--color-bg-page);
  padding: 160px var(--space-6) 80px;
}
.container {
  max-width: var(--container-narrow);
  margin: 0 auto;
}
.error-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  padding: var(--space-16) var(--space-10);
  text-align: center;
}
.error-code {
  font-family: var(--font-display);
  font-size: 72px;
  font-weight: var(--font-bold);
  line-height: 1;
  background: var(--gradient-brand);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin-bottom: var(--space-6);
}
.error-title {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin: 0 0 var(--space-4);
}
.error-desc {
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-10);
}
.error-actions {
  display: flex;
  gap: var(--space-4);
  justify-content: center;
  flex-wrap: wrap;
}
.btn-home {
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
  transition: opacity var(--duration-fast);
}
.btn-home:hover {
  opacity: 0.9;
}
.btn-news {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 12px 32px;
  background: transparent;
  color: var(--color-primary-600);
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  border-radius: var(--radius-md);
  text-decoration: none;
  border: 2px solid var(--color-primary-500);
  transition: background var(--duration-fast);
}
.btn-news:hover {
  background: var(--color-primary-50);
}
</style>
