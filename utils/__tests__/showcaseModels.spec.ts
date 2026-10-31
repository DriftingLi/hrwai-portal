import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SHOWCASE_MODELS, findShowcaseModel } from '../showcase/models'

describe('三维展台车型数据', () => {
  it('slug 唯一，且静态预览图真实存在', () => {
    const slugs = new Set<string>()

    for (const model of SHOWCASE_MODELS) {
      expect(model.slug).toMatch(/^[a-z0-9-]+$/)
      expect(slugs.has(model.slug), `重复 slug: ${model.slug}`).toBe(false)
      slugs.add(model.slug)

      expect(
        existsSync(join(process.cwd(), 'public', model.preview)),
        `缺少静态预览图: ${model.preview}`
      ).toBe(true)
    }
  })

  it('按 slug 查找车型', () => {
    expect(findShowcaseModel('explosion-proof-forklift')?.shortName).toBe('防爆叉车')
    expect(findShowcaseModel('missing-model')).toBeUndefined()
    expect(findShowcaseModel(undefined)).toBeUndefined()
  })
})
