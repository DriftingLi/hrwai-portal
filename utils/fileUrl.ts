/**
 * 存储资源 URL 解析。
 * local 模式后端返回同源绝对路径（/static/uploads/...，由 /static 代理直通后端）；
 * R2 模式返回 https URL。仅防御性地归一化无前缀的相对路径。
 */
export function resolveFileUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (/^https?:\/\//.test(url)) return url
  if (url.startsWith('/')) return url
  return '/' + url
}
