import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '../markdown'

describe('renderMarkdown', () => {
  it('渲染标题与段落', () => {
    expect(renderMarkdown('# 标题\n\n正文段落')).toContain('<h1>标题</h1>')
    expect(renderMarkdown('# 标题\n\n正文段落')).toContain('<p>正文段落</p>')
  })

  it('渲染图片与链接', () => {
    const html = renderMarkdown('![图](/static/uploads/featured/a.webp) 和 [链接](https://x.com)')
    expect(html).toContain('<img src="/static/uploads/featured/a.webp"')
    expect(html).toContain('<a href="https://x.com">')
  })

  it('空字符串返回空串', () => {
    expect(renderMarkdown('')).toBe('')
  })

  it('非法输入回退原文', () => {
    const broken = '```\n未闭合代码块'
    expect(renderMarkdown(broken)).toBeTruthy()
  })
})
