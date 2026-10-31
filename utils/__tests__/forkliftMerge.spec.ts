import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { describe, expect, it } from 'vitest'
import { mergeStaticByMaterial } from '../forklift/model'

function box(material: THREE.Material, x: number, y = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), material)
  mesh.position.set(x, y, 0)
  return mesh
}

describe('mergeStaticByMaterial', () => {
  it('merges opaque meshes and depthWrite:false decals by material', () => {
    const paint = new THREE.MeshStandardMaterial({ name: 'paint' })
    const steel = new THREE.MeshStandardMaterial({ name: 'steel' })
    // 写深度的透明件保留独立排序
    const glass = new THREE.MeshBasicMaterial({ transparent: true })
    // 贴花：透明但不写深度，同材质可以安全合并
    const decal = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false })

    const root = new THREE.Group()
    root.add(
      box(paint, -2),
      box(paint, 2),
      box(steel, 0),
      box(glass, 0, 3),
      box(decal, -1, 4),
      box(decal, 1, 4)
    )
    // RoundedBoxGeometry 是非索引的；和上面的索引 BoxGeometry 同材质时，
    // 合并器必须先补顺序索引，否则会整体回退。
    const rounded = new THREE.Mesh(
      new RoundedBoxGeometry(0.5, 0.5, 0.5, 2, 0.05),
      steel
    )
    rounded.position.x = 3
    root.add(rounded)
    root.updateMatrixWorld(true)

    const before = new THREE.Box3().setFromObject(root)
    const merged = mergeStaticByMaterial(root)
    const after = new THREE.Box3().setFromObject(merged)

    expect(after.min.distanceTo(before.min)).toBeLessThan(1e-6)
    expect(after.max.distanceTo(before.max)).toBeLessThan(1e-6)

    const meshes = merged.children.filter((child) => (child as THREE.Mesh).isMesh)
    // paint 合并成 1、steel 1、玻璃 1、两张贴花合并成 1
    expect(meshes).toHaveLength(4)

    const transparent = meshes.filter(
      (child) => ((child as THREE.Mesh).material as THREE.Material).transparent
    )
    expect(transparent).toHaveLength(2)
  })
})
