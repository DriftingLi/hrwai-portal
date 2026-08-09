// Markdown 正文渲染（服务端执行，与现网 Vue SPA 使用同库 marked，保证输出一致）。
import { marked } from 'marked'

export function renderMarkdown(content: string): string {
  if (!content) return ''
  try {
    return marked.parse(content) as string
  } catch {
    return content
  }
}
