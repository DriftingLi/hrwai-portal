import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { describe, expect, it } from 'vitest'
import { materialForNode, mergeStaticByMaterial, partNodeName } from '../forklift/model'

const ASSET = resolve(
  process.cwd(),
  'public/models/forklift/explosion-proof-forklift.v2.glb'
)

async function parseGlb(buffer: Buffer): Promise<THREE.Group> {
  await MeshoptDecoder.ready
  return new Promise((resolveScene, reject) => {
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    ) as ArrayBuffer
    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
    loader.parse(arrayBuffer, '', (gltf) => resolveScene(gltf.scene), reject)
  })
}

describe('real forklift GLB', () => {
  it('parses in Node and merges 81 meshes without moving the bbox', async () => {
    const scene = await parseGlb(readFileSync(ASSET))
    const materials = new Map<string, THREE.MeshStandardMaterial>()

    scene.traverse((object) => {
      const mesh = object as THREE.Mesh
      if (!mesh.isMesh) return
      const original = Array.isArray(mesh.material) ? '' : mesh.material?.name ?? ''
      // gltfpack 保留命名的父节点，实际 Mesh 是它下面未命名的子节点。
      const key = materialForNode(partNodeName(mesh), original)
      let material = materials.get(key)
      if (!material) {
        material = new THREE.MeshStandardMaterial({ name: key })
        materials.set(key, material)
      }
      mesh.material = material
      mesh.castShadow = true
      mesh.receiveShadow = true
    })

    scene.updateMatrixWorld(true)
    const before = new THREE.Box3().setFromObject(scene)
    const size = before.getSize(new THREE.Vector3())

    const merged = mergeStaticByMaterial(scene)
    merged.updateMatrixWorld(true)
    const after = new THREE.Box3().setFromObject(merged)

    expect(after.min.distanceTo(before.min)).toBeLessThan(1e-6)
    expect(after.max.distanceTo(before.max)).toBeLessThan(1e-6)

    const meshes = merged.children.filter((child) => (child as THREE.Mesh).isMesh)
    expect(meshes.length).toBeGreaterThanOrEqual(8)
    expect(meshes.length).toBeLessThanOrEqual(20)

    expect(size.x).toBeGreaterThan(1.1)
    expect(size.x).toBeLessThan(1.35)
    expect(size.y).toBeGreaterThan(2.2)
    expect(size.y).toBeLessThan(2.4)
    expect(size.z).toBeGreaterThan(3.2)
    expect(size.z).toBeLessThan(3.5)
  })
})
