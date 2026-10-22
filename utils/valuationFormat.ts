// 估值展示格式化（纯函数）：数值/日期口径与旧 SPA 一致——金额按万元展示、比例保留一位小数。
// 页面只做排版，不在这里读环境或 DOM。

/** 元 → 万元字符串（默认两位小数）；非法值返回 '-' */
export function formatWan(value: number | null | undefined, digits = 2): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-'
  return (value / 10000).toFixed(digits)
}

/** 元 → 「¥25.00 万」；非法值返回 '-' */
export function formatWanCurrency(value: number | null | undefined, digits = 2): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-'
  return `¥${formatWan(value, digits)} 万`
}

/** 残值率（%）：estimated / original；原价缺失或为 0 时返回 null */
export function residualRate(
  estimated: number | null | undefined,
  original: number | null | undefined
): number | null {
  if (typeof estimated !== 'number' || typeof original !== 'number') return null
  if (!Number.isFinite(estimated) || !Number.isFinite(original) || original <= 0) return null
  return (estimated / original) * 100
}

/** 百分比字符串（默认一位小数）；非法值返回 '-' */
export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-'
  return `${value.toFixed(digits)}%`
}

/** 0~1 的置信度 → 百分比字符串 */
export function formatConfidence(value: number | null | undefined, digits = 1): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-'
  return formatPercent(value * 100, digits)
}

/** 系数（K 值）保留 3 位小数；非法值返回 '-' */
export function formatCoefficient(value: number | null | undefined, digits = 3): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-'
  return value.toFixed(digits)
}

/** 整数千分位；非法值返回 '-' */
export function formatInteger(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-'
  return Math.round(value).toLocaleString('en-US')
}

/** 吨位展示：3 → '3 吨'，2.5 → '2.5 吨'；非法值返回 '-' */
export function formatTonnage(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return '-'
  return `${value} 吨`
}

/** 门架高度：0 表示「无」 */
export function formatMastHeight(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return '无'
  return `${value} mm`
}
