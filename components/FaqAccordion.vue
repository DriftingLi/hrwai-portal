<template>
  <div class="faq-list">
    <div
      v-for="(item, index) in faqs"
      :key="item.q"
      class="faq-item"
      :class="{ open: openIndex === index }"
    >
      <button
        class="faq-question"
        :aria-expanded="openIndex === index"
        :aria-controls="`faq-panel-${index}`"
        @click="toggle(index)"
      >
        <span class="faq-q-text">{{ item.q }}</span>
        <span class="faq-chevron" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      <!-- grid-template-rows 0fr→1fr 过渡实现平滑展开（无需测量高度） -->
      <div :id="`faq-panel-${index}`" class="faq-answer" role="region">
        <div class="faq-answer-inner">
          <p class="faq-a-text">{{ item.a }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

/**
 * FAQ 手风琴（单开模式）
 * 原生 button + aria-expanded/aria-controls 保证可访问性；
 * 占位文案（待业务侧替换为真实内容）。
 */

interface FaqItem {
  q: string
  a: string
}

// TODO(内容替换): 以下问答为占位文案，发布前请替换为公司确认的真实口径
const faqs: FaqItem[] = [
  {
    q: '叉车残值评估报告是怎么出具的？',
    a: '提交车辆基本信息与实拍资料后，系统基于 AI 多维度加权模型（品牌、车龄、工时、维修记录、市场行情等）自动测算残值区间，并由专业团队复核，输出带置信区间的正式评估报告，可用于交易定价、保险与融资场景。'
  },
  {
    q: '叉车维修培训是否提供认证证书？',
    a: '培训采用"理论 + 实操"一体化教学，覆盖电动与内燃叉车全系列机型。完成课程并通过考核后，颁发相应等级的技能认证证书，作为维修能力与从业资质的证明。'
  },
  {
    q: '二手叉车交易平台的车源从哪里来？',
    a: '车源来自合作经销商、企业处置车辆与个人卖家，平台结合 AI 评估报告对车况进行核验与展示，消除买卖双方信息不对称，支持线上撮合与线下交割。'
  },
  {
    q: '我的企业数据安全如何保障？',
    a: '平台采用企业级加密存储与严格的访问权限控制，评估链路全程留痕、可追溯，支持合规审计；未经授权不会向任何第三方披露客户数据。'
  },
  {
    q: '合作的流程是怎样的？',
    a: '可通过页脚联系方式或服务热线与我们取得联系，商务团队会在 1 个工作日内响应，了解需求后提供方案演示与试用，双方确认合作模式后即可开通对应服务。'
  },
  {
    q: '服务的收费模式是怎样的？',
    a: '不同业务板块采取差异化计费：评估与培训按次或按套餐计费，平台服务支持按需订阅，企业级合作可定制专属方案。具体报价请联系商务获取。'
  }
]

const openIndex = ref<number | null>(0)

function toggle(index: number) {
  openIndex.value = openIndex.value === index ? null : index
}
</script>

<style scoped>
.faq-list {
  max-width: 860px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.faq-item {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: border-color var(--duration-fast), box-shadow var(--duration-normal);
}
.faq-item:hover {
  border-color: var(--color-primary-300);
}
.faq-item.open {
  border-color: var(--color-primary-400);
  box-shadow: var(--shadow-md);
}
.faq-question {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-5) var(--space-6);
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
}
.faq-q-text {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  line-height: var(--leading-snug);
}
.faq-chevron {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-50);
  color: var(--color-primary-600);
  transition: transform var(--duration-normal) var(--ease-default), background var(--duration-fast);
}
.faq-item.open .faq-chevron {
  transform: rotate(180deg);
  background: var(--color-primary-100);
}
.faq-answer {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--duration-normal) var(--ease-default);
}
.faq-item.open .faq-answer {
  grid-template-rows: 1fr;
}
.faq-answer-inner {
  overflow: hidden;
}
.faq-a-text {
  padding: 0 var(--space-6) var(--space-6);
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--color-text-secondary);
  margin: 0;
}
@media (prefers-reduced-motion: reduce) {
  .faq-answer,
  .faq-chevron {
    transition: none !important;
  }
}
</style>
