// 生成站内字体样式：把 @font-face 从「阻塞渲染的入口样式表」里拆出来。
//
// 背景（2026-10 首屏白屏诊断）：字体声明原本走 nuxt.config 的 css 数组，被 Vite 打进
// 入口样式表 entry.*.css —— 527KB，其中 95% 是 @font-face。入口样式表是**渲染阻塞**的，
// 于是首屏 paint 被一份字体清单拖到 3s。拆成独立文件异步加载后，阻塞的只剩布局样式。
//
// 做法：
//   1. 解析 misans / @fontsource 的 @font-face，只保留 woff2 源（woff2 覆盖已足够，
//      去掉 woff 备用源可再瘦一圈）
//   2. 被引用的 woff2 复制到 public/fonts/site/，文件名前缀内容哈希
//      （内容不变 → URL 不变 → 可长缓存；字体包升级 → 新哈希 → 不会读到旧文件）
//   3. 末尾拼接 hero 首屏子集（assets/css/hero-fonts.css）。**顺序要紧**：
//      同码点后声明者生效，hero 子集必须排在包字体之后才能赢
//   4. 输出 public/fonts/site.<hash8>.css（内容哈希命名 → 可 immutable 缓存）
//   5. 输出 config/siteFonts.ts（app.vue 用它拿 href）
//
// 产物 public/fonts/site* 不入库（见 .gitignore），prebuild / predev 自动重建。
// 手动重建：npm run gen:site-fonts
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, rmSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyWeightOverride } from './font-weights.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// 顺序即层叠顺序：与原先 nuxt.config css 数组里的字体段一致
const FONT_CSS = [
  'node_modules/@fontsource/space-grotesk/500.css',
  'node_modules/@fontsource/space-grotesk/600.css',
  'node_modules/@fontsource/space-grotesk/700.css',
  'node_modules/@fontsource/jetbrains-mono/500.css',
  'node_modules/@fontsource/jetbrains-mono/600.css',
  'node_modules/@fontsource/jetbrains-mono/700.css',
  'node_modules/misans/lib/Normal/MiSans-Regular.min.css',
  'node_modules/misans/lib/Normal/MiSans-Demibold.min.css',
  'node_modules/misans/lib/Normal/MiSans-Bold.min.css',
  'node_modules/misans/lib/Normal/MiSans-Heavy.min.css'
]

const OUT_DIR = join(root, 'public', 'fonts', 'site')
const OUT_CSS_DIR = join(root, 'public', 'fonts')
const HERO_CSS = join(root, 'assets', 'css', 'hero-fonts.css')
const OUT_TS = join(root, 'config', 'siteFonts.ts')

const sha8 = (buf) => createHash('sha1').update(buf).digest('hex').slice(0, 8)

/** 解析 @font-face 列表（family / style / weight / 第一个 woff2 src / unicode-range） */
function parseFaces(cssPath) {
  const css = readFileSync(cssPath, 'utf8')
  const faces = []
  const re = /@font-face\s*\{([^}]+)\}/g
  let m
  while ((m = re.exec(css))) {
    const block = m[1]
    const family = block.match(/font-family:\s*'?([^;']+)'?\s*;/)?.[1]?.trim()
    const style = block.match(/font-style:\s*([^;]+);/)?.[1]?.trim() || 'normal'
    const weight = block.match(/font-weight:\s*([^;]+);/)?.[1]?.trim()
    const display = block.match(/font-display:\s*([^;]+);/)?.[1]?.trim() || 'swap'
    const range = block.match(/unicode-range:\s*([^;]+);/)?.[1]?.trim()
    const urls = [...block.matchAll(/url\(\s*'?"?([^'")]+)'?"?\s*\)/g)].map((x) => x[1])
    const woff2 = urls.find((u) => u.endsWith('.woff2'))
    if (!family || !weight || !range || !woff2) continue
    faces.push({ family, style, weight, display, range, woff2 })
  }
  return faces
}

// 重建前清空：全部是内容哈希命名，旧文件不会再被引用
rmSync(OUT_DIR, { recursive: true, force: true })
mkdirSync(OUT_DIR, { recursive: true })
for (const f of readdirSync(OUT_CSS_DIR)) {
  if (/^site\.[0-9a-f]{8}\.css$/.test(f)) rmSync(join(OUT_CSS_DIR, f), { force: true })
}

const blocks = []
const seen = new Set()
let totalBytes = 0
let missing = 0

for (const rel of FONT_CSS) {
  const cssPath = join(root, rel)
  for (const face of parseFaces(cssPath)) {
    const srcPath = join(dirname(cssPath), face.woff2)
    if (!existsSync(srcPath)) {
      console.warn(`⚠️ 缺少字体文件：${srcPath}`)
      missing++
      continue
    }
    const buf = readFileSync(srcPath)
    const name = `${sha8(buf)}.${basename(face.woff2)}`
    if (!seen.has(name)) {
      copyFileSync(srcPath, join(OUT_DIR, name))
      seen.add(name)
      totalBytes += buf.length
    }
    blocks.push(
      `@font-face{font-family:'${face.family}';font-style:${face.style};` +
        `font-weight:${applyWeightOverride(cssPath, face.weight)};` +
        `font-display:${face.display};src:url('/fonts/site/${name}') format('woff2');` +
        `unicode-range:${face.range};}`
    )
  }
}

// hero 首屏子集：必须排在包字体之后（同码点后声明者生效）
const heroCss = readFileSync(HERO_CSS, 'utf8').trim()

const header =
  '/* 自动生成：scripts/gen-site-fonts.mjs —— 站内自托管字体（@font-face）。\n' +
  ' * app.vue 以 preload + onload 异步加载本文件，不阻塞首屏渲染。\n' +
  ' * 字体包升级后重跑 npm run gen:site-fonts（prebuild / predev 已自动执行）。 */\n'

const css = header + blocks.join('\n') + '\n' + heroCss + '\n'
const cssName = `site.${sha8(css)}.css`
writeFileSync(join(OUT_CSS_DIR, cssName), css)

writeFileSync(
  OUT_TS,
  '// 自动生成：scripts/gen-site-fonts.mjs —— 异步字体样式表的 href（app.vue 引用）。\n' +
    '// 内容哈希命名，可长缓存；字体包升级后重跑 npm run gen:site-fonts。\n' +
    `export const siteFontsHref = '/fonts/${cssName}'\n`
)

console.log(
  `✅ ${blocks.length} 个 @font-face（含 hero 子集）→ public/fonts/${cssName}` +
    `（CSS ${(css.length / 1024).toFixed(0)}KB，字体 ${seen.size} 个 / ${(totalBytes / 1024 / 1024).toFixed(1)}MB）` +
    (missing ? `，缺 ${missing} 个文件` : '')
)
