/**
 * SEO 描述文本规整：把摘要折叠成适合 <meta description> / og:description 的短文案。
 *
 * 后端摘要常带换行、多余空白，长度可达数百字；搜索引擎一般只展示前 ~160 字，
 * 超长与换行会让摘要显示混乱。这里统一：
 *   1. 所有空白（含换行）折叠为单个空格；
 *   2. 超过 maxLength 时在第 maxLength 个字处截断并补省略号。
 *
 * 按 Unicode 码点计数（中文算一个字，避免 emoji 被从中间截断）。
 */
export function seoDescription(input?: string | null, maxLength = 120): string {
  if (!input) return ''
  const collapsed = input.replace(/\s+/g, ' ').trim()
  if (!collapsed) return ''
  const chars = Array.from(collapsed)
  if (chars.length <= maxLength) return collapsed
  return `${chars.slice(0, maxLength).join('')}…`
}
