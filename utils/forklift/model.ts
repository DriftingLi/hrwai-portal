import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import {
  addRounded,
  beamBetween,
  cylinderBetween,
  planeWithTexture,
  roundedBox,
  setShadow
} from './geometry'
import { disposeObject3D } from './dispose'
import {
  createDashTexture,
  createExBadgeTexture,
  createLensGlowTexture,
  createMastLabelTexture,
  createSideDecalTexture
} from './textures'

/**
 * 1.5 吨防爆蓄电池叉车。
 *
 * 几何来自 CC0 的 Innerscene Electric counterbalance forklift（见
 * public/models/forklift/README.md），加载后在这里做三件事：
 *   1. 按节点名把原模型的 5 个纯色材质换成红漆/黑门架/钢货叉等展台材质；
 *   2. 追加 Ex 贴花、铭牌、警示灯、后视镜、挡货架、胎面等品牌细节；
 *   3. 按材质合并静态网格，把 81 个 Mesh 收敛到十几个 draw call。
 *
 * 坐标约定与原模型一致：+Z 车头，+X 车右，Y 向上，地面 y = 0。
 */

export const FORKLIFT_MODEL_URL = '/models/forklift/explosion-proof-forklift.v2.glb'

const SIDE_X = 0.48
const SIDE_FACE_X = SIDE_X + 0.0015
const COUNTERWEIGHT_REAR_Z = -0.945
const REAR_FACE_Z = COUNTERWEIGHT_REAR_Z - 0.0015
const MAST_FACE_X = 0.48 + 0.0015
const MAST_Z = 0.94
const GUARD_TOP_Y = 2.183
// 叉车停放时货叉应接近地面；把源模型的货叉/货叉架整体下移 6cm。
const FORK_DROP = 0.06

export interface ForkliftModel {
  group: THREE.Group
  dispose: () => void
}

export interface LoadForkliftOptions {
  url?: string
  onProgress?: (percent: number) => void
}

export type ForkliftMaterialKey =
  | 'paint'
  | 'guardMetal'
  | 'chassis'
  | 'forkSteel'
  | 'chainSteel'
  | 'rimSteel'
  | 'chrome'
  | 'brake'
  | 'rubber'
  | 'leather'
  | 'blackPlastic'
  | 'hazardYellow'

interface Materials {
  paint: THREE.MeshPhysicalMaterial
  guardMetal: THREE.MeshStandardMaterial
  chassis: THREE.MeshStandardMaterial
  forkSteel: THREE.MeshStandardMaterial
  chainSteel: THREE.MeshStandardMaterial
  rimSteel: THREE.MeshStandardMaterial
  chrome: THREE.MeshStandardMaterial
  brake: THREE.MeshStandardMaterial
  rubber: THREE.MeshStandardMaterial
  leather: THREE.MeshPhysicalMaterial
  blackPlastic: THREE.MeshStandardMaterial
  hazardYellow: THREE.MeshStandardMaterial
  decal: THREE.MeshStandardMaterial
  badge: THREE.MeshStandardMaterial
  label: THREE.MeshStandardMaterial
  screen: THREE.MeshBasicMaterial
  lensWhite: THREE.MeshStandardMaterial
  lensRed: THREE.MeshStandardMaterial
  lensAmber: THREE.MeshStandardMaterial
  mirror: THREE.MeshStandardMaterial
  glowRed: THREE.SpriteMaterial
}

/* ------------------------------------------------------------------ */
/* 材质                                                                */
/* ------------------------------------------------------------------ */

function createMaterials(): Materials {
  const sideDecal = createSideDecalTexture()
  const exBadge = createExBadgeTexture()
  const mastLabel = createMastLabelTexture()
  const dash = createDashTexture()
  const glow = createLensGlowTexture()

  const paint = new THREE.MeshPhysicalMaterial({
    color: 0xc81e28,
    metalness: 0.15,
    roughness: 0.36,
    clearcoat: 0.65,
    clearcoatRoughness: 0.16,
    envMapIntensity: 1.05
  })

  const guardMetal = new THREE.MeshStandardMaterial({
    color: 0x24282e,
    metalness: 0.55,
    roughness: 0.48
  })

  const chassis = new THREE.MeshStandardMaterial({
    color: 0x1a1d22,
    metalness: 0.4,
    roughness: 0.55
  })

  const forkSteel = new THREE.MeshStandardMaterial({
    color: 0xa8b0b8,
    metalness: 0.85,
    roughness: 0.34
  })

  const chainSteel = new THREE.MeshStandardMaterial({
    color: 0x6c737b,
    metalness: 0.8,
    roughness: 0.42
  })

  const rimSteel = new THREE.MeshStandardMaterial({
    color: 0x8b939c,
    metalness: 0.8,
    roughness: 0.42
  })

  const chrome = new THREE.MeshStandardMaterial({
    color: 0xd5dce4,
    metalness: 1,
    roughness: 0.16
  })

  const brake = new THREE.MeshStandardMaterial({
    color: 0x3a3f46,
    metalness: 0.6,
    roughness: 0.55
  })

  const rubber = new THREE.MeshStandardMaterial({
    color: 0x0a0b0d,
    metalness: 0,
    roughness: 0.93
  })

  const leather = new THREE.MeshPhysicalMaterial({
    color: 0x111418,
    metalness: 0,
    roughness: 0.55,
    clearcoat: 0.2,
    clearcoatRoughness: 0.6,
    sheen: 0.3,
    sheenColor: new THREE.Color(0x2a2f36),
    sheenRoughness: 0.9
  })

  const blackPlastic = new THREE.MeshStandardMaterial({
    color: 0x15181c,
    metalness: 0.05,
    roughness: 0.7,
    side: THREE.DoubleSide
  })

  const hazardYellow = new THREE.MeshStandardMaterial({
    color: 0xe7b51a,
    metalness: 0.1,
    roughness: 0.5
  })

  const decal = new THREE.MeshStandardMaterial({
    map: sideDecal,
    transparent: true,
    roughness: 0.5,
    metalness: 0.02,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  })

  const badge = new THREE.MeshStandardMaterial({
    map: exBadge,
    transparent: true,
    roughness: 0.42,
    metalness: 0.03,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  })

  const label = new THREE.MeshStandardMaterial({
    map: mastLabel,
    roughness: 0.5,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  })

  const screen = new THREE.MeshBasicMaterial({
    map: dash,
    toneMapped: false
  })

  const lensWhite = new THREE.MeshStandardMaterial({
    color: 0xfff5dc,
    emissive: new THREE.Color(0xffe8b0),
    emissiveIntensity: 1.45,
    roughness: 0.24,
    metalness: 0.1
  })

  const lensRed = new THREE.MeshStandardMaterial({
    color: 0xff3a2f,
    emissive: new THREE.Color(0xd51d17),
    emissiveIntensity: 0.9,
    roughness: 0.3
  })

  const lensAmber = new THREE.MeshStandardMaterial({
    color: 0xffb03a,
    emissive: new THREE.Color(0xd97c10),
    emissiveIntensity: 0.75,
    roughness: 0.3
  })

  const mirror = new THREE.MeshStandardMaterial({
    color: 0xdfe8f2,
    metalness: 1,
    roughness: 0.06,
    envMapIntensity: 1.4
  })

  const glowMaterial = (color: number) =>
    new THREE.SpriteMaterial({
      map: glow,
      color,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false
    })

  const materials: Materials = {
    paint,
    guardMetal,
    chassis,
    forkSteel,
    chainSteel,
    rimSteel,
    chrome,
    brake,
    rubber,
    leather,
    blackPlastic,
    hazardYellow,
    decal,
    badge,
    label,
    screen,
    lensWhite,
    lensRed,
    lensAmber,
    mirror,
    glowRed: glowMaterial(0xff6a5c)
  }

  // 给材质补上可读名字，便于 dev stats / WebGL 检查时辨认。
  for (const [key, value] of Object.entries(materials)) {
    if (value instanceof THREE.Material) value.name = key
  }

  return materials
}

/**
 * 原模型有些命名容易踩坑：
 * - “Steering wheel_tire / _rim / _hub” 其实是后轮；
 * - 真正的方向盘节点叫 “Steering wheel”（没有下划线）；
 * - “Overhead guard / Outer mast / Inner mast” 共用一个 steel 材质。
 * 所以按节点名而不是原材质名映射。
 */
/** gltfpack 会把 Mesh 放到命名的父节点下面，子 Mesh 名可能是 mesh_0。 */
const SEMANTIC_PART =
  /^(Battery compartment|Carriage|Chassis|Control lever|Counterweight|Drive wheel|Foot platform|Fork|Inner mast|Lever knob|Lift |Mast crossmember|Outer mast|Overhead guard|Seat|Steering |Tilt )/i

function isSemanticPartName(name: string) {
  return SEMANTIC_PART.test(name.replace(/[_.]+/g, ' ').replace(/\s+/g, ' ').trim())
}

/** 从 Mesh 自身或父节点里挑出语义化的零件名。 */
export function partNodeName(mesh: THREE.Mesh): string {
  const names = [mesh.name, mesh.parent?.name].filter(
    (name): name is string => Boolean(name)
  )
  return names.find(isSemanticPartName) ?? names[0] ?? ''
}

export function materialForNode(name: string, original: string): ForkliftMaterialKey {
  // GLTFLoader 会把节点名里的空格/点转成下划线（Fork blade → Fork_blade），
  // 这里先归一化，再做语义匹配。
  const normalized = name.replace(/[_.]+/g, ' ').replace(/\s+/g, ' ').trim()

  // 真正的方向盘是 “Steering wheel”，后轮是 “Steering wheel_tire / _rim / ...”
  if (/^Steering wheel$/i.test(normalized)) return 'blackPlastic'
  if (/^(Drive|Steering) wheel\b/i.test(normalized)) {
    if (/tire/i.test(normalized)) return 'rubber'
    if (/brake/i.test(normalized)) return 'brake'
    if (/hub/i.test(normalized)) return 'chrome'
    if (/rim|spoke/i.test(normalized)) return 'rimSteel'
  }
  if (/Steering column/i.test(normalized)) return 'blackPlastic'
  if (/Lever knob/i.test(normalized)) return 'hazardYellow'
  if (/Control lever/i.test(normalized)) return 'chrome'
  if (/Lift rod|Tilt rod/i.test(normalized)) return 'chrome'
  if (/Lift cylinder|Tilt cylinder/i.test(normalized)) return 'guardMetal'
  if (/Lift chain/i.test(normalized)) return 'chainSteel'
  if (/Fork|Carriage/i.test(normalized)) return 'forkSteel'
  if (/Seat/i.test(normalized)) return 'leather'
  if (/Overhead guard|Mast/i.test(normalized)) return 'guardMetal'
  if (/Chassis|Foot platform/i.test(normalized)) return 'chassis'
  if (/Battery compartment|Counterweight/i.test(normalized)) return 'paint'

  switch (original.toLowerCase()) {
    case 'orange':
      return 'paint'
    case 'steel':
      return 'guardMetal'
    case 'black':
      return 'blackPlastic'
    case 'chrome':
      return 'chrome'
    case 'rubber':
      return 'rubber'
    default:
      return 'guardMetal'
  }
}

function applyMaterials(root: THREE.Object3D, materials: Materials) {
  const originals = new Set<THREE.Material>()

  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return

    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const material of list) {
      if (material) originals.add(material)
    }

    const key = materialForNode(partNodeName(mesh), list[0]?.name ?? '')
    mesh.material = materials[key]
    mesh.castShadow = true
    mesh.receiveShadow = true
  })

  return originals
}

function disposeMaterials(materials: Materials) {
  const textures = new Set<THREE.Texture>()
  for (const value of Object.values(materials)) {
    if (!(value instanceof THREE.Material)) continue
    for (const nested of Object.values(value)) {
      if (nested instanceof THREE.Texture) textures.add(nested)
    }
    value.dispose()
  }
  textures.forEach((texture) => texture.dispose())
}

/* ------------------------------------------------------------------ */
/* 品牌件                                                              */
/* ------------------------------------------------------------------ */

function addGlow(
  parent: THREE.Object3D,
  material: THREE.SpriteMaterial,
  size: number,
  x: number,
  y: number,
  z: number
) {
  const sprite = new THREE.Sprite(material)
  sprite.position.set(x, y, z)
  sprite.scale.set(size, size, 1)
  parent.add(sprite)
  return sprite
}

/** 把源模型的货叉/货叉架整体下移，避免叉尖悬在半空。 */
function lowerForkAssembly(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!/^(Carriage|Fork_)/i.test(object.name)) return
    object.position.y -= FORK_DROP
    object.updateMatrix()
  })
}

function buildTread(materials: Materials) {  const specs = [
    { x: 0.5, y: 0.28, z: 0.53, radius: 0.28, width: 0.17, count: 18 },
    { x: -0.5, y: 0.28, z: 0.53, radius: 0.28, width: 0.17, count: 18 },
    { x: 0.432, y: 0.215, z: -0.67, radius: 0.215, width: 0.15, count: 14 },
    { x: -0.432, y: 0.215, z: -0.67, radius: 0.215, width: 0.15, count: 14 }
  ]

  const geometry = new THREE.BoxGeometry(1, 0.006, 0.09)
  const total = specs.reduce((sum, spec) => sum + spec.count, 0)
  const tread = new THREE.InstancedMesh(geometry, materials.rubber, total)
  tread.name = 'tread-blocks'
  tread.frustumCulled = false
  tread.castShadow = true
  tread.receiveShadow = true

  const dummy = new THREE.Object3D()
  let index = 0
  for (const spec of specs) {
    for (let i = 0; i < spec.count; i += 1) {
      const angle = (i / spec.count) * Math.PI * 2
      const radius = spec.radius + 0.003
      dummy.position.set(
        spec.x,
        spec.y + Math.sin(angle) * radius,
        spec.z + Math.cos(angle) * radius
      )
      dummy.rotation.set(angle - Math.PI / 2, 0, 0)
      dummy.rotateY(i % 2 === 0 ? 0.22 : -0.22)
      dummy.scale.set(spec.width, 1, 1)
      dummy.updateMatrix()
      tread.setMatrixAt(index, dummy.matrix)
      index += 1
    }
  }
  tread.instanceMatrix.needsUpdate = true
  return tread
}

function buildBranding(materials: Materials) {
  const group = new THREE.Group()
  group.name = 'branding'
  const decor = new THREE.Group()
  decor.name = 'branding-decor'

  /* 侧贴花 / Ex 徽标 / 车尾徽标 / 门架铭牌 */
  for (const side of [1, -1]) {
    const decal = planeWithTexture(0.54, 0.27, materials.decal)
    decal.position.set(side * SIDE_FACE_X, 0.7, -0.1)
    decal.rotation.y = (side * Math.PI) / 2
    decor.add(decal)

    const badge = planeWithTexture(0.1, 0.1, materials.badge)
    badge.position.set(side * SIDE_FACE_X, 0.8, 0.2)
    badge.rotation.y = (side * Math.PI) / 2
    decor.add(badge)
  }

  const rearBadge = planeWithTexture(0.16, 0.16, materials.badge)
  rearBadge.position.set(0, 0.78, REAR_FACE_Z)
  rearBadge.rotation.y = Math.PI
  decor.add(rearBadge)

  const mastLabel = planeWithTexture(0.12, 0.15, materials.label)
  mastLabel.position.set(MAST_FACE_X, 1.4, MAST_Z)
  mastLabel.rotation.y = Math.PI / 2
  decor.add(mastLabel)

  /* 配重侧散热格栅 + 登车踏步 */
  for (const side of [1, -1]) {
    addRounded(group, 0.012, 0.17, 0.27, 0.008, side * 0.516, 0.78, -0.75, materials.blackPlastic, 2)
    for (let i = 0; i < 4; i += 1) {
      addRounded(
        group,
        0.012,
        0.012,
        0.22,
        0.004,
        side * 0.522,
        0.725 + i * 0.04,
        -0.75,
        materials.guardMetal,
        2
      )
    }
    addRounded(group, 0.08, 0.026, 0.26, 0.008, side * 0.516, 0.44, 0.05, materials.guardMetal, 2)
  }

  /* 顶部警示灯 */
  addRounded(
    group,
    0.11,
    0.035,
    0.11,
    0.012,
    -0.3,
    GUARD_TOP_Y + 0.008,
    0.28,
    materials.guardMetal
  )
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    materials.lensRed
  )
  beacon.position.set(-0.3, GUARD_TOP_Y + 0.026, 0.28)
  decor.add(beacon)
  addGlow(decor, materials.glowRed, 0.18, -0.3, GUARD_TOP_Y + 0.075, 0.28)

  /* 前工作灯 */
  for (const x of [-0.23, 0.23]) {
    const housing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.05, 0.09, 16).rotateX(Math.PI / 2),
      materials.guardMetal
    )
    housing.position.set(x, 2.14, 0.64)
    group.add(housing)

    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.038, 18), materials.lensWhite)
    lens.position.set(x, 2.14, 0.686)
    decor.add(lens)
  }

  /* 后视镜 */
  for (const side of [1, -1]) {
    group.add(
      cylinderBetween(
        new THREE.Vector3(side * 0.5, 1.56, 0.56),
        new THREE.Vector3(side * 0.56, 1.65, 0.56),
        0.012,
        materials.guardMetal,
        8
      )
    )

    const housing = roundedBox(0.1, 0.08, 0.025, 0.008, materials.blackPlastic)
    housing.position.set(side * 0.565, 1.66, 0.56)
    group.add(housing)

    const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.088, 0.068), materials.mirror)
    glass.position.set(side * 0.565, 1.66, 0.546)
    glass.rotation.y = Math.PI
    decor.add(glass)
  }

  /* 挡泥板 */
  for (const side of [1, -1]) {
    const front = roundedBox(0.22, 0.28, 0.012, 0.005, materials.blackPlastic, 2)
    front.position.set(side * 0.5, 0.17, 0.22)
    group.add(front)

    const rear = roundedBox(0.18, 0.24, 0.012, 0.005, materials.blackPlastic, 2)
    rear.position.set(side * 0.432, 0.14, -0.91)
    group.add(rear)
  }

  /* 安全带 + 卡扣 */
  group.add(
    beamBetween(
      new THREE.Vector3(-0.2, 1.35, -0.32),
      new THREE.Vector3(0.12, 1.0, -0.32),
      0.055,
      0.012,
      materials.blackPlastic
    )
  )
  addRounded(group, 0.055, 0.07, 0.03, 0.008, 0.12, 1.03, -0.32, materials.chrome, 2)

  /* 挡货架 */
  for (let i = 0; i < 5; i += 1) {
    addRounded(
      group,
      0.03,
      0.39,
      0.03,
      0.008,
      -0.24 + i * 0.12,
      0.925 - FORK_DROP,
      1.08,
      materials.forkSteel,
      2
    )
  }
  addRounded(group, 0.51, 0.04, 0.04, 0.01, 0, 1.12 - FORK_DROP, 1.08, materials.forkSteel, 2)

  /* 液压软管 */
  for (const x of [0.44, 0.46]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, 0.55, 0.62),
      new THREE.Vector3(x, 0.78, 0.72),
      new THREE.Vector3(x, 0.98, 0.86),
      new THREE.Vector3(x, 1.22, 0.93)
    ])
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.012, 8, false), materials.rubber))
  }
  addRounded(group, 0.045, 0.06, 0.04, 0.008, 0.45, 0.9, 0.9, materials.guardMetal, 2)

  /* 拖车销 */
  const towPin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.045, 0.12, 14).rotateX(Math.PI / 2),
    materials.chainSteel
  )
  towPin.position.set(0, 0.4, -1.02)
  group.add(towPin)
  addRounded(group, 0.18, 0.08, 0.03, 0.01, 0, 0.4, -0.97, materials.chassis, 2)

  /* 后扶手 */
  for (const x of [-0.22, 0.22]) {
    group.add(
      cylinderBetween(
        new THREE.Vector3(x, 1.05, -0.93),
        new THREE.Vector3(x, 1.14, -0.93),
        0.015,
        materials.guardMetal,
        8
      )
    )
  }
  group.add(
    cylinderBetween(
      new THREE.Vector3(-0.22, 1.14, -0.93),
      new THREE.Vector3(0.22, 1.14, -0.93),
      0.015,
      materials.guardMetal,
      8
    )
  )

  /* 尾灯 */
  for (const side of [1, -1]) {
    addRounded(group, 0.13, 0.1, 0.035, 0.012, side * 0.4, 0.95, COUNTERWEIGHT_REAR_Z, materials.guardMetal, 2)

    const tail = planeWithTexture(0.07, 0.055, materials.lensRed)
    tail.position.set(side * 0.395, 0.95, -0.966)
    tail.rotation.y = Math.PI
    decor.add(tail)

    const amber = planeWithTexture(0.035, 0.055, materials.lensAmber)
    amber.position.set(side * 0.45, 0.95, -0.966)
    amber.rotation.y = Math.PI
    decor.add(amber)
  }

  /* 仪表台 + 屏幕 + 指示灯 + 急停 */
  const consoleBox = roundedBox(0.4, 0.16, 0.2, 0.04, materials.blackPlastic)
  consoleBox.position.set(0, 1.08, 0.47)
  consoleBox.rotation.x = -0.2
  group.add(consoleBox)

  const screen = planeWithTexture(0.28, 0.14, materials.screen)
  screen.position.set(0, 1.09, 0.365)
  screen.rotation.y = Math.PI
  screen.rotation.x = 0.2
  decor.add(screen)

  for (const [x, material] of [
    [-0.17, materials.lensAmber],
    [0.17, materials.lensRed]
  ] as const) {
    const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.012, 12), material)
    lamp.position.set(x, 1.09, 0.371)
    lamp.rotation.y = Math.PI
    decor.add(lamp)
  }

  const eStop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.022, 14).rotateX(Math.PI / 2),
    materials.lensRed
  )
  eStop.position.set(0.17, 1.03, 0.38)
  group.add(eStop)

  /* 先把实体件标记投影，再挂不投影的贴花/灯片/光晕 */
  setShadow(group)
  // 压缩后的源几何没有 uv；品牌实体件也不使用贴图，去掉 uv 才能和源几何
  // 合并到同一个 draw（decor 里的贴花/铭牌/屏幕保留 uv）。
  group.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (mesh.isMesh) mesh.geometry.deleteAttribute('uv')
  })
  group.add(decor)
  group.add(buildTread(materials))

  return group
}

/* ------------------------------------------------------------------ */
/* 静态网格合并                                                        */
/* ------------------------------------------------------------------ */

interface MergeBucket {
  material: THREE.Material
  castShadow: boolean
  receiveShadow: boolean
  geometries: THREE.BufferGeometry[]
  sources: THREE.Mesh[]
}

/**
 * KHR_mesh_quantization 会把 position/normal 存成 UShort/Int8 等紧凑类型。
 * mergeGeometries 要求属性数组类型一致，而且直接对量化 position 应用
 * matrixWorld 会把浮点结果写回整型数组导致几何塌缩；合并前统一转成
 * Float32。normal 的 normalized 标记在这里被展开成 -1..1。
 */
function dequantizeGeometry(geometry: THREE.BufferGeometry) {
  for (const [name, attribute] of Object.entries(geometry.attributes)) {
    if (!attribute || attribute.array instanceof Float32Array) continue

    const itemSize = attribute.itemSize
    const count = attribute.count
    const array = new Float32Array(count * itemSize)
    let divisor = 1

    if (attribute.normalized) {
      if (attribute.array instanceof Int8Array) divisor = 127
      else if (attribute.array instanceof Uint8Array) divisor = 255
      else if (attribute.array instanceof Int16Array) divisor = 32767
      else if (attribute.array instanceof Uint16Array) divisor = 65535
    }

    for (let i = 0; i < count; i += 1) {
      for (let c = 0; c < itemSize; c += 1) {
        array[i * itemSize + c] = attribute.getComponent(i, c) / divisor
      }
    }

    geometry.setAttribute(name, new THREE.Float32BufferAttribute(array, itemSize))
  }
}

/**
 * 把同材质、同属性签名、同投影标记的静态 Mesh 合并成一个。
 * 贴花（depthWrite:false）按同材质合并；Sprite、InstancedMesh 原样保留；
 * 写深度的透明件保留独立排序。合并失败时回退为原 Mesh。
 */
export function mergeStaticByMaterial(root: THREE.Object3D): THREE.Group {
  root.updateMatrixWorld(true)

  const buckets = new Map<string, MergeBucket>()
  const keep: THREE.Object3D[] = []

  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    if ((object as THREE.Sprite).isSprite) {
      keep.push(object)
      return
    }
    if (!mesh.isMesh) return
    if ((object as THREE.InstancedMesh).isInstancedMesh) {
      keep.push(object)
      return
    }

    const material = Array.isArray(mesh.material) ? null : mesh.material
    // 透明且写深度的（如玻璃）保留独立排序；我们的贴花都是 depthWrite:false，
    // 同材质的左右/车尾贴花可以安全合并成一次 draw。
    if (!material || (material.transparent && material.depthWrite)) {
      keep.push(object)
      return
    }

    const geometry = mesh.geometry.clone()
    dequantizeGeometry(geometry)

    // RoundedBoxGeometry 是非索引的，而 GLTF 模型是索引的；mergeGeometries
    // 要求同一批 geometry 的索引状态一致。给非索引几何补一个顺序索引，
    // 既不复制顶点，也能和 GLTF 几何安全合并。
    if (!geometry.index && geometry.attributes.position) {
      const count = geometry.attributes.position.count
      const indices = new Uint32Array(count)
      for (let i = 0; i < count; i += 1) indices[i] = i
      geometry.setIndex(new THREE.BufferAttribute(indices, 1))
    }
    geometry.applyMatrix4(mesh.matrixWorld)
    geometry.clearGroups()

    const attributeSignature = Object.keys(geometry.attributes)
      .sort()
      .map((name) => {
        const attribute = geometry.attributes[name]
        if (!attribute) return name
        return [
          name,
          attribute.itemSize,
          attribute.normalized ? 1 : 0,
          attribute.array.constructor.name
        ].join(':')
      })
      .join(',')

    const key = [
      material.uuid,
      mesh.castShadow,
      mesh.receiveShadow,
      attributeSignature
    ].join('|')
    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = {
        material,
        castShadow: mesh.castShadow,
        receiveShadow: mesh.receiveShadow,
        geometries: [],
        sources: []
      }
      buckets.set(key, bucket)
    }

    bucket.geometries.push(geometry)
    bucket.sources.push(mesh)
  })

  const result = new THREE.Group()
  result.name = 'explosion-proof forklift'

  for (const bucket of buckets.values()) {
    const merged = mergeGeometries(bucket.geometries, false)
    if (merged) {
      const mesh = new THREE.Mesh(merged, bucket.material)
      mesh.castShadow = bucket.castShadow
      mesh.receiveShadow = bucket.receiveShadow
      mesh.name = `merged-${bucket.material.name || 'material'}`
      result.add(mesh)
    } else {
      for (const source of bucket.sources) result.attach(source)
    }
    bucket.geometries.forEach((geometry) => geometry.dispose())
  }

  for (const object of keep) result.attach(object)

  return result
}

/* ------------------------------------------------------------------ */
/* 加载                                                                */
/* ------------------------------------------------------------------ */

export async function loadForkliftModel(
  options: LoadForkliftOptions = {}
): Promise<ForkliftModel> {
  const { url = FORKLIFT_MODEL_URL, onProgress } = options

  const gltf = await new Promise<GLTF>((resolve, reject) => {
    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
    loader.load(
      url,
      resolve,
      (event) => {
        if (event.lengthComputable && event.total > 0) {
          onProgress?.(Math.round((event.loaded / event.total) * 100))
        }
      },
      reject
    )
  })

  onProgress?.(100)

  const materials = createMaterials()
  let originals = new Set<THREE.Material>()

  try {
    lowerForkAssembly(gltf.scene)
    originals = applyMaterials(gltf.scene, materials)
    gltf.scene.add(buildBranding(materials))
    gltf.scene.updateMatrixWorld(true)

    const group = mergeStaticByMaterial(gltf.scene)
    group.updateMatrixWorld(true)

    const box = new THREE.Box3().setFromObject(group)
    if (Math.abs(box.min.y) > 0.0001) {
      group.position.y -= box.min.y
    }

    originals.forEach((material) => material.dispose())

    let disposed = false
    return {
      group,
      dispose: () => {
        if (disposed) return
        disposed = true
        disposeObject3D(group)
      }
    }
  } catch (reason) {
    originals.forEach((material) => material.dispose())
    disposeMaterials(materials)
    throw reason
  }
}
