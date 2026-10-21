import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../src/app/App'
import type { VmTarget } from '../src/content/checks'

const sprite = (name: string, opcodes: string[]): VmTarget => ({
  isStage: false,
  getName: () => name,
  blocks: {
    _blocks: Object.fromEntries(
      opcodes.map((opcode, index) => [
        `b${index}`,
        { opcode, topLevel: index === 0, next: index + 1 < opcodes.length ? `b${index + 1}` : null, inputs: {} },
      ]),
    ),
  },
})

const vm = {
  runtime: { targets: [] as VmTarget[] },
  loadProject: vi.fn(() => Promise.resolve()),
}

const dispatch = vi.fn()
const renderProps = vi.fn()

beforeEach(() => {
  vm.runtime.targets = [sprite('EduBot', [])]
  window.GUI = {
    EditorState: class {
      store = { getState: () => ({ scratchGui: { vm } }), dispatch }
    },
    createStandaloneRoot: (_state, container) => ({
      render: (props) => {
        renderProps(props)
        const menuBar = document.createElement('div')
        menuBar.id = String(props.extraMenuSlotId)
        container.append(menuBar)
      },
      unmount: () => {
        container.innerHTML = ''
      },
    }),
    setAppElement: vi.fn(),
    defaultProjectId: '0',
    setProjectId: (id: string) => ({ type: 'SET_PROJECT_ID', id }),
  }
})

afterEach(() => {
  delete window.GUI
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

const catalog = {
  formatVersion: 1,
  lessons: [{ id: 'l1', title: '인사 로봇', category: '디지털시민교육', summary: '요약', path: 'l1.json' }],
}

const lesson = {
  formatVersion: 1,
  id: 'l1',
  title: '인사 로봇',
  panelSide: 'right',
  starterProject: 'starter.sb3',
  steps: [
    {
      id: 'greet',
      title: '인사하기',
      mission: '말하기 블록을 붙이세요.',
      checks: [{ type: 'hasBlockInScript', hat: 'event_whenflagclicked', opcode: 'looks_sayforsecs' }],
    },
  ],
}

const fakeFetch = (files: Record<string, unknown>) =>
  vi.fn<typeof fetch>((input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const name = url.split('/').pop() ?? ''
    if (!(name in files)) return Promise.resolve(new Response('', { status: 404 }))
    const body = files[name]
    return Promise.resolve(body instanceof ArrayBuffer ? new Response(body) : new Response(JSON.stringify(body)))
  })

const base = new URL('https://example.test/contents/')

describe('App', () => {
  it('mounts the editor with EduMaker branding and loads the default project', async () => {
    render(<App contentBaseUrl={base} fetcher={fakeFetch({ 'index.json': catalog })} />)
    await screen.findByRole('button', { name: '콘텐츠' })
    expect(renderProps).toHaveBeenCalledWith(
      expect.objectContaining({ logo: 'edumaker-logo.svg', logoAlt: '에듀메이커 블록코딩', canSave: false }),
    )
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PROJECT_ID', id: '0' })
  })

  it('opens a lesson from the content menu and checks its mission', async () => {
    const starter = new ArrayBuffer(4)
    const fetcher = fakeFetch({ 'index.json': catalog, 'l1.json': lesson, 'starter.sb3': starter })
    render(<App contentBaseUrl={base} fetcher={fetcher} />)

    fireEvent.click(await screen.findByRole('button', { name: '콘텐츠' }))
    fireEvent.click(await screen.findByRole('button', { name: /인사 로봇/ }))

    const panel = await screen.findByRole('complementary', { name: '콘텐츠 이야기' })
    expect(panel.getAttribute('data-side')).toBe('right')
    await waitFor(() => expect(vm.loadProject).toHaveBeenCalledWith(starter))

    fireEvent.click(screen.getByRole('button', { name: '확인하기' }))
    expect(screen.getByRole('status').textContent).toContain('아직')

    vm.runtime.targets = [sprite('EduBot', ['event_whenflagclicked', 'looks_sayforsecs'])]
    fireEvent.click(screen.getByRole('button', { name: '확인하기' }))
    expect(screen.getByRole('status').textContent).toContain('잘했어요')

    fireEvent.click(screen.getByRole('button', { name: '콘텐츠 닫기' }))
    expect(screen.queryByRole('complementary')).toBeNull()
  })

  it('reports content that cannot be loaded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<App contentBaseUrl={base} fetcher={fakeFetch({ 'index.json': catalog })} />)
    fireEvent.click(await screen.findByRole('button', { name: '콘텐츠' }))
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /인사 로봇/ }))
    })
    expect((await screen.findByRole('alert')).textContent).toContain('콘텐츠를 불러오지 못했습니다')
  })

  it('shows the catalog error in the menu', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<App contentBaseUrl={base} fetcher={fakeFetch({})} />)
    fireEvent.click(await screen.findByRole('button', { name: '콘텐츠' }))
    expect(await screen.findByText('콘텐츠 목록을 불러오지 못했습니다.')).toBeTruthy()
  })

  it('shows the about dialog with the source code link', async () => {
    render(<App contentBaseUrl={base} fetcher={fakeFetch({ 'index.json': catalog })} />)
    fireEvent.click(await screen.findByRole('button', { name: '정보' }))
    expect(screen.getByRole('link', { name: '소스 코드 보기' }).getAttribute('href')).toBe(
      'https://github.com/edumaker7/edumaker-editor',
    )
    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(screen.queryByRole('link', { name: '소스 코드 보기' })).toBeNull()
  })
})
