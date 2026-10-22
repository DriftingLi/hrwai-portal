// 电池 RUL 循环数据的解析与示例（纯函数，票 #32）。
// 后端契约（FL 仓 CreateBatteryRequest）：battery_type ∈ lfp/ncm/other，cycles 至少 10 条，
// 每条 {cycle_index ≥ 1, voltage_series[], current_series[], capacity > 0}，
// 且电压/电流序列长度必须一致。页面只负责把文本送进来，判定全在这里。
import type { BatteryCycle } from '~/api/valuation'

export interface BatteryCycleParseResult {
  cycles: BatteryCycle[]
  error: string | null
}

/** 最少循环数（后端 Validate 的同一阈值） */
export const BATTERY_MIN_CYCLES = 10

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'number' && Number.isFinite(item))
}

function parseEntries(raw: unknown): BatteryCycleParseResult {
  let list: unknown = raw
  if (list && typeof list === 'object' && !Array.isArray(list)) {
    const record = list as Record<string, unknown>
    list = Array.isArray(record.cycles) ? record.cycles : null
  }
  if (!Array.isArray(list)) {
    return { cycles: [], error: 'JSON 必须是循环数组，或包含 cycles 数组的对象' }
  }
  if (list.length === 0) return { cycles: [], error: '还没有循环数据' }

  const cycles: BatteryCycle[] = []
  for (let index = 0; index < list.length; index += 1) {
    const item = list[index]
    const position = index + 1
    if (!item || typeof item !== 'object') {
      return { cycles: [], error: `第 ${position} 条不是对象` }
    }
    const record = item as Record<string, unknown>
    const cycleIndex = Number(record.cycle_index)
    if (!Number.isFinite(cycleIndex) || cycleIndex <= 0) {
      return { cycles: [], error: `第 ${position} 条 cycle_index 非法` }
    }
    if (!isNumberArray(record.voltage_series) || !isNumberArray(record.current_series)) {
      return { cycles: [], error: `第 ${position} 条的电压/电流序列必须是数字数组` }
    }
    if (record.voltage_series.length === 0 || record.current_series.length === 0) {
      return { cycles: [], error: `第 ${position} 条的电压/电流序列不能为空` }
    }
    if (record.voltage_series.length !== record.current_series.length) {
      return { cycles: [], error: `第 ${position} 条的电压/电流序列长度不一致` }
    }
    const capacity = Number(record.capacity)
    if (!Number.isFinite(capacity) || capacity <= 0) {
      return { cycles: [], error: `第 ${position} 条的容量必须大于 0` }
    }
    cycles.push({
      cycle_index: cycleIndex,
      voltage_series: record.voltage_series,
      current_series: record.current_series,
      capacity
    })
  }

  if (cycles.length < BATTERY_MIN_CYCLES) {
    return { cycles: [], error: `循环数据至少需要 ${BATTERY_MIN_CYCLES} 条，当前 ${cycles.length} 条` }
  }
  return { cycles, error: null }
}

/** 解析 JSON 文本 → 合法循环数组（错误信息直接可展示） */
export function parseBatteryCycles(text: string): BatteryCycleParseResult {
  const trimmed = text.trim()
  if (!trimmed) return { cycles: [], error: '请粘贴或载入循环数据' }
  try {
    return parseEntries(JSON.parse(trimmed))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { cycles: [], error: `JSON 解析失败：${message}` }
  }
}

/**
 * 示例循环数据（与旧 SPA 的演示数据同口径：恒流段 + 恒压段收尾，容量随循环缓降）。
 * 用途只有「让人先看到结果」——真实评估应当上传设备实测序列。
 */
export function buildSampleBatteryCycles(count = 15, points = 100): BatteryCycle[] {
  const safeCount = Math.max(BATTERY_MIN_CYCLES, Math.trunc(count))
  const safePoints = Math.max(10, Math.trunc(points))
  const cycles: BatteryCycle[] = []
  for (let index = 0; index < safeCount; index += 1) {
    const soh = 1 - (0.2 * index) / (safeCount - 1)
    const voltageSeries: number[] = []
    const currentSeries: number[] = []
    const ccPoints = Math.round(safePoints * 0.7)
    for (let point = 0; point < safePoints; point += 1) {
      if (point < ccPoints) {
        voltageSeries.push(3.2 + (0.4 * point) / ccPoints)
        currentSeries.push(1)
      } else {
        voltageSeries.push(3.6)
        currentSeries.push(0.3 * Math.exp(-(point - ccPoints) / 20) * (1 + (0.1 * index) / safeCount))
      }
    }
    cycles.push({
      cycle_index: index + 1,
      voltage_series: voltageSeries,
      current_series: currentSeries,
      capacity: 1.1 * soh
    })
  }
  return cycles
}
