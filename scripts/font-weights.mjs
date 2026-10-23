// misans 自 5.0 起改用标准 Web 标度声明字重（Regular 400 / Demibold 600 / Bold 700 / Heavy 900），
// 而不是 4.x 的自有标度（Regular 330 / Demibold 450 / Bold 630 / Heavy 700）。
//
// 本站 design-tokens.css 的语义档位是 normal 400 / medium 500 / semibold 600 / bold 700，
// 升级前靠浏览器「就近匹配」落到那四张字面上：
//   400→Regular(330)、500→Demibold(450)、600→Bold(630)、700→Heavy(700)
// 升级后若沿用 v5 的原始声明，600 会落到 Demibold、700 会落到 Bold——整站字重变轻。
//
// 因此输出时把字面**重标注**为本站标度（Regular 400 / Demibold 500 / Bold 600 / Heavy 700）：
// 令牌到字面的映射与升级前逐档一致，视觉不变；改的只是 @font-face 的匹配键。
// 注意：这是私有子集包，字重声明只影响匹配，不影响字形。
import { basename } from 'node:path'

export const MISANS_WEIGHT_BY_FILE = {
  'MiSans-Regular.min.css': '400',
  'MiSans-Demibold.min.css': '500',
  'MiSans-Bold.min.css': '600',
  'MiSans-Heavy.min.css': '700'
}

/** 按源 CSS 文件名重标注字重；非 misans 源（fontsource 等）原样返回 */
export function applyWeightOverride(cssPath, weight) {
  return MISANS_WEIGHT_BY_FILE[basename(cssPath)] ?? weight
}
