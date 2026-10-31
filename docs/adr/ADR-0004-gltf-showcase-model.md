# ADR-0004：三维车型展台改用 glTF 资产

- 状态：已接受
- 日期：2026-10-31
- 关联：车型详情页 3D 展台（`components/ForkliftViewer.vue`、`utils/forklift/`）

## Context

详情页最初用纯代码程序化建模（`utils/forklift/model.ts`，1490 行）：

- 结构完整但维护成本高，坐标全部硬编码；
- 4 个车轮、侧围、门架、护顶架、驾驶区由大量独立 Mesh 组成，draw call 上百；
- 出现货叉左右不对称、贴花/铭牌浮空等硬伤；
- 继续手写几何的观感提升空间有限，且每次调整都要改大量数字。

同时，站点需要可商用的 3D 资产。我们找到 Innerscene 的 CC0 电动平衡重叉车 GLB：原始 690 KB、18,460 三角面、5 个纯色材质、真实米制、结构完整，许可干净；meshopt 压缩后约 125 KB。

## Decision

1. **用 CC0 GLB 替换程序化几何**，保留现有展台、OrbitControls、预设视角、自动旋转、全屏与懒加载策略。
2. **不在 DCC 里改资产**，而是在运行时做：
   - 按节点名重映射红色车漆/深色门架/钢货叉/深色轮辋等材质；
   - 追加 Ex 贴花、铭牌、警示灯、工作灯、后视镜、挡泥板、安全带、挡货架、软管、拖车尾灯、仪表台、胎面块；
   - 按“材质 + 属性签名 + 投影标记”合并静态网格，81 Mesh → 约 12 个不透明 Mesh；原始版本实测整场景 **29 draw calls / 33.2k 三角面**（1440×1000，SwiftShader 无头 Chromium）。meshopt 压缩后沿用同一合并策略：源几何反量化、品牌实体件去 UV 后合并。
3. **加载异步化**：`createForkliftScene` 改为 async，`GLTFLoader` + `MeshoptDecoder` 懒加载；组件显示静态海报 + 进度条，失败时保留海报并提供重试。
4. **移动端自适应**：DPR 上限 1.5、阴影 1024、关闭 RectAreaLight；地坪/徽标/铭牌/仪表贴图降采样。
5. **资产版本化**：文件名带 `.v1`/`.v2`，`/models/*` 长缓存 immutable；换模型必须升版本号。许可与来源记录在 `public/models/forklift/README.md`。
6. **meshopt 压缩**：用 gltfpack `-cc -kn -km -ke -ce ext` 把原始 GLB 从 690 KB 压到约 125 KB；gltfpack 保留命名的父节点，运行时用父节点名做材质映射，量化后的 position/normal 在合并前转回 Float32，避免直接对 UShort/Int8 属性应用世界矩阵导致几何塌缩。

## Consequences

- 视觉上限取决于所选 GLB：当前是中模（18.5k 面、纯色材质），不是带 4K PBR 的影视级精模；若需更高精度，需另采购/定制资产，加载与材质管线可复用。
- 模型原始尺寸约 3,335 × 1,210 × 2,305 mm；页面规格表仍按原营销数字展示，页面已声明“尺寸为外观示意值”。若要求严格一致，需要产品确认后改文案或换模型。
- 去掉了程序化模型的运行时依赖，`model.ts` 从 1490 行降到约 800 行（含品牌件/材质/合并）；旧模型仍可从 git 历史恢复。
- 新增 meshopt 压缩后的 GLB（约 125 KB；原始 690 KB）与 GLTFLoader/MeshoptDecoder 的客户端 chunk；详情页仍是懒加载，列表页不承担 3D 体积。
- 预览图已用无头 Chromium 调用场景 `snapshot()` 导出为 v2（828×621 WebP），后续换模型按同样方式重新生成。
- 已用 Chrome for Testing headless shell + CDP 完成 5 视角、移动端布局与 stats 验收；真机帧率仍建议上线前复核。
