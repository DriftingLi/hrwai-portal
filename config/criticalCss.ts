// 首屏关键 CSS（app.vue 内联进 <head>，随 HTML 首字节到达）
//
// 为什么需要它：入口样式表 entry.*.css 是**渲染阻塞**资源——它下载+解析完之前，
// 浏览器不会画第一帧，保持 UA 默认的白底。HTML 本身是 br 压缩的十几 KB，早到了；
// 首屏白屏的那段时间，本质上是在等这份外部样式表。
//
// 这里把「第一帧该长什么样」提前锁死：页面底色 + hero 的深色表面与满屏高度。
// 于是 HTML 一到就能出正确首帧，外部样式表随后接管其余全部规则（同名属性后者覆盖）。
//
// 底色取**页面底色**（浅色）而不是 hero 的深色：首页首帧由 #hero 自己铺满一屏深色，
// 其余页面（/news 等）首帧就是正确的浅色底——把 html/body 刷成深色会让那些页面先黑一下。
//
// 取舍：只放首屏必需的几条规则（<0.5KB），不要往里堆——内联样式不进缓存，每份 HTML 都要带。
// 变量取值必须与 assets/css/design-tokens.css 的 --surface-hero / --color-bg-page 一致
// （config/__tests__/criticalCss.spec.ts 会校验）。
//
// **选择器刻意压到最低特异性**（`.hero` 而非 `#hero.hero`）：这段样式先于入口样式表解析，
// 但后者的 .hero[data-v-xxx] 必须能覆盖它——尤其是 min-height 的 100vh/100dvh 双写
// （移动端地址栏收起时 100dvh 才对）。用 ID 选择器会把后者的覆盖顶回去。
export const criticalCss =
  ':root{--surface-hero:#0B1120;--color-bg-page:#F8FAFC}' +
  'html,body{margin:0;background:var(--color-bg-page)}' +
  '.hero{background:var(--surface-hero);min-height:100vh}'
