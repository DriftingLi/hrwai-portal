import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js'
import { loadForkliftModel, type ForkliftModel } from './model'
import { FORKLIFT_VIEWS, type ForkliftViewId } from './views'
import { disposeObject3D } from './dispose'
import {
  createBackdropTexture,
  createContactShadowTexture,
  createFloorTexture
} from './textures'

/**
 * 防爆叉车 3D 展台：一束主光 + 环境贴图 + 轻雾地坪。
 * 只在客户端创建（组件挂载后动态 import 本模块），不参与 SSR。
 *
 * 模型来自 GLB，加载是异步的；加载完成后按 bbox 计算观察目标与镜头距离，
 * 再渲染首帧并通知组件。移动端降低 DPR / 阴影分辨率，并关闭 RectAreaLight。
 */

export type { ForkliftViewId, ForkliftViewPreset } from './views'
export { FORKLIFT_VIEWS } from './views'

export interface ForkliftSceneHandle {
  setView: (id: ForkliftViewId, animate?: boolean) => void
  resetView: () => void
  setAutoRotate: (on: boolean) => void
  zoomBy: (factor: number) => void
  getActiveView: () => ForkliftViewId | null
  getFps: () => number
  dispose: () => void
}

export interface ForkliftSceneOptions {
  canvas: HTMLCanvasElement
  container: HTMLElement
  reducedMotion?: boolean
  onReady?: () => void
  onProgress?: (percent: number) => void
  onViewChange?: (id: ForkliftViewId | null) => void
  onAutoRotateChange?: (on: boolean) => void
}

const INITIAL_TARGET = new THREE.Vector3(0, 0.9, 0.3)
const MIN_POLAR = 0.16
const MAX_POLAR = Math.PI / 2 - 0.035
const INTRO_SCALE = 1.16

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function createSceneError(message: string, code: 'webgl' | 'model', cause?: unknown) {
  const error = new Error(message) as Error & { code?: string; cause?: unknown }
  error.code = code
  if (cause !== undefined) error.cause = cause
  return error
}

export async function createForkliftScene(
  options: ForkliftSceneOptions
): Promise<ForkliftSceneHandle> {
  const { canvas, container } = options
  const reducedMotion = options.reducedMotion ?? false
  const isMobile =
    window.matchMedia('(max-width: 767px)').matches ||
    (navigator.maxTouchPoints ?? 0) > 1
  const dprCap = isMobile ? 1.5 : 2

  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
      preserveDrawingBuffer: import.meta.dev
    })
  } catch (reason) {
    throw createSceneError('WebGL 初始化失败', 'webgl', reason)
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.95
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xe0e7ef)
  scene.fog = new THREE.Fog(0xe0e7ef, 11, 27)

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 140)

  /* ---------------- 环境 ---------------- */

  const backdropTexture = createBackdropTexture()
  const backdrop = new THREE.Mesh(
    new THREE.SphereGeometry(60, 40, 20),
    new THREE.MeshBasicMaterial({
      map: backdropTexture,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      toneMapped: false
    })
  )
  scene.add(backdrop)

  const floorTexture = createFloorTexture()
  floorTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(14, 96),
    new THREE.MeshStandardMaterial({
      map: floorTexture,
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0
    })
  )
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)

  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 3.4),
    new THREE.MeshBasicMaterial({
      map: createContactShadowTexture(),
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      toneMapped: false
    })
  )
  contactShadow.rotation.x = -Math.PI / 2
  contactShadow.position.set(0, 0.004, 0.55)
  contactShadow.renderOrder = 1
  scene.add(contactShadow)

  // 环境反射：RoomEnvironment 提供柔和的高光，不额外加载 HDR
  const pmrem = new THREE.PMREMGenerator(renderer)
  const roomEnvironment = new RoomEnvironment()
  const environmentTarget = pmrem.fromScene(roomEnvironment, 0.04)
  scene.environment = environmentTarget.texture
  scene.environmentIntensity = 0.55
  pmrem.dispose()
  const roomDisposable = roomEnvironment as unknown as { dispose?: () => void }
  roomDisposable.dispose?.()

  /* ---------------- 灯光 ---------------- */

  const keyLight = new THREE.DirectionalLight(0xfff7ec, 3.4)
  keyLight.position.set(4.4, 7.6, 5.4)
  keyLight.target.position.set(0, 0.5, 0.1)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048)
  keyLight.shadow.camera.left = -5
  keyLight.shadow.camera.right = 5
  keyLight.shadow.camera.top = 5
  keyLight.shadow.camera.bottom = -5
  keyLight.shadow.camera.near = 0.5
  keyLight.shadow.camera.far = 22
  keyLight.shadow.bias = -0.00035
  keyLight.shadow.normalBias = 0.022
  keyLight.shadow.radius = 3
  scene.add(keyLight)
  scene.add(keyLight.target)

  const fillLight = new THREE.DirectionalLight(0xdde9ff, 0.3)
  fillLight.position.set(-6, 4.2, 3.2)
  scene.add(fillLight)

  const rimLight = new THREE.DirectionalLight(0xffffff, 1.2)
  rimLight.position.set(-3.2, 4.6, -6.2)
  scene.add(rimLight)

  const ambient = new THREE.HemisphereLight(0xffffff, 0x8e99a6, 0.26)
  scene.add(ambient)

  if (!isMobile) {
    RectAreaLightUniformsLib.init()
    const softbox = new THREE.RectAreaLight(0xffffff, 1.15, 6.4, 3.2)
    softbox.position.set(1.2, 4.6, 3.6)
    softbox.lookAt(0, 1.2, 0)
    scene.add(softbox)
  }

  /* ---------------- 车辆 ---------------- */

  let forklift: ForkliftModel
  try {
    forklift = await loadForkliftModel({ onProgress: options.onProgress })
  } catch (reason) {
    disposeObject3D(scene)
    environmentTarget.dispose()
    renderer.dispose()
    throw createSceneError('三维模型加载失败', 'model', reason)
  }
  scene.add(forklift.group)

  const bounds = new THREE.Box3().setFromObject(forklift.group)
  const size = bounds.getSize(new THREE.Vector3())
  const lookTarget = new THREE.Vector3(
    0,
    bounds.min.y + size.y * 0.42,
    bounds.min.z + size.z * 0.38
  )
  // 新模型比旧程序化模型高约 11%，统一放远一点，避免顶部被裁。
  const fitScale = clamp(Math.max(size.y / 2.08, size.z / 3.66), 0.9, 1.2)

  /* ---------------- 相机控制 ---------------- */

  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.075
  controls.enablePan = false
  controls.minDistance = 2.8
  controls.maxDistance = 11
  controls.minPolarAngle = MIN_POLAR
  controls.maxPolarAngle = MAX_POLAR
  controls.rotateSpeed = 0.72
  controls.zoomSpeed = 0.9
  controls.autoRotateSpeed = 0.55
  controls.target.copy(INITIAL_TARGET)
  // 展台页是上下滚动页面：只接管水平拖拽，垂直手势继续滚页
  canvas.style.touchAction = 'pan-y'

  let activeView: ForkliftViewId | null = 'front34'
  let autoRotate = false
  let needsRender = true
  let running = false
  let raf = 0
  let frames = 0
  let fps = 0
  let sampleStart = performance.now()
  let inView = true
  let disposed = false

  interface CameraTween {
    from: THREE.Vector3
    to: THREE.Vector3
    start: number
    duration: number
    intro?: boolean
  }
  let tween: CameraTween | null = null

  function frameScale() {
    const aspect = camera.aspect || 1
    return 1 + Math.max(0, 1.2 - aspect) * 0.3
  }

  function viewPosition(id: ForkliftViewId, scale = 1) {
    const preset = FORKLIFT_VIEWS.find((item) => item.id === id) ?? FORKLIFT_VIEWS[0]!
    const direction = new THREE.Vector3(...preset.direction).normalize()
    return lookTarget
      .clone()
      .addScaledVector(direction, preset.distance * frameScale() * fitScale * scale)
  }

  function markView(id: ForkliftViewId | null) {
    activeView = id
    options.onViewChange?.(id)
  }

  function applyView(id: ForkliftViewId, animate = true) {
    const preset = FORKLIFT_VIEWS.find((item) => item.id === id)
    if (!preset) return
    const to = viewPosition(id)
    const from = camera.position.clone()
    const duration = reducedMotion ? 0 : 760
    tween = animate && duration > 0
      ? { from, to, start: performance.now(), duration }
      : null
    if (!tween) {
      camera.position.copy(to)
      controls.target.copy(lookTarget)
      controls.update()
    }
    markView(id)
    needsRender = true
  }

  function setAutoRotate(on: boolean) {
    autoRotate = on
    controls.autoRotate = on
    if (on) {
      tween = null
      markView(null)
    }
    needsRender = true
    options.onAutoRotateChange?.(on)
  }

  function zoomBy(factor: number) {
    const offset = camera.position.clone().sub(controls.target)
    const distance = clamp(
      offset.length() * factor,
      controls.minDistance,
      controls.maxDistance
    )
    offset.setLength(distance)
    camera.position.copy(controls.target).add(offset)
    controls.update()
    tween = null
    markView(null)
    needsRender = true
  }

  const onControlsStart = () => {
    tween = null
    if (autoRotate) setAutoRotate(false)
    if (activeView) markView(null)
  }
  controls.addEventListener('start', onControlsStart)
  const onControlsChange = () => {
    needsRender = true
  }
  controls.addEventListener('change', onControlsChange)

  /* ---------------- 尺寸 / 循环 ---------------- */

  function resize() {
    const width = container.clientWidth || 640
    const height = container.clientHeight || 420
    const aspect = width / height
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap))
    renderer.setSize(width, height, false)
    camera.aspect = aspect
    camera.fov = clamp(38 + Math.max(0, 1.35 - aspect) * 20, 38, 53)
    camera.updateProjectionMatrix()
    needsRender = true
  }

  function tick(now: number) {
    if (!running) return
    raf = requestAnimationFrame(tick)

    if (tween) {
      const progress = clamp((now - tween.start) / tween.duration, 0, 1)
      const eased = easeInOutCubic(progress)
      camera.position.lerpVectors(tween.from, tween.to, eased)
      controls.target.copy(lookTarget)
      if (progress >= 1) {
        tween = null
        camera.position.copy(viewPosition(activeView ?? 'front34'))
      }
      needsRender = true
    }

    if (autoRotate) needsRender = true

    controls.update()

    if (needsRender) {
      renderer.render(scene, camera)
      needsRender = false
      frames += 1
    }

    if (now - sampleStart >= 1000) {
      fps = Math.round((frames * 1000) / (now - sampleStart))
      frames = 0
      sampleStart = now
    }
  }

  function updateRunning() {
    const shouldRun = inView && !document.hidden && !disposed
    if (shouldRun && !running) {
      running = true
      sampleStart = performance.now()
      frames = 0
      needsRender = true
      raf = requestAnimationFrame(tick)
    } else if (!shouldRun && running) {
      running = false
      cancelAnimationFrame(raf)
      raf = 0
    }
  }

  /* ---------------- 观察者 / 事件 ---------------- */

  const intersectionObserver = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      inView = entry ? entry.isIntersecting : true
      if (inView) {
        resize()
        needsRender = true
      }
      updateRunning()
    },
    { threshold: 0.01 }
  )
  intersectionObserver.observe(container)

  const resizeObserver = new ResizeObserver(() => {
    resize()
    needsRender = true
  })
  resizeObserver.observe(container)

  const onVisibilityChange = () => updateRunning()
  document.addEventListener('visibilitychange', onVisibilityChange)

  const onContextLost = (event: Event) => {
    event.preventDefault()
    running = false
    cancelAnimationFrame(raf)
    raf = 0
  }
  const onContextRestored = () => {
    renderer.shadowMap.needsUpdate = true
    needsRender = true
    updateRunning()
  }
  canvas.addEventListener('webglcontextlost', onContextLost, false)
  canvas.addEventListener('webglcontextrestored', onContextRestored, false)

  /* ---------------- 初始化 ---------------- */

  resize()
  controls.target.copy(lookTarget)
  camera.position.copy(viewPosition('front34', reducedMotion ? 1 : INTRO_SCALE))
  controls.update()
  markView('front34')

  // 首帧：立即渲染，让加载遮罩淡出时已有画面
  renderer.shadowMap.needsUpdate = true
  renderer.render(scene, camera)
  renderer.shadowMap.autoUpdate = false
  needsRender = false
  options.onReady?.()

  if (!reducedMotion) {
    tween = {
      from: camera.position.clone(),
      to: viewPosition('front34'),
      start: performance.now(),
      duration: 1250,
      intro: true
    }
  }

  updateRunning()

  /* ---------------- dev 工具 ---------------- */

  function captureSnapshot() {
    const width = 828
    const height = 621
    const previousSize = renderer.getSize(new THREE.Vector2())
    const previousPixelRatio = renderer.getPixelRatio()
    const previousAspect = camera.aspect
    const previousFov = camera.fov
    const previousPosition = camera.position.clone()
    const previousTarget = controls.target.clone()

    renderer.setPixelRatio(1)
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.fov = 38
    camera.updateProjectionMatrix()
    controls.target.copy(lookTarget)
    camera.position.copy(viewPosition('front34'))
    controls.update()
    renderer.shadowMap.needsUpdate = true
    renderer.render(scene, camera)

    const data = renderer.domElement.toDataURL('image/png')

    renderer.setPixelRatio(previousPixelRatio)
    renderer.setSize(previousSize.x, previousSize.y, false)
    camera.aspect = previousAspect
    camera.fov = previousFov
    camera.updateProjectionMatrix()
    camera.position.copy(previousPosition)
    controls.target.copy(previousTarget)
    controls.update()
    needsRender = true

    return data
  }

  if (import.meta.dev) {
    ;(window as unknown as Record<string, unknown>).__FORKLIFT_SCENE__ = {
      setView: (id: ForkliftViewId) => applyView(id),
      resetView: () => {
        setAutoRotate(false)
        applyView('front34')
      },
      setAutoRotate,
      zoomBy,
      getActiveView: () => activeView,
      getFps: () => fps,
      stats: () => ({
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        fps
      }),
      snapshot: captureSnapshot,
      downloadPreview: () => {
        const link = document.createElement('a')
        link.href = captureSnapshot()
        link.download = 'forklift-preview.png'
        document.body.appendChild(link)
        link.click()
        link.remove()
      },
      camera,
      controls,
      renderer,
      scene,
      forklift: forklift.group
    }
  }

  return {
    setView: applyView,
    resetView: () => {
      setAutoRotate(false)
      applyView('front34')
    },
    setAutoRotate,
    zoomBy,
    getActiveView: () => activeView,
    getFps: () => fps,
    dispose: () => {
      if (disposed) return
      disposed = true
      running = false
      cancelAnimationFrame(raf)
      raf = 0
      intersectionObserver.disconnect()
      resizeObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      canvas.removeEventListener('webglcontextrestored', onContextRestored)
      controls.removeEventListener('start', onControlsStart)
      controls.removeEventListener('change', onControlsChange)
      controls.dispose()
      if (import.meta.dev) {
        delete (window as unknown as Record<string, unknown>).__FORKLIFT_SCENE__
      }
      scene.remove(forklift.group)
      forklift.dispose()
      disposeObject3D(scene)
      environmentTarget.dispose()
      renderer.dispose()
    }
  }
}
