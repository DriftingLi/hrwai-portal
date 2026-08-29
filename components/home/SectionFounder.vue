<template>
  <section class="section founder has-texture has-texture-dark has-fade" style="--next-bg: var(--color-primary-50)">
    <div class="dark-aurora" aria-hidden="true"><div class="dark-aurora__blob"></div></div>
    <div class="section-fade" aria-hidden="true"></div>
    <div class="container narrow">
      <div class="founder-avatar" v-reveal.zoom>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <h3 class="founder-title" v-reveal="100">创始人介绍</h3>
      <p class="founder-name" v-reveal="200">刘永桂 · 和润天下创始人 &amp; 董事长</p>
      <div class="founder-quote-wrap" v-reveal="300">
        <svg class="quote-mark" width="60" height="48" viewBox="0 0 60 48" fill="none">
          <path d="M2 36C2 26 8 20 18 18L16 2L2 36ZM34 36C34 26 40 20 50 18L48 2L34 36Z" fill="#fff" opacity="0.15"/>
        </svg>
        <blockquote class="founder-quote">
          华南理工大学教授、博导，国家及省市级项目评审咨询专家，曾挂职江门市工信局副局长。深耕工业互联网与产业数字化转型领域，发表学术论文八十余篇，获专利及软著六十余项，主持国家级等各类项目二十余项。牵头研发多款智能监测系统与产业互联网平台并落地应用，创办多家企业并任董事长，带领硕博团队深耕产学研融合与科研成果产业化。
        </blockquote>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// 创始人介绍板块
</script>

<style scoped>
.founder {
  background: var(--surface-dark);
  text-align: center;
  color: var(--color-text-on-dark);
}
.founder-avatar {
  width: 100px;
  height: 100px;
  border-radius: var(--radius-full);
  background: var(--gradient-brand);
  margin: 0 auto var(--space-8);
  display: flex;
  align-items: center;
  justify-content: center;
}
.founder-title {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  color: var(--color-primary-200);
  margin: 0 0 var(--space-2);
}
.founder-name {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  margin: 0 0 var(--space-10);
}
.founder-quote-wrap {
  position: relative;
}
.quote-mark {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0.15;
}
.founder-quote {
  font-size: var(--text-lg);
  line-height: var(--leading-relaxed);
  color: var(--color-text-on-dark);
  margin: 0;
  padding: var(--space-8) 0;
}
</style>
