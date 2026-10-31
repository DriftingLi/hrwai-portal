/**
 * 展台预设视角（轻量数据，不含 three 依赖）。
 * 组件用它渲染按钮，场景用它计算相机位置——两边共用，保证标签与机位一致。
 */

export type ForkliftViewId = 'front34' | 'front' | 'side' | 'rear34' | 'rear'

export interface ForkliftViewPreset {
  id: ForkliftViewId
  label: string
  hint: string
  direction: [number, number, number]
  distance: number
}

export const FORKLIFT_VIEWS: readonly ForkliftViewPreset[] = [
  {
    id: 'front34',
    label: '前侧 3/4',
    hint: '默认视角',
    direction: [0.8, 0.36, 0.9],
    distance: 5.7
  },
  {
    id: 'front',
    label: '正面',
    hint: '门架与货叉',
    direction: [0, 0.16, 1],
    distance: 5.8
  },
  {
    id: 'side',
    label: '正侧面',
    hint: '车身与轮位',
    direction: [1, 0.13, 0.02],
    distance: 4.9
  },
  {
    id: 'rear34',
    label: '后侧 3/4',
    hint: '配重与护顶架',
    direction: [-0.8, 0.34, -0.88],
    distance: 5.65
  },
  {
    id: 'rear',
    label: '车尾',
    hint: '配重与尾灯',
    direction: [0, 0.2, -1],
    distance: 5.15
  }
]
