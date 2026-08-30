// 生成 hero 首屏关键字体切片（子集化）：
//   1. 解析 misans / @fontsource 包的 unicode-range，找出覆盖 hero 文案的 woff2 切片
//   2. 逐切片子集化（subset-font），只保留 hero 实际用到的字符（每片 ~1-2KB）
//   3. 复制到 public/fonts/hero/（稳定 URL，不随构建 hash 变化）
//   4. 生成 assets/css/hero-fonts.css —— @font-face 按精确码点覆盖（声明在包字体
//      之后：同码点后声明者生效；其余码点仍由包字体按需加载，不会出现缺字形）
//   5. 生成 config/heroFonts.ts —— preload href 列表（SiteHero useHead 引用）
//
// hero 文案变更后需重跑：npm run gen:hero-fonts
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import subsetFont from 'subset-font'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// ==== 与 components/home/SiteHero.vue 模板文案保持同步（含 CTA 按钮与滚动提示） ====
// 按渲染字重分组：400→MiSans Regular(330) / 500→MiSans Demibold(450) / 700 标题 CJK→MiSans Heavy(630)
const HERO_TEXT = {
  regular:
    '和润天下人工智能科技有限公司 —— 深耕工程车辆垂直领域，以 AI 驱动叉车全生命周期智能化升级。向下探索',
  demibold: 'AI × 叉车全生命周期了解我们核心服务',
  heavy: '和润天下',
  // --font-display 栈中西文优先命中 Space Grotesk（hero 标题 + 导航 logo）
  grotesk: 'HRWAI '
}

/** 解析 @font-face 列表（weight / src url / unicode-range） */
function parseFaces(cssPath) {
  const css = readFileSync(cssPath, 'utf8')
  const faces = []
  const re = /@font-face\s*\{([^}]+)\}/g
  let m
  while ((m = re.exec(css))) {
    const block = m[1]
    const weight = block.match(/font-weight:\s*(\d+)/)?.[1]
    const url = block.match(/src:\s*url\('?([^')]+)'?\)/)?.[1]
    const range = block.match(/unicode-range:\s*([^;]+);/)?.[1]?.trim()
    if (weight && url && range) faces.push({ weight, url, range, cssPath })
  }
  return faces
}

/** codepoint 是否落在 unicode-range 内 */
function rangeCovers(range, cp) {
  return range.split(',').some((part) => {
    const mm = part.trim().match(/^U\+([0-9A-Fa-f]+)(?:-([0-9A-Fa-f]+))?$/)
    if (!mm) return false
    const lo = parseInt(mm[1], 16)
    const hi = mm[2] ? parseInt(mm[2], 16) : lo
    return cp >= lo && cp <= hi
  })
}

/** 码点列表压缩为 unicode-range 语法（连续段合并） */
function formatRange(cps) {
  const sorted = [...cps].sort((a, b) => a - b)
  const parts = []
  let start = null
  let prev = null
  const flush = () => {
    if (start === null) return
    const hex = (n) => n.toString(16).toUpperCase()
    parts.push(start === prev ? `U+${hex(start)}` : `U+${hex(start)}-${hex(prev)}`)
  }
  for (const cp of sorted) {
    if (start === null || cp !== prev + 1) {
      flush()
      start = cp
    }
    prev = cp
  }
  flush()
  return parts.join(',')
}

/** 文本去重后的码点集合 */
function codePoints(text) {
  return [...new Set([...text])].map((ch) => ch.codePointAt(0))
}

const OUT_DIR = join(root, 'public', 'fonts', 'hero')
mkdirSync(OUT_DIR, { recursive: true })

const jobs = [
  { family: 'MiSans', css: 'node_modules/misans/lib/Normal/MiSans-Regular.min.css', text: HERO_TEXT.regular },
  { family: 'MiSans', css: 'node_modules/misans/lib/Normal/MiSans-Demibold.min.css', text: HERO_TEXT.demibold },
  { family: 'MiSans', css: 'node_modules/misans/lib/Normal/MiSans-Heavy.min.css', text: HERO_TEXT.heavy },
  {
    family: 'Space Grotesk',
    css: 'node_modules/@fontsource/space-grotesk/700.css',
    text: HERO_TEXT.grotesk
  }
]

const cssBlocks = []
const preloadHrefs = []
let totalBytes = 0

for (const job of jobs) {
  const cssPath = join(root, job.css)
  const faces = parseFaces(cssPath)
  const cps = codePoints(job.text)
  const covered = new Set()

  for (const face of faces) {
    const hit = cps.filter((cp) => rangeCovers(face.range, cp))
    if (!hit.length) continue
    hit.forEach((cp) => covered.add(cp))

    // 子集化：只保留本切片覆盖的 hero 字符
    const srcPath = join(dirname(cssPath), face.url)
    const keep = hit.map((cp) => String.fromCodePoint(cp)).join('')
    const subset = await subsetFont(readFileSync(srcPath), keep, { targetFormat: 'woff2' })

    const name = basename(face.url)
    const dest = join(OUT_DIR, name)
    writeFileSync(dest, subset)
    totalBytes += subset.length
    preloadHrefs.push(`/fonts/hero/${name}`)
    cssBlocks.push(
      `@font-face{font-family:'${job.family}';font-style:normal;font-weight:${face.weight};` +
        `font-display:swap;src:url('/fonts/hero/${name}') format('woff2');` +
        `unicode-range:${formatRange(hit)};}`
    )
    console.log(
      `  ${job.family} ${face.weight}  ${name}  ` +
        `${(statSync(srcPath).size / 1024).toFixed(1)}KB → ${(subset.length / 1024).toFixed(1)}KB  (${hit.length} 字形)`
    )
  }

  const missing = cps.filter((cp) => !covered.has(cp))
  if (missing.length) {
    console.warn(
      `⚠️ [${job.css}] ${missing.length} 个字符未被任何切片覆盖（将回退系统字体）：` +
        missing.map((cp) => String.fromCodePoint(cp)).join(' ')
    )
  }
}

const header =
  '/* 自动生成：scripts/gen-hero-fonts.mjs —— hero 首屏关键字体（切片子集化 + 精确码点覆盖）。\n' +
  ' * hero 文案变更后重跑 npm run gen:hero-fonts。\n' +
  ' * 声明在 nuxt.config css 数组中 misans/fontsource 之后：同码点后声明者生效，\n' +
  ' * 未覆盖码点仍由包字体（unicode-range 按需加载）提供，不会缺字形。 */\n'
writeFileSync(join(root, 'assets', 'css', 'hero-fonts.css'), header + cssBlocks.join('\n') + '\n')

const tsHeader =
  '// 自动生成：scripts/gen-hero-fonts.mjs —— hero 首屏关键字体 preload 列表（SiteHero useHead 引用）。\n' +
  '// hero 文案变更后重跑 npm run gen:hero-fonts。\n'
writeFileSync(
  join(root, 'config', 'heroFonts.ts'),
  tsHeader + 'export const heroFontPreloads: string[] = [\n' +
    preloadHrefs.map((h) => `  '${h}'`).join(',\n') +
    '\n]\n'
)

console.log(`\n✅ ${preloadHrefs.length} 个子集共 ${(totalBytes / 1024).toFixed(1)}KB → public/fonts/hero/`)
