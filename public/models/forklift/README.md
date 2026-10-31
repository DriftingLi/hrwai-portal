# 叉车 GLB 资产说明

## 来源与许可

- 名称：Electric counterbalance forklift
- 作者：Innerscene Corp（[innerscene.com](https://www.innerscene.com/)）
- 来源页：https://www.innerscene.com/tools/library/3d-parts/electric-counterbalance-forklift-7acc0547
- 下载地址：https://www.innerscene.com/api/library/electric-counterbalance-forklift-7acc0547/download
- 许可：**CC0 1.0 Universal**（公共领域奉献，可商用、可修改、可再分发，无需署名）
- 下载日期：2026-10-31
- 原始文件大小：706,388 B（约 690 KB）
- 原始文件 SHA-256：`2233d072b7aba870c9a41bfb36782116195d3e14e7e05ef2348bbb44a278e326`
- 当前 GLB 的 `asset.copyright` 字段保留了 CC0 声明，请勿删除。

## 当前版本

- 文件：`explosion-proof-forklift.v2.glb`
- 大小：127,380 B（约 125 KB）
- SHA-256：`e801dc0a7c0d1cee57a27497bf6e3d15106904d7adbd55885f591eafd69ee83d`
- 压缩：**gltfpack 1.3 + meshopt**，命令：

  ```bash
  # raw-forklift.glb 是原始下载文件，不入库
  gltfpack -i raw-forklift.glb \
    -o explosion-proof-forklift.v2.glb \
    -cc -kn -km -ke -ce ext
  ```

  - `-cc`：meshopt 高压缩比；
  - `-kn` / `-km` / `-ke`：保留命名节点/材质/extras，避免运行时按节点名做材质映射失效；
  - `-ce ext`：使用 `EXT_meshopt_compression`（three.js `GLTFLoader` + `MeshoptDecoder` 支持）。
- 扩展：`KHR_mesh_quantization` + `EXT_meshopt_compression`，两者都由 three.js `GLTFLoader` 处理；运行时必须 `loader.setMeshoptDecoder(MeshoptDecoder)`。
- 结构：gltfpack 保留 81 个**命名的父节点**，实际 Mesh 变成其下未命名的子节点（`mesh_0` 等），所以运行时用 `partNodeName(mesh)` 从父节点取语义名；position/normal 是量化属性，合并前由 `dequantizeGeometry()` 转回 Float32。
- 原始模型内容：81 个 Mesh、5 个材质（orange / steel / black / chrome / rubber）、18,460 三角面、无贴图、无动画；真实米制，+Z 为车头，Y 向上，地面 y=0。

## 修改方式

代码在 `utils/forklift/model.ts` 中完成，不直接改 GLB：

1. 按节点名/父节点名重映射材质（红漆/深色门架/钢货叉/深色轮辋等）；
2. 追加 Ex 贴花、门架铭牌、警示灯、工作灯、后视镜、挡泥板、安全带、挡货架、软管、拖车销、后扶手、尾灯、仪表台、胎面块；
3. 量化属性转 Float32、按材质合并静态网格，降低 draw call。

## 版本升级

换模型时：

1. 把新文件命名为 `explosion-proof-forklift.v3.glb`；
2. 同步修改 `utils/forklift/model.ts` 的 `FORKLIFT_MODEL_URL` 和测试里的资产路径；
3. 更新本文件的来源、哈希与版本说明；
4. 由于 `/models/*` 使用 `immutable` 长缓存，必须改版本号，不能原地覆盖 `v2`。
