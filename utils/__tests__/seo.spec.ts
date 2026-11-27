import { describe, it, expect } from 'vitest'
import { seoDescription } from '../seo'

describe('seoDescription', () => {
  it('空值返回空串', () => {
    expect(seoDescription('')).toBe('')
    expect(seoDescription(null)).toBe('')
    expect(seoDescription(undefined)).toBe('')
    expect(seoDescription('   \n  ')).toBe('')
  })

  it('折叠换行与多余空白', () => {
    expect(seoDescription(' 第一段\n\n第二段  第三段 ')).toBe('第一段 第二段 第三段')
  })

  it('短文本原样返回', () => {
    expect(seoDescription('摘要')).toBe('摘要')
  })

  it('超长文本按码点截断并补省略号', () => {
    const long = '一'.repeat(200)
    const result = seoDescription(long, 120)
    expect(Array.from(result).length).toBe(121)
    expect(result.endsWith('…')).toBe(true)
  })

  it('emoji 不会被从中间截断', () => {
    const long = '🤖'.repeat(200)
    const result = seoDescription(long, 120)
    expect(Array.from(result).length).toBe(121)
    expect(result).toBe(`${'🤖'.repeat(120)}…`)
  })
})
