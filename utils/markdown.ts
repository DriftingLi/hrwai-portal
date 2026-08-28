// Markdown 正文渲染（服务端执行，与现网 Vue SPA 使用同库 marked，保证输出一致）。
import { marked } from 'marked'

/** TOC 条目（h2/h3） */
export interface TocItem {
  id: string
  text: string
  depth: 2 | 3
}

/**
 * 为 h2/h3 生成幂等 slug id（中文/字母数字），同名自动追加序号。
 * 文章 TOC 锚点与目录提取共用此前缀约定。
 */
export function addHeadingIds(html: string): string {
  const seen = new Map<string, number>()
  return html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_match, level: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, '').trim()
    const base =
      text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .replace(/\s+/g, '-')
        .replace(/^-+|-+$/g, '') || 'section'
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    const id = count > 0 ? `${base}-${count}` : base
    return `<h${level} id="${id}">${inner}</h${level}>`
  })
}

/** 从已渲染 HTML 提取 h2/h3 目录（依赖 addHeadingIds 注入的 id） */
export function extractToc(html: string): TocItem[] {
  const items: TocItem[] = []
  const re = /<h([23])\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const depth = Number(m[1]) as 2 | 3
    const text = (m[3] ?? '').replace(/<[^>]+>/g, '').trim()
    if (m[2] && text) items.push({ id: m[2], text, depth })
  }
  return items
}

export function renderMarkdown(content: string): string {
  if (!content) return ''
  try {
    const html = marked.parse(content) as string
    // 非首屏正文图片：统一追加 loading="lazy" decoding="async"（已含则跳过），保留原有属性顺序
    const withLazy = html.replace(/<img([^>]*?)>/g, (match, attrs: string) => {
      if (/\bloading=/.test(match)) return match
      return `<img${attrs} loading="lazy" decoding="async">`
    })
    return addHeadingIds(withLazy)
  } catch {
    return content
  }
}
