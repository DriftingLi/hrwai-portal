import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ASSET = resolve(
  process.cwd(),
  'public/models/forklift/explosion-proof-forklift.v2.glb'
)

/** 读取 GLB 的 JSON chunk，不解析二进制 buffer。 */
function readGlbJson(path: string) {
  const buffer = readFileSync(path)
  expect(buffer.readUInt32LE(0)).toBe(0x46546c67) // 'glTF'
  expect(buffer.readUInt32LE(4)).toBe(2)
  const jsonLength = buffer.readUInt32LE(12)
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8')) as {
    asset?: { copyright?: string }
    images?: unknown[]
    animations?: unknown[]
    materials?: Array<{ name?: string }>
    nodes?: Array<{ name?: string; mesh?: number }>
    meshes?: Array<{ primitives: Array<{ indices?: number; attributes: { POSITION: number } }> }>
    accessors?: Array<{ count?: number }>
    extensionsUsed?: string[]
  }
}

describe('forklift glTF asset', () => {
  const gltf = readGlbJson(ASSET)

  it('keeps the CC0 provenance', () => {
    expect(gltf.asset?.copyright).toContain('CC0')
  })

  it('is a static, texture-free model', () => {
    expect(gltf.images ?? []).toHaveLength(0)
    expect(gltf.animations ?? []).toHaveLength(0)
    expect(gltf.materials?.map((material) => material.name).sort()).toEqual([
      'black',
      'chrome',
      'orange',
      'rubber',
      'steel'
    ])
  })

  it('keeps the node names used by the material mapping', () => {
    const names = new Set((gltf.nodes ?? []).map((node) => node.name))
    for (const name of [
      'Counterweight',
      'Outer mast',
      'Fork blade',
      'Overhead guard rail',
      'Seat cushion',
      'Steering wheel',
      'Drive wheel_tire',
      'Steering wheel_tire'
    ]) {
      expect(names.has(name)).toBe(true)
    }
  })

  it('is meshopt-compressed and keeps the agreed extensions', () => {
    expect(gltf.extensionsUsed).toContain('EXT_meshopt_compression')
    expect(gltf.extensionsUsed).toContain('KHR_mesh_quantization')
  })

  it('stays inside the agreed triangle budget', () => {
    let triangles = 0
    // gltfpack 会复用相同 Mesh（例如轮辐）；按 node 实例统计才是实际渲染量。
    for (const node of gltf.nodes ?? []) {
      if (node.mesh === undefined) continue
      const mesh = gltf.meshes?.[node.mesh]
      if (!mesh) continue
      for (const primitive of mesh.primitives) {
        const accessor = gltf.accessors?.[primitive.indices ?? primitive.attributes.POSITION]
        triangles += (accessor?.count ?? 0) / 3
      }
    }
    expect(Math.round(triangles)).toBeGreaterThanOrEqual(15_000)
    expect(Math.round(triangles)).toBeLessThanOrEqual(25_000)
  })
})
