import * as THREE from 'three'

/**
 * 防爆叉车展台的程序化贴图。
 *
 * 全部用 Canvas2D 现场绘制，不引入任何图片资源：
 * - 车身贴花（1.5 / AC-POWER / Ex 防爆徽标 / 门架警示牌）
 * - 仪表屏（自发光）
 * - 地面（网格 + 展台环 + 中心光池）
 * - 软接触阴影、背景渐变、灯光光晕
 *
 * 这些贴图只在客户端创建（组件挂载后才动态 import 本模块）。
 */

type CanvasPair = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }

function createCanvas(width: number, height: number): CanvasPair {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('当前浏览器无法创建 Canvas 2D 上下文')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  return { canvas, ctx }
}

function toTexture(canvas: HTMLCanvasElement, colorSpace = true): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas)
  if (colorSpace) texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

/** 逐字绘制并追加字距（Canvas2D 的 letterSpacing 兼容性不足） */
function drawTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number
) {
  let cursor = x
  for (const char of text) {
    ctx.fillText(char, cursor, y)
    cursor += ctx.measureText(char).width + tracking
  }
}

/** 六边形防爆徽标路径 */
function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 3
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

/* ------------------------------------------------------------------ */
/* 车身侧面贴花：1.5 / AC-POWER / EXPLOSION-PROOF                       */
/* ------------------------------------------------------------------ */

export function createSideDecalTexture(): THREE.Texture {
  const { canvas, ctx } = createCanvas(1024, 512)

  ctx.save()
  ctx.shadowColor = 'rgba(10, 12, 16, 0.42)'
  ctx.shadowBlur = 14
  ctx.shadowOffsetY = 8

  // 主型号
  ctx.fillStyle = '#ffffff'
  ctx.font = 'italic 900 300px "Arial Narrow", "Helvetica Neue", Arial, sans-serif'
  ctx.fillText('1.5', 34, 330)

  // 吨位
  ctx.font = 'italic 800 104px "Helvetica Neue", Arial, sans-serif'
  ctx.fillText('t', 396, 300)

  ctx.restore()

  // 型号下的细分割线
  const gradient = ctx.createLinearGradient(46, 0, 900, 0)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.92)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)')
  ctx.fillStyle = gradient
  ctx.fillRect(46, 356, 862, 3)

  // 产品名
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 60px "Helvetica Neue", Arial, sans-serif'
  drawTracked(ctx, 'AC-POWER', 44, 428, 9)

  // 年份 / 防爆说明
  ctx.fillStyle = 'rgba(255, 255, 255, 0.82)'
  ctx.font = '600 30px "Helvetica Neue", Arial, sans-serif'
  drawTracked(ctx, 'EXPLOSION-PROOF', 46, 476, 4)

  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
  ctx.font = '600 30px "Helvetica Neue", Arial, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('2020', 972, 428)
  ctx.textAlign = 'left'

  return toTexture(canvas)
}

/* ------------------------------------------------------------------ */
/* Ex 防爆徽标（侧身 / 车尾共用）                                        */
/* ------------------------------------------------------------------ */

export function createExBadgeTexture(): THREE.Texture {
  const { canvas, ctx } = createCanvas(512, 512)
  const cx = 256
  const cy = 256

  ctx.save()
  ctx.shadowColor = 'rgba(8, 10, 14, 0.45)'
  ctx.shadowBlur = 18
  ctx.shadowOffsetY = 8
  hexPath(ctx, cx, cy, 236)
  ctx.fillStyle = 'rgba(11, 15, 21, 0.94)'
  ctx.fill()
  ctx.restore()

  hexPath(ctx, cx, cy, 236)
  ctx.lineWidth = 17
  ctx.strokeStyle = '#e0242c'
  ctx.stroke()

  hexPath(ctx, cx, cy, 208)
  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)'
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = 'italic 900 210px Georgia, "Times New Roman", serif'
  ctx.fillText('Ex', cx, cy - 26)

  ctx.font = '700 42px "Helvetica Neue", Arial, sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)'
  ctx.fillText('IIB T4 Gb', cx, cy + 132)

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  return toTexture(canvas)
}

/* ------------------------------------------------------------------ */
/* 门架警示铭牌                                                         */
/* ------------------------------------------------------------------ */

export function createMastLabelTexture(): THREE.Texture {
  const { canvas, ctx } = createCanvas(512, 640)

  roundRect(ctx, 8, 8, 496, 624, 22)
  ctx.fillStyle = '#f6f7f9'
  ctx.fill()
  ctx.lineWidth = 8
  ctx.strokeStyle = '#161a20'
  ctx.stroke()

  // 顶部黄黑警示条
  ctx.save()
  roundRect(ctx, 8, 8, 496, 96, 22)
  ctx.clip()
  ctx.fillStyle = '#f2c014'
  ctx.fillRect(8, 8, 496, 96)
  ctx.strokeStyle = '#161a20'
  ctx.lineWidth = 22
  for (let x = -80; x < 600; x += 62) {
    ctx.beginPath()
    ctx.moveTo(x, 104)
    ctx.lineTo(x + 62, 8)
    ctx.stroke()
  }
  ctx.restore()

  ctx.textAlign = 'center'
  ctx.fillStyle = '#161a20'
  ctx.font = '800 40px "Helvetica Neue", Arial, sans-serif'
  ctx.fillText('EXPLOSION', 256, 150)
  ctx.fillText('PROOF', 256, 194)

  // Ex 徽标
  hexPath(ctx, 256, 330, 120)
  ctx.fillStyle = '#b3161d'
  ctx.fill()
  hexPath(ctx, 256, 330, 120)
  ctx.lineWidth = 6
  ctx.strokeStyle = '#161a20'
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.font = 'italic 900 116px Georgia, "Times New Roman", serif'
  ctx.fillText('Ex', 256, 362)

  ctx.fillStyle = '#161a20'
  ctx.font = '700 34px "Helvetica Neue", Arial, sans-serif'
  ctx.fillText('Ex d IIB T4 Gb', 256, 500)

  ctx.font = '600 24px Consolas, "Courier New", monospace'
  ctx.fillStyle = '#4a5260'
  ctx.fillText('MAX LOAD 1500 kg', 256, 548)

  ctx.textAlign = 'left'
  return toTexture(canvas)
}

/* ------------------------------------------------------------------ */
/* 仪表屏：自发光                                                       */
/* ------------------------------------------------------------------ */

export function createDashTexture(): THREE.Texture {
  const { canvas, ctx } = createCanvas(1024, 512)

  const bg = ctx.createLinearGradient(0, 0, 0, 512)
  bg.addColorStop(0, '#10161e')
  bg.addColorStop(1, '#05080c')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, 1024, 512)

  // 外框
  ctx.strokeStyle = 'rgba(94, 234, 212, 0.28)'
  ctx.lineWidth = 6
  roundRect(ctx, 14, 14, 996, 484, 28)
  ctx.stroke()

  // 左侧：载荷
  ctx.fillStyle = 'rgba(148, 163, 184, 0.8)'
  ctx.font = '600 34px Consolas, "Courier New", monospace'
  ctx.fillText('LOAD', 64, 124)
  ctx.fillStyle = '#f8fafc'
  ctx.font = '700 128px "Helvetica Neue", Arial, sans-serif'
  ctx.fillText('1.5', 60, 254)
  ctx.fillStyle = '#5eead4'
  ctx.font = '600 46px Consolas, "Courier New", monospace'
  ctx.fillText('t', 250, 254)

  // 中部：速度
  ctx.fillStyle = 'rgba(148, 163, 184, 0.8)'
  ctx.font = '600 34px Consolas, "Courier New", monospace'
  ctx.fillText('SPEED', 430, 124)
  ctx.fillStyle = '#f8fafc'
  ctx.font = '700 118px "Helvetica Neue", Arial, sans-serif'
  ctx.fillText('0.0', 424, 250)
  ctx.fillStyle = 'rgba(148, 163, 184, 0.9)'
  ctx.font = '600 34px Consolas, "Courier New", monospace'
  ctx.fillText('km/h', 700, 248)

  // 右侧：电量
  ctx.strokeStyle = 'rgba(94, 234, 212, 0.9)'
  ctx.lineWidth = 8
  roundRect(ctx, 836, 76, 128, 72, 12)
  ctx.stroke()
  ctx.fillStyle = 'rgba(94, 234, 212, 0.9)'
  ctx.fillRect(970, 98, 18, 28)
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i < 3 ? '#2dd4bf' : 'rgba(45, 212, 191, 0.18)'
    ctx.fillRect(850 + i * 28, 90, 20, 44)
  }

  // 底部状态灯
  const lamps: Array<[number, string, string]> = [
    [64, '#34d399', 'READY'],
    [300, '#fbbf24', 'CHARGE'],
    [536, '#f87171', 'STOP'],
    [772, '#38bdf8', 'HYD']
  ]
  for (const [x, color, label] of lamps) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, 388, 20, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(226, 232, 240, 0.72)'
    ctx.font = '600 26px Consolas, "Courier New", monospace'
    ctx.fillText(label, x + 34, 398)
  }

  // 运行时
  ctx.fillStyle = '#5eead4'
  ctx.font = '600 58px Consolas, "Courier New", monospace'
  ctx.textAlign = 'right'
  ctx.fillText('1286 h', 960, 400)
  ctx.textAlign = 'left'

  return toTexture(canvas)
}

/* ------------------------------------------------------------------ */
/* 地面：1m 网格 + 展台环 + 中心光池                                     */
/* ------------------------------------------------------------------ */

export function createFloorTexture(): THREE.Texture {
  const size = 2048
  const { canvas, ctx } = createCanvas(size, size)
  const center = size / 2
  const metersRadius = 14 // 圆形地面半径 14m
  const pxPerMeter = size / (metersRadius * 2)

  // 底色：中心偏亮的柔光地坪
  const base = ctx.createRadialGradient(center, center, 0, center, center, center)
  base.addColorStop(0, '#eef2f7')
  base.addColorStop(0.28, '#e7edf3')
  base.addColorStop(0.62, '#dde5ee')
  base.addColorStop(1, '#d5dfe9')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)

  // 1m 工程网格（中心 5m 主网格加深）
  ctx.lineWidth = 1.2
  for (let meter = -14; meter <= 14; meter++) {
    const offset = center + meter * pxPerMeter
    if (meter === 0) continue
    const major = meter % 5 === 0
    ctx.strokeStyle = major ? 'rgba(100, 116, 139, 0.24)' : 'rgba(100, 116, 139, 0.13)'
    ctx.beginPath()
    ctx.moveTo(offset, 0)
    ctx.lineTo(offset, size)
    ctx.moveTo(0, offset)
    ctx.lineTo(size, offset)
    ctx.stroke()
  }

  // 展台环（半径 2.9m）
  ctx.strokeStyle = 'rgba(13, 148, 136, 0.42)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(center, center, 2.9 * pxPerMeter, 0, Math.PI * 2)
  ctx.stroke()

  ctx.strokeStyle = 'rgba(13, 148, 136, 0.2)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(center, center, 3.35 * pxPerMeter, 0, Math.PI * 2)
  ctx.stroke()

  // 环上刻度
  ctx.strokeStyle = 'rgba(13, 148, 136, 0.34)'
  ctx.lineWidth = 2
  for (let i = 0; i < 36; i++) {
    const angle = (i / 36) * Math.PI * 2
    const inner = 3.35 * pxPerMeter
    const outer = inner + (i % 3 === 0 ? 26 : 14)
    ctx.beginPath()
    ctx.moveTo(center + Math.cos(angle) * inner, center + Math.sin(angle) * inner)
    ctx.lineTo(center + Math.cos(angle) * outer, center + Math.sin(angle) * outer)
    ctx.stroke()
  }

  // 中心光池（很轻的白色高光，让车辆落在光里）
  const pool = ctx.createRadialGradient(center, center, 0, center, center, 4.2 * pxPerMeter)
  pool.addColorStop(0, 'rgba(255, 255, 255, 0.30)')
  pool.addColorStop(0.55, 'rgba(255, 255, 255, 0.10)')
  pool.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = pool
  ctx.fillRect(0, 0, size, size)

  // 轻微颗粒，避免大面积渐变出现色带
  ctx.fillStyle = 'rgba(71, 85, 105, 0.035)'
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    ctx.fillRect(x, y, 1.4, 1.4)
  }

  const texture = toTexture(canvas)
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

/* ------------------------------------------------------------------ */
/* 软接触阴影 / 背景渐变 / 灯光光晕                                      */
/* ------------------------------------------------------------------ */

export function createContactShadowTexture(): THREE.Texture {
  const { canvas, ctx } = createCanvas(512, 512)
  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256)
  gradient.addColorStop(0, 'rgba(15, 23, 42, 0.72)')
  gradient.addColorStop(0.4, 'rgba(15, 23, 42, 0.48)')
  gradient.addColorStop(0.7, 'rgba(15, 23, 42, 0.16)')
  gradient.addColorStop(1, 'rgba(15, 23, 42, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 512, 512)
  return toTexture(canvas, false)
}

export function createBackdropTexture(): THREE.Texture {
  const { canvas, ctx } = createCanvas(8, 512)
  const gradient = ctx.createLinearGradient(0, 0, 0, 512)
  gradient.addColorStop(0, '#f6f9fd')
  gradient.addColorStop(0.34, '#eef3f8')
  gradient.addColorStop(0.55, '#e4eaf2')
  gradient.addColorStop(0.63, '#dfe6ee')
  gradient.addColorStop(0.82, '#d8e1ea')
  gradient.addColorStop(1, '#d2dce6')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 8, 512)
  const texture = toTexture(canvas)
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

export function createLensGlowTexture(): THREE.Texture {
  const { canvas, ctx } = createCanvas(256, 256)
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  gradient.addColorStop(0, 'rgba(255, 244, 214, 0.95)')
  gradient.addColorStop(0.22, 'rgba(255, 238, 196, 0.55)')
  gradient.addColorStop(0.55, 'rgba(255, 230, 176, 0.14)')
  gradient.addColorStop(1, 'rgba(255, 230, 176, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 256)
  return toTexture(canvas, false)
}
