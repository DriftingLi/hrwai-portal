import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { criticalCss } from '../criticalCss'
import { siteFontsHref } from '../siteFonts'

const repoRoot = join(__dirname, '..', '..')

/** 从 CSS 文本里取自定义属性表 */
function readTokens(css: string): Map<string, string> {
  const tokens = new Map<string, string>()
  for (const m of css.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)[;}]/g)) {
    const name = m[1]
    const value = m[2]
    if (name && value) tokens.set(name, value.trim())
  }
  return tokens
}

// 首屏关键 CSS 内联在每份 HTML 里，是 design-tokens.css 的**副本**：
// 两处必须同步，否则首帧底色和外部样式表接管后的底色会对不上（闪一下）。
// 这条测试就是那道闸——改了 design-tokens 里的值，这里会红，提示同步 criticalCss。
describe('criticalCss', () => {
  const tokens = readTokens(readFileSync(join(repoRoot, 'assets/css/design-tokens.css'), 'utf8'))
  const inline = readTokens(criticalCss)

  it('内联的每个变量都与 design-tokens.css 取值一致', () => {
    expect(inline.size).toBeGreaterThan(0)
    for (const [name, value] of inline) {
      expect(tokens.get(name), `design-tokens.css 缺少 ${name}`).toBe(value)
    }
  })

  it('只覆盖首屏必需的两个变量（hero 底色 / 页面底色）', () => {
    expect([...inline.keys()].sort()).toEqual(['--color-bg-page', '--surface-hero'])
  })

  it('html/body 用页面底色（浅），hero 用深色表面并撑满一屏', () => {
    // 底色不能刷成 hero 的深色：/news 等页面首帧会先黑一下
    expect(criticalCss).toMatch(/html,body\{[^}]*background:var\(--color-bg-page\)/)
    expect(criticalCss).toMatch(/\.hero\{[^}]*background:var\(--surface-hero\)/)
    expect(criticalCss).toMatch(/\.hero\{[^}]*min-height:100vh/)
  })

  it('选择器不压过组件样式：不能出现 ID 选择器', () => {
    // .hero[data-v-xxx] 是入口样式表里的真实规则，必须能覆盖这段内联样式；
    // 用 ID 选择器会把它的覆盖顶回去。注意别把 #0B1120 这类色值当成选择器。
    expect(criticalCss).not.toMatch(/(?:^|[};])#[\w-]+\s*[{,]/)
  })

  it('足够小：内联样式不进缓存，每份 HTML 都要带', () => {
    expect(criticalCss.length).toBeLessThan(512)
  })
})

// 字体样式表由 scripts/gen-site-fonts.mjs 生成（prebuild / predev 自动重建，不入库），
// 所以这里只校验「引用的形状」和「生成后文件确实在」，不要求构建前就存在。
describe('siteFontsHref', () => {
  it('指向内容哈希命名的生成文件', () => {
    expect(siteFontsHref).toMatch(/^\/fonts\/site\.[0-9a-f]{8}\.css$/)
  })

  it('生成后文件存在且含 @font-face', () => {
    const file = join(repoRoot, 'public', siteFontsHref.replace(/^\//, ''))
    if (!existsSync(file)) return // 未跑 prebuild：跳过，不误报
    const css = readFileSync(file, 'utf8')
    expect(css.match(/@font-face/g)?.length ?? 0).toBeGreaterThan(400)
    expect(css).toContain("url('/fonts/site/")
  })
})
