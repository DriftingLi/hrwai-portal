// @vitest-environment nuxt
// 回归：分类/最新-热点/翻页切换后必须重新取数。
// useAsyncData 的 key 必须是 getter —— 静态字符串 key 在客户端路由变化时不触发重新取数，
// 页面会一直显示首次请求（sort=latest&page=1）的结果。
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { useRouter } from '#imports'

const apiMock = vi.hoisted(() => ({ getPublicList: vi.fn() }))

vi.mock('~/composables/useFeaturedApi', () => ({
  useFeaturedApi: () => apiMock
}))

function item(id: number) {
  return {
    content_id: id,
    title: `文章${id}`,
    summary: '',
    cover_image: '',
    category: 'company',
    category_label: '公司动态',
    source: '',
    status: 1,
    view_count: id,
    sort_order: 0,
    created_at: '',
    updated_at: ''
  }
}

const mounted: any[] = []

describe('NewsArchive 客户端 query / prop 变化', () => {
  beforeEach(() => {
    apiMock.getPublicList.mockReset()
    apiMock.getPublicList.mockImplementation((params: any) =>
      Promise.resolve({ items: [item(params.page ?? 1)], page: params.page ?? 1, pages: 3, total: 30 })
    )
  })

  afterEach(() => {
    mounted.splice(0).forEach((w) => w.unmount())
  })

  async function mountArchive(route: string, props: any = {}) {
    const NewsArchive = (await import('~/components/NewsArchive.vue')).default
    const w = await mountSuspended(NewsArchive, { route, props })
    mounted.push(w)
    return w
  }

  it('切到 ?sort=hot 后重新取数并带上 sort=hot', async () => {
    await mountArchive('/news')
    const router = useRouter()
    await router.push('/news?sort=hot')
    await new Promise((r) => setTimeout(r, 100))
    expect(apiMock.getPublicList).toHaveBeenCalledWith(expect.objectContaining({ sort: 'hot' }))
  })

  it('翻页 ?page=2 后重新取数并带上 page=2', async () => {
    await mountArchive('/news')
    const router = useRouter()
    await router.push('/news?page=2')
    await new Promise((r) => setTimeout(r, 100))
    expect(apiMock.getPublicList).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }))
  })

  it('category prop 变化后重新取数并带上新分类', async () => {
    const w = await mountArchive('/news/company', { category: 'company' })
    await w.setProps({ category: 'industry' })
    await new Promise((r) => setTimeout(r, 100))
    expect(apiMock.getPublicList).toHaveBeenCalledWith(expect.objectContaining({ category: 'industry' }))
  })
})
