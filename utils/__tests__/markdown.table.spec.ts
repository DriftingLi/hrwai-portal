
// 表格对齐（2026-11）：GFM 对齐说明符被 marked 渲染成 th/td 的 align 属性，
// 而 CSS 里无条件写 text-align:left 会盖掉它 —— 作者右对齐的数字列在门户上永远左对齐。
// 样式本身无法单测，这里守的是「上游确实产出了 align 属性」这条 CSS 依赖的前提；
// CSS 侧用 :not([align]) 让位，见 assets/css/markdown.css。
import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '../markdown'

describe('表格对齐（2026-11）', () => {
  it('GFM 对齐说明符渲染成 th/td 的 align 属性', () => {
    const html = renderMarkdown(['| 左 | 中 | 右 |', '| :-- | :-: | --: |', '| a | b | c |'].join('\n'))
    expect(html).toContain('<table>')
    expect(html).toContain('align="left"')
    expect(html).toContain('align="center"')
    expect(html).toContain('align="right"')
  })

  it('表格渲染成真表格（不是降级成源码文本）', () => {
    const html = renderMarkdown(['| 故障码 | 含义 |', '| --- | --- |', '| E01 | 电池欠压 |'].join('\n'))
    expect(html).toContain('<table>')
    expect(html).toContain('<th>故障码</th>')
    expect(html).toContain('<td>电池欠压</td>')
    expect(html).not.toContain('| 故障码 |')
  })
})
