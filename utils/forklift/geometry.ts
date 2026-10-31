import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

/**
 * 叉车模型/品牌件共用的几何工具。
 * 只做“生成 + 摆位”，不在这里持有材质或场景引用。
 */

const UP = new THREE.Vector3(0, 1, 0)

export function setShadow(object: THREE.Object3D, cast = true, receive = true) {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (mesh.isMesh) {
      mesh.castShadow = cast
      mesh.receiveShadow = receive
    }
  })
  return object
}

export function roundedBox(
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

export function addRounded(
  parent: THREE.Object3D,
  width: number,
  height: number,
  depth: number,
  radius: number,
  x: number,
  y: number,
  z: number,
  material: THREE.Material,
  segments = 3
) {
  const mesh = roundedBox(width, height, depth, radius, material, segments)
  mesh.position.set(x, y, z)
  parent.add(mesh)
  return mesh
}

export function beamBetween(
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

export function cylinderBetween(
  a: THREE.Vector3,
  b: THREE.Vector3,
  radius: number,
  material: THREE.Material,
  radialSegments = 12
) {
  const delta = new THREE.Vector3().subVectors(b, a)
  const length = delta.length()
  const geometry = new THREE.CylinderGeometry(radius, radius, length, radialSegments)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.copy(a).add(b).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(UP, delta.normalize())
  return mesh
}

export function planeWithTexture(width: number, height: number, material: THREE.Material) {
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), material)
}
