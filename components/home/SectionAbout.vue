<template>
  <section id="about" class="section about has-texture has-texture-light has-fade" style="--next-bg: var(--surface-dark)">
    <div class="light-aurora" aria-hidden="true"><div class="light-aurora__blob"></div></div>
    <div class="section-fade" aria-hidden="true"></div>
    <div class="container">
      <div class="section-title-wrap" v-reveal>
        <h2 class="section-title">公司介绍<span class="title-underline"></span></h2>
        <p class="section-subtitle">深耕叉车行业，以AI技术驱动产业智能化升级</p>
      </div>
      <div class="about-grid">
        <div class="about-image" v-reveal.slide-left>
          <img src="/images/about.webp" alt="和润天下公司办公环境" loading="lazy" decoding="async" />
        </div>
        <div class="about-content" v-reveal.slide-right>
          <p class="about-paragraph">
            和润天下人工智能科技有限公司是一家专注于叉车行业人工智能应用的高新技术企业。公司秉承"科技赋能、精准服务"的理念，致力于为叉车产业链上下游企业提供智能化、数字化的一站式解决方案。
          </p>
          <p class="about-paragraph">
            凭借深厚的技术积累与行业洞察，我们打造了涵盖叉车残值智能评估、叉车维修培训认证、二手叉车信息撮合交易、AI叉车智能助手等核心服务体系，帮助客户实现降本增效、科学决策，推动叉车行业迈向智能化新时代。
          </p>
          <div class="stat-grid">
            <div class="stat-card">
              <span class="stat-number"><CountUpNumber :value="5" suffix="+" /></span>
              <p class="stat-label">行业经验（年）</p>
            </div>
            <div class="stat-card">
              <span class="stat-number"><CountUpNumber :value="20" suffix="+" /></span>
              <p class="stat-label">覆盖品牌</p>
            </div>
            <div class="stat-card">
              <span class="stat-number"><CountUpNumber :value="20" suffix="+" /></span>
              <p class="stat-label">专利</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// 公司介绍板块（文案长期稳定，暂不进 homeContent）
</script>

<style scoped>
.about {
  background: var(--color-bg-card);
}
.about-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-12);
  align-items: center;
}
.about-image {
  overflow: hidden;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}
.about-image img {
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
  aspect-ratio: 3 / 2;
}
.about-paragraph {
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-6);
}
.about-paragraph:last-of-type {
  margin-bottom: var(--space-10);
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-6);
}
.stat-card {
  text-align: center;
  padding: var(--space-5);
  background: var(--surface-card-alt);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}
.stat-number {
  font-family: var(--font-mono);
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  color: var(--color-primary-500);
  line-height: var(--leading-tight);
}
.stat-label {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  margin: var(--space-2) 0 0;
}

@media (min-width: 768px) {
  .about-grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}

@media (max-width: 639px) {
  .stat-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    /* 移动端 3 列空间紧张：压缩间距与卡片内边距 */
    gap: var(--space-3);
  }
  .stat-card {
    padding: var(--space-3) var(--space-2);
  }
  /* 数字 36px 在窄列中会溢出卡片（"20+" 宽约 65px），移动端降为 24px */
  .stat-number {
    font-size: 1.5rem;
  }
}
</style>
