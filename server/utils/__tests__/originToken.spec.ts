import { describe, expect, it } from 'vitest'
import { buildProxyHeaders } from '../originToken'

describe('回源鉴权头（FL#1746）', () => {
  it('有 token 时带 X-Origin-Token（小写头名，h3 会原样发给上游）', () => {
    expect(buildProxyHeaders('abc123')).toEqual({ 'x-origin-token': 'abc123' })
  })

  it('token 为空/未配置时不带任何头（让源站按未鉴权处理，而不是发空 token）', () => {
    expect(buildProxyHeaders('')).toBeUndefined()
    expect(buildProxyHeaders(undefined)).toBeUndefined()
  })
})
