import { describe, it, expect } from 'vitest'
import { addHeadingIds, extractToc } from '../markdown'

describe('addHeadingIds', () => {
  it('为 h2/h3 生成 id，h1/h4 不处理', () => {
    const html = addHeadingIds('<h1>标题一</h1><h2>章节A</h2><h3>小节</h3><h4>忽略</h4>')
    expect(html).toContain('<h1>标题一</h1>')
    expect(html).toContain('<h2 id="章节a">章节A</h2>')
    expect(html).toContain('<h3 id="小节">小节</h3>')
    expect(html).toContain('<h4>忽略</h4>')
  })

  it('同名标题自动追加序号保证幂等唯一', () => {
    const html = addHeadingIds('<h2>优势</h2><h2>优势</h2><h2>优势</h2>')
    expect(html).toContain('id="优势"')
    expect(html).toContain('id="优势-1"')
    expect(html).toContain('id="优势-2"')
  })

  it('纯符号/空标题回退为 section 兜底 slug', () => {
    const html = addHeadingIds('<h2>!!!</h2>')
    expect(html).toContain('id="section"')
  })

  it('已含 id 或带属性的标题不被重复处理', () => {
    const html = addHeadingIds('<h2 id="keep">已有</h2>')
    expect(html).toBe('<h2 id="keep">已有</h2>')
  })

  it('跨行内容正常提取', () => {
    const html = addHeadingIds('<h2>多行\n标题</h2>')
    expect(html).toContain('<h2 id="多行-标题">多行\n标题</h2>')
  })
})

describe('extractToc', () => {
  it('按文档顺序提取 h2/h3 及层级', () => {
    const html = addHeadingIds('<h2>章节A</h2><p>正文</p><h3>小节A1</h3><h2>章节B</h2>')
    expect(extractToc(html)).toEqual([
      { id: '章节a', text: '章节A', depth: 2 },
      { id: '小节a1', text: '小节A1', depth: 3 },
      { id: '章节b', text: '章节B', depth: 2 }
    ])
  })

  it('跳过无 id 与空文本标题', () => {
    const html = '<h2 id="a">有锚点</h2><h2>无锚点</h2><h3 id="b">   </h3>'
    expect(extractToc(html)).toEqual([{ id: 'a', text: '有锚点', depth: 2 }])
  })

  it('空输入返回空数组', () => {
    expect(extractToc('')).toEqual([])
    expect(extractToc('<p>无标题</p>')).toEqual([])
  })

  it('剥离标题内嵌套标签只留纯文本', () => {
    const html = addHeadingIds('<h2><strong>重点</strong>标题</h2>')
    expect(extractToc(html)).toEqual([{ id: '重点标题', text: '重点标题', depth: 2 }])
  })
})
