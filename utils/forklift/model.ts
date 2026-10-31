import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import {
  createDashTexture,
  createExBadgeTexture,
  createMastLabelTexture,
  createSideDecalTexture
} from './textures'

/**
 * 1.5 吨防爆蓄电池叉车，纯代码构建。
 *
 * 坐标约定：+Z 为车头（门架/货叉方向），+X 为车右侧，Y 向上，地面 y = 0。
 * 所有尺寸单位为「米」，按实车比例取整（整车约 3.5 × 1.16 × 2.12 m）。
 *
 * 结构分组：
 *   body         侧围板 / 前围 / 配重 / 底盘
 *   wheels       4 个轮胎（前大后小，接地）
 *   mast         门架 / 货叉架 / 货叉 / 油缸 / 链条
 *   guard        护顶架
 *   operator     座椅 / 方向盘 / 仪表 / 操纵杆
 *   details      防爆徽标 / 贴花 / 灯具
 */

const UP = new THREE.Vector3(0, 1, 0)

/* ------------------------------------------------------------------ */
/* 材质                                                                */
/* ------------------------------------------------------------------ */

interface Materials {
  paint: THREE.MeshPhysicalMaterial
  paintPanel: THREE.MeshPhysicalMaterial
  paintDark: THREE.MeshPhysicalMaterial
  blackMetal: THREE.MeshStandardMaterial
  blackPlastic: THREE.MeshStandardMaterial
  rubber: THREE.MeshStandardMaterial
  steel: THREE.MeshStandardMaterial
  forkSteel: THREE.MeshStandardMaterial
  chrome: THREE.MeshStandardMaterial
  rim: THREE.MeshPhysicalMaterial
  leather: THREE.MeshPhysicalMaterial
  dashboard: THREE.MeshStandardMaterial
  screen: THREE.MeshBasicMaterial
  lensWhite: THREE.MeshStandardMaterial
  lensRed: THREE.MeshStandardMaterial
  lensAmber: THREE.MeshStandardMaterial
  decal: THREE.MeshStandardMaterial
  label: THREE.MeshStandardMaterial
  hazardYellow: THREE.MeshStandardMaterial
}

function createMaterials(): Materials {
  const paint = new THREE.MeshPhysicalMaterial({
    color: 0xcf1b24,
    metalness: 0.12,
    roughness: 0.3,
    clearcoat: 0.9,
    clearcoatRoughness: 0.1,
    envMapIntensity: 0.8
  })

  const paintPanel = paint.clone()
  paintPanel.side = THREE.DoubleSide

  const paintDark = paint.clone()
  paintDark.color = new THREE.Color(0x8f1219)
  paintDark.roughness = 0.42

  const blackMetal = new THREE.MeshStandardMaterial({
    color: 0x14171b,
    metalness: 0.5,
    roughness: 0.42
  })

  const blackPlastic = new THREE.MeshStandardMaterial({
    color: 0x1a1d22,
    metalness: 0.04,
    roughness: 0.68,
    side: THREE.DoubleSide
  })

  const rubber = new THREE.MeshStandardMaterial({
    color: 0x0d0f12,
    metalness: 0.0,
    roughness: 0.95
  })

  const steel = new THREE.MeshStandardMaterial({
    color: 0x7f868e,
    metalness: 0.82,
    roughness: 0.4
  })

  const forkSteel = new THREE.MeshStandardMaterial({
    color: 0xa9b0b8,
    metalness: 0.88,
    roughness: 0.34
  })

  const chrome = new THREE.MeshStandardMaterial({
    color: 0xcfd6dd,
    metalness: 1,
    roughness: 0.14
  })

  const rim = new THREE.MeshPhysicalMaterial({
    color: 0xd7dce2,
    metalness: 0.9,
    roughness: 0.26,
    clearcoat: 0.6,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.15
  })

  const leather = new THREE.MeshPhysicalMaterial({
    color: 0x0e1013,
    metalness: 0.0,
    roughness: 0.52,
    clearcoat: 0.22,
    clearcoatRoughness: 0.6,
    sheen: 0.35,
    sheenColor: new THREE.Color(0x2a2f36),
    sheenRoughness: 0.9
  })

  const dashboard = new THREE.MeshStandardMaterial({
    color: 0x1d2128,
    metalness: 0.25,
    roughness: 0.62
  })

  const screen = new THREE.MeshBasicMaterial({
    map: createDashTexture(),
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

  const decal = new THREE.MeshStandardMaterial({
    map: createSideDecalTexture(),
    transparent: true,
    roughness: 0.5,
    metalness: 0.02,
    depthWrite: false,
    side: THREE.DoubleSide
  })

  const label = new THREE.MeshStandardMaterial({
    map: createMastLabelTexture(),
    roughness: 0.5,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  })

  const hazardYellow = new THREE.MeshStandardMaterial({
    color: 0xe7b51a,
    metalness: 0.1,
    roughness: 0.5
  })

  return {
    paint,
    paintPanel,
    paintDark,
    blackMetal,
    blackPlastic,
    rubber,
    steel,
    forkSteel,
    chrome,
    rim,
    leather,
    dashboard,
    screen,
    lensWhite,
    lensRed,
    lensAmber,
    decal,
    label,
    hazardYellow
  }
}

/* ------------------------------------------------------------------ */
/* 几何工具                                                            */
/* ------------------------------------------------------------------ */

function setShadow(object: THREE.Object3D, cast = true, receive = true) {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (mesh.isMesh) {
      mesh.castShadow = cast
      mesh.receiveShadow = receive
    }
  })
  return object
}

function roundedBox(
  width: number,
  height: number,
  depth: number,
  radius: number,
  material: THREE.Material,
  segments = 3
) {
  const geometry = new RoundedBoxGeometry(width, height, depth, segments, radius)
  return new THREE.Mesh(geometry, material)
}

function addRounded(
  parent: THREE.Object3D,
  width: number,
  height: number,
  depth: number,
  radius: number,
  x: number,
  y: number,
  z: number,
  material: THREE.Material
) {
  const mesh = roundedBox(width, height, depth, radius, material)
  mesh.position.set(x, y, z)
  parent.add(mesh)
  return mesh
}

function beamBetween(
  a: THREE.Vector3,
  b: THREE.Vector3,
  width: number,
  depth: number,
  material: THREE.Material,
  radius = Math.min(width, depth) * 0.28
) {
  const delta = new THREE.Vector3().subVectors(b, a)
  const length = delta.length()
  const geometry = new RoundedBoxGeometry(width, length, depth, 2, radius)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.copy(a).add(b).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(UP, delta.normalize())
  return mesh
}

function cylinderBetween(
  a: THREE.Vector3,
  b: THREE.Vector3,
  radius: number,
  material: THREE.Material,
  radialSegments = 14
) {
  const delta = new THREE.Vector3().subVectors(b, a)
  const length = delta.length()
  const geometry = new THREE.CylinderGeometry(radius, radius, length, radialSegments)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.copy(a).add(b).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(UP, delta.normalize())
  return mesh
}

function planeWithTexture(
  width: number,
  height: number,
  material: THREE.Material
) {
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), material)
}

/* ------------------------------------------------------------------ */
/* 侧围板（含前后轮罩开口）                                             */
/* ------------------------------------------------------------------ */

const PANEL_X = 0.58
const PANEL_THICKNESS = 0.045
const FLOOR_EDGE = 0.355

function buildSidePanelShape() {
  const shape = new THREE.Shape()
  const frontArch = { z: 0.7, y: 0.3, r: 0.345 }
  const rearArch = { z: -0.8, y: 0.245, r: 0.275 }

  // 起点：车尾下缘，顺时针绕一圈（顶部与前后外轮廓）
  shape.moveTo(-1.16, FLOOR_EDGE)
  shape.lineTo(-1.16, 0.94)
  shape.lineTo(-0.98, 1.0)
  shape.lineTo(-0.68, 1.0)
  shape.lineTo(-0.5, 0.955)
  shape.lineTo(0.05, 0.925)
  shape.lineTo(0.4, 0.94)
  shape.lineTo(0.62, 0.95)
  shape.lineTo(0.78, 0.915)
  shape.lineTo(0.9, 0.83)
  shape.lineTo(0.9, 0.629)

  // 前轮罩：沿圆弧向左（车尾）走，形成下凹的轮拱
  const frontDz = Math.sqrt(frontArch.r ** 2 - (FLOOR_EDGE - frontArch.y) ** 2)
  const frontStart = Math.acos((0.9 - frontArch.z) / frontArch.r)
  const frontEnd = Math.acos(-frontDz / frontArch.r)
  const archSteps = 24
  for (let i = 1; i <= archSteps; i++) {
    const angle = frontStart + ((frontEnd - frontStart) * i) / archSteps
    shape.lineTo(
      frontArch.z + Math.cos(angle) * frontArch.r,
      frontArch.y + Math.sin(angle) * frontArch.r
    )
  }

  // 两轮之间的平直下缘
  const rearDz = Math.sqrt(rearArch.r ** 2 - (FLOOR_EDGE - rearArch.y) ** 2)
  shape.lineTo(rearArch.z + rearDz, FLOOR_EDGE)

  // 后轮罩
  const rearStart = Math.acos(rearDz / rearArch.r)
  const rearEnd = Math.acos(-rearDz / rearArch.r)
  for (let i = 1; i <= 20; i++) {
    const angle = rearStart + ((rearEnd - rearStart) * i) / 20
    shape.lineTo(
      rearArch.z + Math.cos(angle) * rearArch.r,
      rearArch.y + Math.sin(angle) * rearArch.r
    )
  }

  shape.lineTo(-1.16, FLOOR_EDGE)
  return shape
}

function buildSidePanels(materials: Materials) {
  const group = new THREE.Group()
  const shape = buildSidePanelShape()
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: PANEL_THICKNESS,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
    curveSegments: 10
  })
  geometry.rotateY(-Math.PI / 2)
  // 挤出后沿 -X 延展；把右板放到 +0.58，左板镜像后放到 -0.58

  const right = new THREE.Mesh(geometry, materials.paintPanel)
  right.position.x = PANEL_X
  group.add(right)

  const left = new THREE.Mesh(geometry, materials.paintPanel)
  left.position.x = -PANEL_X
  left.scale.x = -1
  group.add(left)

  // 轮眉：有厚度的黑色塑料轮眉（填住轮胎与侧围之间的开口，不再是一根悬浮细线）
  const flareSpecs: Array<{ z: number; y: number; inner: number; outer: number }> = [
    { z: 0.7, y: 0.3, inner: 0.306, outer: 0.348 },
    { z: -0.8, y: 0.245, inner: 0.253, outer: 0.278 }
  ]

  const flareShapes = flareSpecs.map((spec) => {
    const shape = new THREE.Shape()
    shape.moveTo(spec.outer, 0)
    shape.absarc(0, 0, spec.outer, 0, Math.PI, false)
    shape.lineTo(-spec.inner, 0)
    shape.absarc(0, 0, spec.inner, Math.PI, 0, true)
    shape.closePath()
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.022,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
      bevelSegments: 2,
      curveSegments: 24
    })
    geometry.rotateY(-Math.PI / 2)
    return geometry
  })

  const skirtMaterial = materials.blackPlastic

  for (const side of [1, -1]) {
    for (let i = 0; i < flareSpecs.length; i++) {
      const spec = flareSpecs[i]!
      const flare = new THREE.Mesh(flareShapes[i]!, skirtMaterial)
      flare.position.set(side * (PANEL_X + 0.012), spec.y, spec.z)
      if (side < 0) flare.scale.x = -1
      group.add(flare)
    }

    // 轮眉外圈：红色翼子板翻边，让轮拱与车身曲面连成一体
    for (let i = 0; i < flareSpecs.length; i++) {
      const spec = flareSpecs[i]!
      const outer = spec.outer + 0.055
      const redShape = new THREE.Shape()
      redShape.moveTo(outer, 0)
      redShape.absarc(0, 0, outer, 0, Math.PI, false)
      redShape.lineTo(-spec.outer, 0)
      redShape.absarc(0, 0, spec.outer, Math.PI, 0, true)
      redShape.closePath()
      const redGeometry = new THREE.ExtrudeGeometry(redShape, {
        depth: 0.014,
        bevelEnabled: true,
        bevelThickness: 0.004,
        bevelSize: 0.004,
        bevelSegments: 2,
        curveSegments: 24
      })
      redGeometry.rotateY(-Math.PI / 2)
      const redLip = new THREE.Mesh(redGeometry, materials.paintPanel)
      redLip.position.set(side * (PANEL_X + 0.02), spec.y, spec.z)
      if (side < 0) redLip.scale.x = -1
      group.add(redLip)

      // 红色轮眉的圆润外沿
      const roll = new THREE.Mesh(
        new THREE.TorusGeometry(outer, 0.011, 8, 28, Math.PI),
        materials.paintPanel
      )
      roll.rotation.y = Math.PI / 2
      roll.position.set(side * (PANEL_X + 0.02), spec.y, spec.z)
      group.add(roll)
    }

    // 侧围下半部的黑色护板（电池盖 / 防擦条），打破大面积红色侧板
    addRounded(
      group,
      0.014,
      0.22,
      0.74,
      0.006,
      side * (PANEL_X + 0.007),
      0.475,
      -0.06,
      skirtMaterial
    )
    // 护板上沿的金属饰条
    addRounded(
      group,
      0.007,
      0.013,
      0.74,
      0.003,
      side * (PANEL_X + 0.016),
      0.592,
      -0.06,
      materials.steel
    )

    // 后侧散热格栅（黑色底板 + 横向叶片）
    addRounded(
      group,
      0.012,
      0.17,
      0.27,
      0.008,
      side * (PANEL_X + 0.008),
      0.8,
      -1.02,
      materials.blackPlastic
    )
    for (let i = 0; i < 4; i++) {
      addRounded(
        group,
        0.012,
        0.012,
        0.22,
        0.004,
        side * (PANEL_X + 0.016),
        0.74 + i * 0.04,
        -1.02,
        materials.blackMetal
      )
    }

    // 驾驶区侧面的登车踏板（大部分收在车身下，只露出窄边）
    addRounded(
      group,
      0.1,
      0.026,
      0.26,
      0.008,
      side * (PANEL_X - 0.012),
      0.41,
      0.04,
      materials.blackMetal
    )
  }

  // 车身顶部黑色滚边：沿侧围上沿走一条圆角饰条，收住红色侧板的硬边
  const topEdgePoints: Array<[number, number]> = [
    [-1.14, 0.945],
    [-0.98, 1.002],
    [-0.68, 1.002],
    [-0.5, 0.958],
    [0.05, 0.928],
    [0.4, 0.943],
    [0.62, 0.952],
    [0.78, 0.918],
    [0.875, 0.848]
  ]
  for (const side of [1, -1]) {
    const curve = new THREE.CatmullRomCurve3(
      topEdgePoints.map(([z, y]) => new THREE.Vector3(side * 0.586, y, z))
    )
    const trim = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 36, 0.012, 6, false),
      materials.blackPlastic
    )
    group.add(trim)
  }

  return setShadow(group)
}

/* ------------------------------------------------------------------ */
/* 车身：前围、底盘、配重、后围                                         */
/* ------------------------------------------------------------------ */

function buildBody(materials: Materials) {
  const group = new THREE.Group()

  // 底盘 / 电池箱（收窄到轮胎内缘以内，避免与车轮相交）
  addRounded(group, 0.66, 0.32, 2.02, 0.05, 0, 0.4, -0.18, materials.blackMetal)
  addRounded(group, 0.62, 0.36, 0.78, 0.04, 0, 0.71, -0.42, materials.blackMetal)

  // 驾驶区地板（下沿抬到轮胎顶面以上）
  addRounded(group, 0.92, 0.035, 0.8, 0.02, 0, 0.62, -0.08, materials.blackPlastic)
  for (let i = 0; i < 6; i++) {
    addRounded(
      group,
      0.82,
      0.012,
      0.035,
      0.005,
      0,
      0.642,
      -0.42 + i * 0.11,
      materials.blackPlastic
    )
  }

  // 前围（斜置的仪表台基座）
  const cowlShape = new THREE.Shape()
  cowlShape.moveTo(0.38, 0.63)
  cowlShape.lineTo(0.96, 0.63)
  cowlShape.lineTo(0.96, 0.78)
  cowlShape.lineTo(0.87, 0.9)
  cowlShape.lineTo(0.66, 0.99)
  cowlShape.lineTo(0.46, 0.975)
  cowlShape.lineTo(0.38, 0.8)
  cowlShape.closePath()
  const cowlGeometry = new THREE.ExtrudeGeometry(cowlShape, {
    depth: 0.94,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 3,
    curveSegments: 8
  })
  cowlGeometry.rotateY(-Math.PI / 2)
  const cowl = new THREE.Mesh(cowlGeometry, materials.paintPanel)
  cowl.position.x = 0.47
  group.add(cowl)

  // 前围黑色上盖 / 仪表台面
  const dashTop = addRounded(
    group,
    0.86,
    0.07,
    0.3,
    0.03,
    0,
    1.0,
    0.52,
    materials.dashboard
  )
  dashTop.rotation.x = 0.16

  // 门架底座：一段收窄的黑色前机罩，把门架与车身、前桥连接起来
  addRounded(group, 0.68, 0.38, 0.3, 0.04, 0, 0.45, 1.03, materials.blackMetal)
  addRounded(group, 0.78, 0.045, 0.2, 0.02, 0, 0.245, 1.11, materials.blackMetal)
  // 门架下方的黑色前挡板
  addRounded(group, 0.92, 0.11, 0.075, 0.025, 0, 0.34, 1.065, materials.blackPlastic)

  // 配重（尾部铸件）
  const counterweight = addRounded(
    group,
    1.12,
    0.56,
    0.72,
    0.15,
    0,
    0.81,
    -0.94,
    materials.paint
  )
  counterweight.rotation.x = -0.015
  addRounded(group, 1.0, 0.055, 0.6, 0.025, 0, 1.105, -0.95, materials.paint)
  addRounded(group, 0.84, 0.016, 0.44, 0.02, 0, 1.139, -0.96, materials.blackPlastic)

  // 尾部下护板 / 保险杠
  addRounded(group, 1.0, 0.2, 0.22, 0.04, 0, 0.43, -1.21, materials.blackPlastic)
  addRounded(group, 0.98, 0.135, 0.1, 0.035, 0, 0.4, -1.31, materials.blackPlastic)
  addRounded(group, 0.7, 0.07, 0.05, 0.02, 0, 0.5, -1.32, materials.blackMetal)

  // 配重后部内凹面板（让车尾不是一块平板）
  addRounded(group, 0.66, 0.38, 0.03, 0.03, 0, 0.83, -1.3, materials.paintDark)

  // 尾部拖车销
  const towPin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.042, 0.048, 0.12, 16),
    materials.steel
  )
  towPin.rotation.x = Math.PI / 2
  towPin.position.set(0, 0.58, -1.345)
  group.add(towPin)

  // 配重上方的黑色护板（座椅后方）
  addRounded(group, 0.94, 0.34, 0.08, 0.025, 0, 1.05, -0.63, materials.blackPlastic)
  addRounded(group, 0.8, 0.1, 0.06, 0.02, 0, 1.2, -0.69, materials.blackMetal)

  // 左右侧围
  group.add(buildSidePanels(materials))

  // 座椅下方的黑色电池盖（从侧面露出的深色带）
  addRounded(group, 0.99, 0.44, 0.64, 0.03, 0, 0.68, -0.36, materials.blackMetal)

  return setShadow(group)
}

/* ------------------------------------------------------------------ */
/* 车轮                                                                */
/* ------------------------------------------------------------------ */

interface WheelSpec {
  x: number
  z: number
  radius: number
  width: number
  lugs: number
  rimRadius: number
}

function createWheel(spec: WheelSpec, materials: Materials) {
  const group = new THREE.Group()
  group.position.set(spec.x, spec.radius, spec.z)

  const halfWidth = spec.width / 2
  const carcassRadius = spec.radius - 0.016

  // 轮胎断面（LatheGeometry 绕 Y 轴旋转，再转成 X 轴）
  const profile: THREE.Vector2[] = [
    new THREE.Vector2(spec.radius * 0.58, -halfWidth),
    new THREE.Vector2(spec.radius * 0.83, -halfWidth),
    new THREE.Vector2(spec.radius * 0.935, -halfWidth * 0.9),
    new THREE.Vector2(spec.radius * 0.985, -halfWidth * 0.62),
    new THREE.Vector2(carcassRadius, -halfWidth * 0.3),
    new THREE.Vector2(carcassRadius, halfWidth * 0.3),
    new THREE.Vector2(spec.radius * 0.985, halfWidth * 0.62),
    new THREE.Vector2(spec.radius * 0.935, halfWidth * 0.9),
    new THREE.Vector2(spec.radius * 0.83, halfWidth),
    new THREE.Vector2(spec.radius * 0.58, halfWidth),
    new THREE.Vector2(spec.radius * 0.58, -halfWidth)
  ]
  const tireGeometry = new THREE.LatheGeometry(profile, 44)
  tireGeometry.rotateZ(Math.PI / 2)
  tireGeometry.computeVertexNormals()
  const tire = new THREE.Mesh(tireGeometry, materials.rubber)
  group.add(tire)

  // 胎面花纹块
  const lugHeight = 0.018
  const lugGeometry = new THREE.BoxGeometry(spec.width * 0.78, lugHeight, spec.radius * 0.26)
  const lugs = new THREE.InstancedMesh(lugGeometry, materials.rubber, spec.lugs)
  const dummy = new THREE.Object3D()
  const lugRadius = carcassRadius + lugHeight * 0.5 - 0.001
  for (let i = 0; i < spec.lugs; i++) {
    const angle = (i / spec.lugs) * Math.PI * 2
    dummy.position.set(
      0,
      Math.sin(angle) * lugRadius,
      Math.cos(angle) * lugRadius
    )
    dummy.rotation.set(Math.PI / 2 - angle, 0, 0)
    dummy.updateMatrix()
    lugs.setMatrixAt(i, dummy.matrix)
  }
  lugs.instanceMatrix.needsUpdate = true
  group.add(lugs)

  // 轮辋（内外两侧）：实心钢制轮辐盘 + 6 个大减重孔 + 轮毂螺母
  const rimRadius = spec.rimRadius
  const lipGeometry = new THREE.TorusGeometry(rimRadius, 0.012, 8, 32).rotateY(Math.PI / 2)
  const faceGeometry = new THREE.CylinderGeometry(
    rimRadius * 0.94,
    rimRadius * 0.94,
    0.022,
    32
  ).rotateZ(Math.PI / 2)
  const holeGeometry = new THREE.CylinderGeometry(
    rimRadius * 0.2,
    rimRadius * 0.2,
    0.008,
    16
  ).rotateZ(Math.PI / 2)
  const hubGeometry = new THREE.CylinderGeometry(
    rimRadius * 0.29,
    rimRadius * 0.31,
    0.045,
    24
  ).rotateZ(Math.PI / 2)
  const capGeometry = new THREE.CylinderGeometry(
    rimRadius * 0.13,
    rimRadius * 0.13,
    0.018,
    16
  ).rotateZ(Math.PI / 2)
  const nutGeometry = new THREE.CylinderGeometry(0.009, 0.009, 0.016, 6).rotateZ(Math.PI / 2)

  const holes = new THREE.InstancedMesh(holeGeometry, materials.blackMetal, 12)
  const nuts = new THREE.InstancedMesh(nutGeometry, materials.steel, 12)
  let instanceIndex = 0

  const sidewallRingGeometry = new THREE.TorusGeometry(spec.radius * 0.78, 0.0045, 6, 40)
  sidewallRingGeometry.rotateY(Math.PI / 2)
  const sidewallRingMaterial = materials.blackMetal

  for (const side of [1, -1]) {
    const faceX = side * (halfWidth - 0.014)

    const sidewallRing = new THREE.Mesh(sidewallRingGeometry, sidewallRingMaterial)
    sidewallRing.position.x = side * (halfWidth - 0.003)
    group.add(sidewallRing)

    const lip = new THREE.Mesh(lipGeometry, materials.rim)
    lip.position.x = faceX
    group.add(lip)

    const face = new THREE.Mesh(faceGeometry, materials.rim)
    face.position.x = side * (halfWidth - 0.028)
    group.add(face)

    const hub = new THREE.Mesh(hubGeometry, materials.rim)
    hub.position.x = side * (halfWidth - 0.004)
    group.add(hub)

    const hubCap = new THREE.Mesh(capGeometry, materials.blackPlastic)
    hubCap.position.x = side * (halfWidth + 0.013)
    group.add(hubCap)

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2
      dummy.position.set(
        side * (halfWidth - 0.011),
        Math.sin(angle) * rimRadius * 0.56,
        Math.cos(angle) * rimRadius * 0.56
      )
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      holes.setMatrixAt(instanceIndex, dummy.matrix)

      dummy.position.set(
        side * (halfWidth - 0.012),
        Math.sin(angle) * rimRadius * 0.38,
        Math.cos(angle) * rimRadius * 0.38
      )
      dummy.updateMatrix()
      nuts.setMatrixAt(instanceIndex, dummy.matrix)
      instanceIndex += 1
    }
  }
  holes.instanceMatrix.needsUpdate = true
  nuts.instanceMatrix.needsUpdate = true
  group.add(holes)
  group.add(nuts)

  // 轮拱内衬（挡泥板）
  const linerGeometry = new THREE.CylinderGeometry(
    spec.radius + 0.025,
    spec.radius + 0.025,
    spec.width,
    20,
    1,
    true,
    0,
    Math.PI
  )
  linerGeometry.rotateZ(Math.PI / 2)
  const liner = new THREE.Mesh(linerGeometry, materials.blackPlastic)
  liner.material = materials.blackPlastic
  liner.position.x = 0
  group.add(liner)

  setShadow(group)
  lugs.castShadow = true
  liner.castShadow = false
  return group
}

function buildWheels(materials: Materials) {
  const group = new THREE.Group()

  const front: WheelSpec[] = [
    { x: 0.465, z: 0.7, radius: 0.3, width: 0.22, lugs: 24, rimRadius: 0.188 },
    { x: -0.465, z: 0.7, radius: 0.3, width: 0.22, lugs: 24, rimRadius: 0.188 }
  ]
  const rear: WheelSpec[] = [
    { x: 0.43, z: -0.8, radius: 0.245, width: 0.18, lugs: 20, rimRadius: 0.152 },
    { x: -0.43, z: -0.8, radius: 0.245, width: 0.18, lugs: 20, rimRadius: 0.152 }
  ]

  for (const spec of [...front, ...rear]) {
    const wheel = createWheel(spec, materials)
    // 以花纹节距的整数倍旋转：轮胎外观有错落，但每个车轮都有花纹块正好落在最低点，
    // 四轮都能真正接地（不会被 bbox 校正抬离地面）。
    const pitch = (Math.PI * 2) / spec.lugs
    const phase = (spec.z > 0 ? 3 : 7) + (spec.x > 0 ? 0 : 2)
    wheel.rotation.x = phase * pitch
    group.add(wheel)
  }

  // 前桥 / 后转向桥
  const axle = cylinderBetween(
    new THREE.Vector3(-0.42, 0.3, 0.7),
    new THREE.Vector3(0.42, 0.3, 0.7),
    0.052,
    materials.blackMetal
  )
  group.add(axle)
  const steerAxle = cylinderBetween(
    new THREE.Vector3(-0.4, 0.245, -0.8),
    new THREE.Vector3(0.4, 0.245, -0.8),
    0.04,
    materials.blackMetal
  )
  group.add(steerAxle)

  return setShadow(group)
}

/* ------------------------------------------------------------------ */
/* 门架 / 货叉架 / 货叉                                                 */
/* ------------------------------------------------------------------ */

function buildMast(materials: Materials) {
  const group = new THREE.Group()
  const mastZ = 1.12
  const topY = 2.0
  const bottomY = 0.17

  // 外门架的 C 型槽（左右各一根，开槽朝内）
  for (const side of [1, -1]) {
    const x = side * 0.35
    addRounded(group, 0.09, 1.85, 0.18, 0.01, x, (topY + bottomY) / 2, mastZ, materials.blackMetal)
    addRounded(
      group,
      0.024,
      1.85,
      0.03,
      0.005,
      x + side * 0.045,
      (topY + bottomY) / 2,
      mastZ + 0.075,
      materials.blackMetal
    )
    addRounded(
      group,
      0.024,
      1.85,
      0.03,
      0.005,
      x + side * 0.045,
      (topY + bottomY) / 2,
      mastZ - 0.075,
      materials.blackMetal
    )

    // 内门架
    addRounded(group, 0.065, 1.72, 0.14, 0.01, side * 0.26, 1.13, mastZ - 0.005, materials.blackMetal)

    // 提升油缸：黑色缸筒 + 细一些的镀铬活塞杆
    addRounded(
      group,
      0.1,
      0.64,
      0.1,
      0.028,
      side * 0.145,
      0.57,
      mastZ + 0.052,
      materials.blackMetal
    )
    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.019, 0.019, 1.14, 14),
      materials.chrome
    )
    rod.position.set(side * 0.145, 1.44, mastZ + 0.052)
    group.add(rod)
  }

  // 门架横梁
  addRounded(group, 0.83, 0.07, 0.088, 0.016, 0, 1.97, mastZ, materials.blackMetal)
  addRounded(group, 0.83, 0.08, 0.095, 0.016, 0, 0.23, mastZ, materials.blackMetal)
  addRounded(group, 0.78, 0.05, 0.06, 0.012, 0, 1.2, mastZ - 0.02, materials.blackMetal)

  // 顶部链轮
  for (const side of [1, -1]) {
    const sprocket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.048, 0.032, 16).rotateZ(Math.PI / 2),
      materials.steel
    )
    sprocket.position.set(side * 0.18, 1.94, mastZ + 0.018)
    group.add(sprocket)
  }

  // 链条（薄片 + 小节，表现金属链条的分段感）
  for (const side of [1, -1]) {
    addRounded(group, 0.014, 1.28, 0.018, 0.003, side * 0.18, 1.28, mastZ + 0.027, materials.steel)
    const linkGeometry = new THREE.BoxGeometry(0.026, 0.02, 0.028)
    const links = new THREE.InstancedMesh(linkGeometry, materials.steel, 18)
    const dummy = new THREE.Object3D()
    for (let i = 0; i < 18; i++) {
      dummy.position.set(side * 0.18, 0.68 + i * 0.07, mastZ + 0.027)
      dummy.rotation.set(0, 0, i % 2 === 0 ? 0 : Math.PI / 2)
      dummy.updateMatrix()
      links.setMatrixAt(i, dummy.matrix)
    }
    links.instanceMatrix.needsUpdate = true
    group.add(links)
  }

  // 倾斜油缸
  for (const side of [1, -1]) {
    const barrel = cylinderBetween(
      new THREE.Vector3(side * 0.34, 0.5, 0.58),
      new THREE.Vector3(side * 0.34, 0.54, 0.82),
      0.045,
      materials.blackMetal
    )
    group.add(barrel)
    const piston = cylinderBetween(
      new THREE.Vector3(side * 0.34, 0.535, 0.78),
      new THREE.Vector3(side * 0.34, 0.56, 1.04),
      0.022,
      materials.chrome
    )
    group.add(piston)
  }

  // 液压软管
  for (const side of [1, -1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.43, 0.72, 0.92),
      new THREE.Vector3(side * 0.45, 0.78, 1.0),
      new THREE.Vector3(side * 0.44, 0.92, 1.03),
      new THREE.Vector3(side * 0.4, 1.05, 1.04)
    ])
    const hose = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 18, 0.013, 8, false),
      materials.blackPlastic
    )
    group.add(hose)
  }

  // 货叉架：开放式框架（中间留空，可以看到车头与仪表）
  const carriageZ = 1.205
  addRounded(group, 0.82, 0.075, 0.085, 0.016, 0, 0.8, carriageZ + 0.01, materials.blackMetal)
  addRounded(group, 0.82, 0.07, 0.085, 0.016, 0, 0.255, carriageZ + 0.01, materials.blackMetal)
  addRounded(group, 0.3, 0.5, 0.03, 0.012, 0, 0.52, carriageZ - 0.02, materials.blackMetal)
  for (const side of [1, -1]) {
    addRounded(group, 0.06, 0.6, 0.12, 0.01, side * 0.395, 0.53, carriageZ + 0.022, materials.blackMetal)
    addRounded(group, 0.075, 0.56, 0.08, 0.01, side * 0.27, 0.53, carriageZ + 0.025, materials.blackMetal)

    // 滚轮
    for (const y of [0.36, 0.7]) {
      const roller = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.028, 0.05, 12).rotateZ(Math.PI / 2),
        materials.steel
      )
      roller.position.set(side * 0.34, y, carriageZ - 0.035)
      group.add(roller)
    }

    // 货叉挂钩 + 银色定位销
    addRounded(group, 0.16, 0.09, 0.1, 0.016, side * 0.27, 0.755, carriageZ + 0.06, materials.blackMetal)
    const hookPin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.013, 0.013, 0.15, 10).rotateZ(Math.PI / 2),
      materials.steel
    )
    hookPin.position.set(side * 0.27, 0.755, carriageZ + 0.082)
    group.add(hookPin)
  }

  // 货叉（L 形断面沿 X 挤出，货叉架前侧挂装）
  const forkShape = new THREE.Shape()
  forkShape.moveTo(1.232, 0.78)
  forkShape.lineTo(1.317, 0.78)
  forkShape.lineTo(1.317, 0.098)
  forkShape.lineTo(2.26, 0.088)
  forkShape.lineTo(2.31, 0.062)
  forkShape.lineTo(1.232, 0.032)
  forkShape.closePath()
  const forkGeometry = new THREE.ExtrudeGeometry(forkShape, {
    depth: 0.112,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2
  })
  forkGeometry.rotateY(-Math.PI / 2)

  for (const side of [1, -1]) {
    const fork = new THREE.Mesh(forkGeometry, materials.forkSteel)
    // 挤出后占 x ∈ [-0.112, 0]，平移到左右对称位置
    fork.position.x = side * 0.27 + 0.056 * Math.sign(side)
    group.add(fork)
  }

  // 门架警示铭牌（右侧）
  const label = planeWithTexture(0.17, 0.2125, materials.label)
  label.position.set(0.409, 1.44, mastZ)
  label.rotation.y = Math.PI / 2
  group.add(label)

  return setShadow(group)
}

/* ------------------------------------------------------------------ */
/* 护顶架                                                              */
/* ------------------------------------------------------------------ */

function buildOverheadGuard(materials: Materials) {
  const group = new THREE.Group()
  const topY = 2.075

  const frontBottom = new THREE.Vector3(0.46, 0.93, 0.52)
  const frontTop = new THREE.Vector3(0.46, topY, 0.47)
  const rearBottom = new THREE.Vector3(0.46, 0.96, -0.6)
  const rearTop = new THREE.Vector3(0.46, topY, -0.72)

  for (const side of [1, -1]) {
    const front = beamBetween(
      new THREE.Vector3(side * frontBottom.x, frontBottom.y, frontBottom.z),
      new THREE.Vector3(side * frontTop.x, frontTop.y, frontTop.z),
      0.072,
      0.072,
      materials.blackMetal
    )
    group.add(front)

    const rear = beamBetween(
      new THREE.Vector3(side * rearBottom.x, rearBottom.y, rearBottom.z),
      new THREE.Vector3(side * rearTop.x, rearTop.y, rearTop.z),
      0.072,
      0.072,
      materials.blackMetal
    )
    group.add(rear)

    // 立柱底脚
    addRounded(
      group,
      0.14,
      0.05,
      0.16,
      0.012,
      side * frontBottom.x,
      frontBottom.y + 0.01,
      frontBottom.z,
      materials.blackMetal
    )
    addRounded(
      group,
      0.14,
      0.05,
      0.16,
      0.012,
      side * rearBottom.x,
      rearBottom.y + 0.01,
      rearBottom.z,
      materials.blackMetal
    )

    // 顶棚侧梁
    const rail = beamBetween(
      new THREE.Vector3(side * 0.46, topY, 0.5),
      new THREE.Vector3(side * 0.46, topY, -0.76),
      0.082,
      0.078,
      materials.blackMetal
    )
    group.add(rail)
  }

  // 顶棚前 / 后横梁
  group.add(
    beamBetween(
      new THREE.Vector3(-0.46, topY, 0.49),
      new THREE.Vector3(0.46, topY, 0.49),
      0.075,
      0.085,
      materials.blackMetal
    )
  )
  group.add(
    beamBetween(
      new THREE.Vector3(-0.46, topY, -0.75),
      new THREE.Vector3(0.46, topY, -0.75),
      0.075,
      0.085,
      materials.blackMetal
    )
  )

  // 顶棚条板
  for (let i = 0; i < 6; i++) {
    const z = 0.36 - i * 0.2
    addRounded(group, 0.9, 0.026, 0.1, 0.01, 0, topY + 0.012, z, materials.blackPlastic)
  }

  // 四角加强块
  for (const x of [-0.46, 0.46]) {
    for (const z of [0.48, -0.73]) {
      addRounded(group, 0.1, 0.11, 0.1, 0.02, x, topY - 0.04, z, materials.blackMetal)
    }
  }

  // 前工作灯
  for (const x of [-0.23, 0.23]) {
    const housing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.055, 0.09, 18).rotateX(Math.PI / 2),
      materials.blackMetal
    )
    housing.position.set(x, topY - 0.02, 0.56)
    group.add(housing)
    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.043, 20),
      materials.lensWhite
    )
    lens.position.set(x, topY - 0.02, 0.606)
    group.add(lens)
    addRounded(group, 0.03, 0.055, 0.03, 0.006, x, topY + 0.01, 0.53, materials.blackMetal)
  }

  // 顶部红色警示灯
  const beaconBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.062, 0.045, 18),
    materials.blackMetal
  )
  beaconBase.position.set(-0.3, topY + 0.05, 0.28)
  group.add(beaconBase)
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.048, 0.052, 0.055, 18),
    materials.lensRed
  )
  beacon.position.set(-0.3, topY + 0.1, 0.28)
  group.add(beacon)
  const beaconCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    materials.lensRed
  )
  beaconCap.position.set(-0.3, topY + 0.127, 0.28)
  group.add(beaconCap)

  // 尾部小灯
  addRounded(group, 0.08, 0.05, 0.02, 0.01, 0.28, topY - 0.06, -0.755, materials.lensAmber)

  return setShadow(group)
}

/* ------------------------------------------------------------------ */
/* 驾驶区：座椅 / 方向盘 / 仪表 / 操纵杆                                 */
/* ------------------------------------------------------------------ */

function buildOperatorArea(materials: Materials) {
  const group = new THREE.Group()

  // 座椅底座：从车身上方露出来的黑色座架
  addRounded(group, 0.5, 0.14, 0.45, 0.03, 0, 0.71, -0.3, materials.blackMetal)
  addRounded(group, 0.56, 0.26, 0.5, 0.04, 0, 0.85, -0.3, materials.blackPlastic)
  addRounded(group, 0.58, 0.05, 0.52, 0.02, 0, 0.99, -0.3, materials.blackMetal)

  // 坐垫
  const cushion = roundedBox(0.54, 0.15, 0.46, 0.055, materials.leather, 4)
  cushion.position.set(0, 1.05, -0.28)
  group.add(cushion)
  const cushionRear = roundedBox(0.5, 0.13, 0.16, 0.05, materials.leather, 4)
  cushionRear.position.set(0, 1.075, -0.43)
  group.add(cushionRear)

  // 靠背 + 头枕
  const backrest = roundedBox(0.5, 0.56, 0.14, 0.06, materials.leather, 4)
  backrest.position.set(0, 1.37, -0.51)
  backrest.rotation.x = -0.15
  group.add(backrest)

  const headrest = roundedBox(0.3, 0.16, 0.11, 0.05, materials.leather, 3)
  headrest.position.set(0, 1.69, -0.56)
  headrest.rotation.x = -0.15
  group.add(headrest)

  // 靠背侧翼
  for (const side of [1, -1]) {
    const bolster = roundedBox(0.07, 0.42, 0.17, 0.03, materials.leather, 3)
    bolster.position.set(side * 0.235, 1.35, -0.5)
    bolster.rotation.x = -0.15
    group.add(bolster)
  }

  // 座椅缝线（几条很细的深灰色线，增加皮革的辨识度）
  for (const side of [1, -1]) {
    const seam = new THREE.Mesh(
      new THREE.BoxGeometry(0.005, 0.34, 0.004),
      materials.dashboard
    )
    seam.position.set(side * 0.075, 1.37, -0.431)
    seam.rotation.x = -0.15
    group.add(seam)
  }
  const cushionSeam = new THREE.Mesh(
    new THREE.BoxGeometry(0.44, 0.004, 0.006),
    materials.dashboard
  )
  cushionSeam.position.set(0, 1.126, -0.28)
  group.add(cushionSeam)

  // 扶手
  for (const side of [1, -1]) {
    const support = roundedBox(0.035, 0.22, 0.035, 0.012, materials.blackMetal, 2)
    support.position.set(side * 0.29, 1.08, -0.42)
    group.add(support)
    const armrest = roundedBox(0.075, 0.06, 0.34, 0.025, materials.leather, 3)
    armrest.position.set(side * 0.29, 1.2, -0.27)
    armrest.rotation.x = -0.04
    group.add(armrest)
  }

  // 液压操纵杆（右扶手前）
  for (let i = 0; i < 3; i++) {
    const x = 0.34 + i * 0.045
    const lever = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.013, 0.24, 8),
      materials.blackMetal
    )
    lever.position.set(x, 1.09, 0.05 + i * 0.025)
    lever.rotation.x = 0.18
    group.add(lever)
    const knob = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 12, 8),
      i === 0 ? materials.hazardYellow : materials.blackPlastic
    )
    knob.position.set(x, 1.21 + i * 0.005, 0.04 + i * 0.025)
    group.add(knob)
  }

  // 方向盘
  const wheelGroup = new THREE.Group()
  wheelGroup.position.set(0, 1.1, 0.36)
  wheelGroup.rotation.x = -1.18
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.17, 0.017, 10, 36),
    materials.blackPlastic
  )
  wheelGroup.add(rim)
  for (let i = 0; i < 3; i++) {
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.022, 0.02),
      materials.blackMetal
    )
    spoke.rotation.z = (i / 3) * Math.PI * 2 + 0.3
    spoke.position.set(
      Math.cos((i / 3) * Math.PI * 2 + 0.3) * 0.085,
      Math.sin((i / 3) * Math.PI * 2 + 0.3) * 0.085,
      0
    )
    wheelGroup.add(spoke)
  }
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.035, 16).rotateX(Math.PI / 2),
    materials.blackMetal
  )
  wheelGroup.add(hub)
  const spinner = new THREE.Mesh(
    new THREE.SphereGeometry(0.022, 12, 8),
    materials.chrome
  )
  spinner.position.set(0.13, -0.09, 0.02)
  wheelGroup.add(spinner)
  group.add(wheelGroup)

  // 转向柱
  group.add(
    cylinderBetween(
      new THREE.Vector3(0, 0.88, 0.58),
      new THREE.Vector3(0, 1.06, 0.4),
      0.036,
      materials.dashboard
    )
  )

  // 仪表罩
  const binnacle = roundedBox(0.52, 0.2, 0.18, 0.04, materials.dashboard, 3)
  binnacle.position.set(0, 1.02, 0.46)
  binnacle.rotation.x = -0.32
  group.add(binnacle)

  // 显示屏（朝向驾驶员）
  const screen = planeWithTexture(0.33, 0.165, materials.screen)
  screen.position.set(0, 1.075, 0.375)
  screen.rotation.x = -2.5
  group.add(screen)

  // 仪表罩上的警示灯
  const lampColors = [materials.lensAmber, materials.lensRed, materials.lensWhite]
  lampColors.forEach((material, index) => {
    const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.012, 12), material)
    lamp.position.set(-0.09 + index * 0.05, 1.04, 0.535)
    lamp.rotation.x = -0.55
    group.add(lamp)
  })

  // 急停按钮
  const eStop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.032, 0.02, 16).rotateX(Math.PI / 2 - 0.2),
    materials.lensRed
  )
  eStop.position.set(0.2, 1.04, 0.52)
  group.add(eStop)

  // 踏板
  for (const side of [1, -1]) {
    const pedal = roundedBox(0.1, 0.035, 0.16, 0.012, materials.blackPlastic, 2)
    pedal.position.set(side * 0.14, 0.655, 0.12)
    pedal.rotation.x = 0.2
    group.add(pedal)
  }

  // 安全带（斜向）
  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.56, 0.012),
    materials.blackPlastic
  )
  belt.position.set(-0.16, 1.3, -0.42)
  belt.rotation.z = -0.18
  belt.rotation.x = -0.1
  group.add(belt)
  const buckle = new THREE.Mesh(
    new THREE.BoxGeometry(0.055, 0.07, 0.03),
    materials.steel
  )
  buckle.position.set(-0.2, 1.08, -0.3)
  group.add(buckle)

  return setShadow(group)
}

/* ------------------------------------------------------------------ */
/* 贴花与灯组                                                          */
/* ------------------------------------------------------------------ */

function buildMarkings(materials: Materials) {
  const group = new THREE.Group()

  const decal = planeWithTexture(0.58, 0.29, materials.decal)
  const decalLeft = planeWithTexture(0.58, 0.29, materials.decal)

  decal.position.set(PANEL_X + 0.018, 0.735, 0.0)
  decal.rotation.y = Math.PI / 2
  group.add(decal)

  decalLeft.position.set(-PANEL_X - 0.018, 0.735, 0.0)
  decalLeft.rotation.y = -Math.PI / 2
  group.add(decalLeft)

  const badgeMaterial = new THREE.MeshStandardMaterial({
    map: createExBadgeTexture(),
    transparent: true,
    roughness: 0.42,
    metalness: 0.03,
    depthWrite: false,
    side: THREE.DoubleSide
  })

  for (const side of [1, -1]) {
    const badge = planeWithTexture(0.12, 0.12, badgeMaterial)
    badge.position.set(side * (PANEL_X + 0.018), 0.855, 0.38)
    badge.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2
    group.add(badge)
  }

  // 尾部 Ex 徽标（贴在配重内凹面板上）
  const rearBadge = planeWithTexture(0.16, 0.16, badgeMaterial)
  rearBadge.position.set(0, 0.85, -1.327)
  rearBadge.rotation.y = Math.PI
  group.add(rearBadge)

  // 尾部灯组
  for (const side of [1, -1]) {
    addRounded(group, 0.13, 0.1, 0.035, 0.012, side * 0.41, 0.94, -1.302, materials.blackMetal)
    const tail = planeWithTexture(0.07, 0.055, materials.lensRed)
    tail.position.set(side * 0.395, 0.945, -1.323)
    tail.rotation.y = Math.PI
    group.add(tail)
    const amber = planeWithTexture(0.035, 0.055, materials.lensAmber)
    amber.position.set(side * 0.452, 0.945, -1.323)
    amber.rotation.y = Math.PI
    group.add(amber)
  }

  // 前部黄色警示灯（护顶架下方前围）
  addRounded(group, 0.05, 0.045, 0.03, 0.008, -0.3, 0.99, 0.62, materials.lensAmber)

  return group
}

/* ------------------------------------------------------------------ */
/* 组装                                                                */
/* ------------------------------------------------------------------ */

export interface ForkliftModel {
  group: THREE.Group
  dispose: () => void
}

export function createForklift(): ForkliftModel {
  const materials = createMaterials()
  const group = new THREE.Group()
  group.name = 'explosion-proof forklift'

  const body = buildBody(materials)
  const wheels = buildWheels(materials)
  const mast = buildMast(materials)
  const guard = buildOverheadGuard(materials)
  const operator = buildOperatorArea(materials)
  const markings = buildMarkings(materials)

  group.add(body, wheels, mast, guard, operator, markings)

  // 做一次最终的包围盒校正：让最低点（胎面花纹块）正好落在 y = 0
  group.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(group)
  if (Math.abs(box.min.y) > 0.0001) {
    group.position.y -= box.min.y
  }

  const dispose = () => {
    const geometries = new Set<THREE.BufferGeometry>()
    const ownedMaterials = new Set<THREE.Material>()
    const textures = new Set<THREE.Texture>()

    group.traverse((object) => {
      const mesh = object as THREE.Mesh
      if (!mesh.isMesh) return
      if (mesh.geometry) geometries.add(mesh.geometry)
      const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const material of list) {
        if (!material) continue
        ownedMaterials.add(material)
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) textures.add(value)
        }
      }
    })

    textures.forEach((texture) => texture.dispose())
    geometries.forEach((geometry) => geometry.dispose())
    ownedMaterials.forEach((material) => material.dispose())
  }

  return { group, dispose }
}
