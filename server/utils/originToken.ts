// 回源鉴权头（票 FL#1746）：门户 /api 代理回源时带 X-Origin-Token。
// 源站 nginx 只有在 token 命中时才采信 EdgeOne 传来的 EO-Connecting-IP（真实客户端 IP）；
// 未命中则退回「按边缘节点取 IP」的旧口径 —— 因此 token 为空时**不带该头**更安全，
// 不要把空串当成有效 token 发出去。
//
// token 走部署环境变量（NUXT_API_ORIGIN_TOKEN），本仓库是公开仓，**不要硬编码**。
export function buildProxyHeaders(token?: string): Record<string, string> | undefined {
  return token ? { 'x-origin-token': token } : undefined
}
