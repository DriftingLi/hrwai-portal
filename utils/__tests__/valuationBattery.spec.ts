import { describe, it, expect } from 'vitest'
import { BATTERY_MIN_CYCLES, buildSampleBatteryCycles, parseBatteryCycles } from '../valuationBattery'

function cycle(index: number, capacity = 1.1) {
  return {
    cycle_index: index,
    voltage_series: [3.2, 3.6],
    current_series: [1, 0.3],
    capacity
  }
}

function cycles(count: number) {
  return Array.from({ length: count }, (_, index) => cycle(index + 1))
}

describe('解析循环数据（与后端 CreateBatteryRequest 同口径）', () => {
  it('接受裸数组与 {cycles:[...]} 两种写法', () => {
    const arrayResult = parseBatteryCycles(JSON.stringify(cycles(10)))
    expect(arrayResult.error).toBeNull()
    expect(arrayResult.cycles).toHaveLength(10)

    const wrappedResult = parseBatteryCycles(JSON.stringify({ cycles: cycles(12) }))
    expect(wrappedResult.error).toBeNull()
    expect(wrappedResult.cycles).toHaveLength(12)
  })

  it('少于 10 条判错（后端同样拒绝），错误信息带当前条数', () => {
    const result = parseBatteryCycles(JSON.stringify(cycles(9)))
    expect(result.cycles).toHaveLength(0)
    expect(result.error).toContain(String(BATTERY_MIN_CYCLES))
    expect(result.error).toContain('9')
  })

  it('电压/电流长度不一致、容量非法、字段缺失都给出定位到第几条的错误', () => {
    const mismatched = cycles(10)
    mismatched[3]!.current_series = [1]
    expect(parseBatteryCycles(JSON.stringify(mismatched)).error).toContain('第 4 条')

    const badCapacity = cycles(10)
    badCapacity[0]!.capacity = 0
    expect(parseBatteryCycles(JSON.stringify(badCapacity)).error).toContain('容量')

    const badIndex = cycles(10) as Array<Record<string, unknown>>
    badIndex[1]!.cycle_index = 0
    expect(parseBatteryCycles(JSON.stringify(badIndex)).error).toContain('cycle_index')
  })

  it('非 JSON / 非数组 / 空文本都给可展示的错误，而不是抛异常', () => {
    expect(parseBatteryCycles('').error).toContain('请粘贴')
    expect(parseBatteryCycles('{oops').error).toContain('JSON 解析失败')
    expect(parseBatteryCycles('{"foo":1}').error).toContain('cycles')
  })
})

describe('示例数据', () => {
  it('生成至少 10 条、电压/电流等长、容量为正的合法数据（可直接提交）', () => {
    const sample = buildSampleBatteryCycles()
    expect(sample.length).toBeGreaterThanOrEqual(BATTERY_MIN_CYCLES)
    expect(parseBatteryCycles(JSON.stringify(sample)).error).toBeNull()
    for (const item of sample) {
      expect(item.voltage_series.length).toBe(item.current_series.length)
      expect(item.capacity).toBeGreaterThan(0)
    }
  })

  it('条数下限夹到 10（不能造出后端必拒的数据）', () => {
    expect(buildSampleBatteryCycles(3)).toHaveLength(BATTERY_MIN_CYCLES)
  })
})
