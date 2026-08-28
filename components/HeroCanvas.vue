<template>
  <canvas v-if="!isStatic" ref="canvasRef" class="hero-canvas" aria-hidden="true"></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * Hero 粒子连线网络背景（AI 科技感）
 *
 * 渲染策略：
 * - SSR / prefers-reduced-motion / 不支持 canvas：不渲染 canvas，由父级
 *   Hero 区的静态 CSS 光斑层兜底（视觉不空洞）。
 * - 客户端激活后：rAF 驱动粒子漂移 + 近距连线，鼠标邻近吸引；
 *   页面不可见（document.hidden）时暂停节能。
 * - 移动端（pointer: coarse）粒子数减半。
 */

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  r: number
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
const isStatic = ref(true)

let ctx: CanvasRenderingContext2D | null = null
let rafId = 0
let particles: Particle[] = []
let dpr = 1
let cssW = 0
let cssH = 0
let resizeObserver: ResizeObserver | null = null
let mouseX = -9999
let mouseY = -9999

const LINK_DIST = 130 // 粒子连线最大距离（css px）
const MOUSE_DIST = 170 // 鼠标吸引连线距离
const MAX_SPEED = 0.35 // 粒子漂移速度上限（css px/frame）

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function particleCount(): number {
  const coarse =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches
  return coarse ? 30 : 60
}

function randomColor(): string {
  // 品牌色系（sky/teal）随机
  return Math.random() > 0.5 ? '125, 211, 252' : '94, 234, 212'
}

function spawnParticles() {
  const count = particleCount()
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * cssW,
    y: Math.random() * cssH,
    vx: (Math.random() - 0.5) * 2 * MAX_SPEED,
    vy: (Math.random() - 0.5) * 2 * MAX_SPEED,
    r: 1 + Math.random() * 1.6
  }))
  particles.forEach((p) => (p as Particle & { color?: string }).color = randomColor())
}

function resize() {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return
  cssW = rect.width
  cssH = rect.height
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(cssW * dpr)
  canvas.height = Math.round(cssH * dpr)
  ctx = canvas.getContext('2d')
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
  // 尺寸变化后重撒粒子（保持密度观感）
  if (particles.length === 0 || particles.length !== particleCount()) spawnParticles()
}

function step() {
  if (!ctx) return
  ctx.clearRect(0, 0, cssW, cssH)

  // 更新 + 绘制粒子
  for (const p of particles) {
    p.x += p.vx
    p.y += p.vy
    // 边缘环绕
    if (p.x < -20) p.x = cssW + 20
    if (p.x > cssW + 20) p.x = -20
    if (p.y < -20) p.y = cssH + 20
    if (p.y > cssH + 20) p.y = -20
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${(p as Particle & { color?: string }).color}, 0.55)`
    ctx.fill()
  }

  // 近距连线（O(n²) 但 n≤60，单帧可忽略）
  ctx.lineWidth = 1
  for (let i = 0; i < particles.length; i++) {
    const a = particles[i]!
    for (let j = i + 1; j < particles.length; j++) {
      const b = particles[j]!
      const dx = a.x - b.x
      const dy = a.y - b.y
      const dist = Math.hypot(dx, dy)
      if (dist < LINK_DIST) {
        const alpha = (1 - dist / LINK_DIST) * 0.22
        ctx.strokeStyle = `rgba(125, 211, 252, ${alpha})`
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }
    }
    // 鼠标邻近吸引连线
    const mdx = a.x - mouseX
    const mdy = a.y - mouseY
    const mdist = Math.hypot(mdx, mdy)
    if (mdist < MOUSE_DIST) {
      const alpha = (1 - mdist / MOUSE_DIST) * 0.4
      ctx.strokeStyle = `rgba(45, 212, 191, ${alpha})`
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(mouseX, mouseY)
      ctx.stroke()
    }
  }

  rafId = requestAnimationFrame(step)
}

function onMouseMove(e: MouseEvent) {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  mouseX = e.clientX - rect.left
  mouseY = e.clientY - rect.top
}
function onMouseLeave() {
  mouseX = -9999
  mouseY = -9999
}

function onVisibility() {
  if (document.hidden) {
    cancelAnimationFrame(rafId)
  } else {
    rafId = requestAnimationFrame(step)
  }
}

onMounted(() => {
  if (prefersReducedMotion()) return // 保持 isStatic，父级静态光斑兜底
  const canvas = canvasRef.value
  if (!canvas) return
  ctx = canvas.getContext('2d')
  if (!ctx) return
  isStatic.value = false

  // canvas v-if 渲染后需要等一帧才能量到尺寸
  requestAnimationFrame(() => {
    resize()
    rafId = requestAnimationFrame(step)
  })

  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas)
  window.addEventListener('mousemove', onMouseMove, { passive: true })
  window.addEventListener('mouseout', onMouseLeave)
  document.addEventListener('visibilitychange', onVisibility)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  resizeObserver?.disconnect()
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseout', onMouseLeave)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<style scoped>
.hero-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
</style>
