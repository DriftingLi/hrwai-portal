import { describe, it, expect } from 'vitest'
import { resolveFileUrl } from '../fileUrl'

describe('resolveFileUrl', () => {
  it('空值返回空串', () => {
    expect(resolveFileUrl(null)).toBe('')
    expect(resolveFileUrl(undefined)).toBe('')
    expect(resolveFileUrl('')).toBe('')
  })

  it('https URL 原样返回', () => {
    const url = 'https://cdn.example.com/featured/x.webp'
    expect(resolveFileUrl(url)).toBe(url)
  })

  it('同源绝对路径（/static/...）原样返回', () => {
    expect(resolveFileUrl('/static/uploads/featured/x.webp')).toBe('/static/uploads/featured/x.webp')
  })

  it('无前缀相对路径补前导斜杠', () => {
    expect(resolveFileUrl('uploads/featured/x.webp')).toBe('/uploads/featured/x.webp')
  })
})
