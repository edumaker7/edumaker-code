import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App, type AppProps } from '../src/app/App'
import type { ClassBackend } from '../src/class/classSource'
import { ClassLoginError } from '../src/class/classSource'
import type { VmTarget } from '../src/content/checks'
import { createStaticSource } from '../src/content/source'
import type { StageSize } from '../src/editor/scratch-editor'

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

let stageSize: StageSize = 'large'
const dispatch = vi.fn((action: { type: string; stageSize?: StageSize }) => {
  if (action.type === 'SET_STAGE_SIZE' && action.stageSize) stageSize = action.stageSize
})
const renderProps = vi.fn()

beforeEach(() => {
  stageSize = 'largeConstrained'
  vm.runtime.targets = [sprite('EduBot', [])]
  window.GUI = {
    EditorState: class {
      store = { getState: () => ({ scratchGui: { vm, stageSize: { stageSize } } }), dispatch }
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
    setStageSize: (size: StageSize) => ({ type: 'SET_STAGE_SIZE', stageSize: size }),
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
      checks: [
        {
          type: 'hasBlockInScript',
          hat: 'event_whenflagclicked',
          opcode: 'looks_sayforsecs',
          feedback: '깃발 블록 아래에 말하기 블록을 붙였나요?',
        },
      ],
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

const renderApp = (fetcher: typeof fetch, props: Partial<AppProps> = {}) =>
  render(
    <App
      sampleSource={createStaticSource(base, fetcher)}
      classRoute={null}
      loadClassBackend={() => Promise.reject(new Error('no class backend in this test'))}
      fetcher={fetcher}
      {...props}
    />,
  )

describe('App', () => {
  it('mounts the editor with EduMaker branding and loads the default project', async () => {
    renderApp(fakeFetch({ 'index.json': catalog }))
    await screen.findByRole('button', { name: '콘텐츠' })
    expect(renderProps).toHaveBeenCalledWith(
      expect.objectContaining({ logo: 'edumaker-logo.svg', logoAlt: '에듀메이커 블록코딩', canSave: false }),
    )
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PROJECT_ID', id: '0' })
  })

  it('opens a lesson from the content menu and checks its mission', async () => {
    const starter = new ArrayBuffer(4)
    const fetcher = fakeFetch({ 'index.json': catalog, 'l1.json': lesson, 'starter.sb3': starter })
    const resized = vi.fn()
    window.addEventListener('resize', resized)
    renderApp(fetcher)

    fireEvent.click(await screen.findByRole('button', { name: '콘텐츠' }))
    fireEvent.click(await screen.findByRole('button', { name: /인사 로봇/ }))

    const panel = await screen.findByRole('complementary', { name: '콘텐츠 이야기' })
    expect(panel.getAttribute('data-side')).toBe('right')
    // The editor re-measures its layout when the panel takes up space, and uses the small stage.
    expect(resized).toHaveBeenCalled()
    expect(stageSize).toBe('small')
    await waitFor(() => expect(vm.loadProject).toHaveBeenCalledWith(starter))

    fireEvent.click(screen.getByRole('button', { name: '확인하기' }))
    expect(screen.getByRole('status').textContent).toBe('깃발 블록 아래에 말하기 블록을 붙였나요?')

    vm.runtime.targets = [sprite('EduBot', ['event_whenflagclicked', 'looks_sayforsecs'])]
    fireEvent.click(screen.getByRole('button', { name: '확인하기' }))
    expect(screen.getByRole('status').textContent).toContain('잘했어요')

    resized.mockClear()
    fireEvent.click(screen.getByRole('button', { name: '콘텐츠 닫기' }))
    expect(screen.queryByRole('complementary')).toBeNull()
    expect(resized).toHaveBeenCalled()
    expect(stageSize).toBe('largeConstrained')
    window.removeEventListener('resize', resized)
  })

  it('reports content that cannot be loaded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderApp(fakeFetch({ 'index.json': catalog }))
    fireEvent.click(await screen.findByRole('button', { name: '콘텐츠' }))
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /인사 로봇/ }))
    })
    expect((await screen.findByRole('alert')).textContent).toContain('콘텐츠를 불러오지 못했습니다')
  })

  it('shows the catalog error in the menu', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderApp(fakeFetch({}))
    fireEvent.click(await screen.findByRole('button', { name: '콘텐츠' }))
    expect(await screen.findByText('콘텐츠 목록을 불러오지 못했습니다.')).toBeTruthy()
  })

  it('shows the about dialog with the source code link', async () => {
    renderApp(fakeFetch({ 'index.json': catalog }))
    fireEvent.click(await screen.findByRole('button', { name: '정보' }))
    expect(screen.getByRole('link', { name: '소스 코드 보기' }).getAttribute('href')).toBe(
      'https://github.com/edumaker7/edumaker-code',
    )
    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(screen.queryByRole('link', { name: '소스 코드 보기' })).toBeNull()
  })

  describe('class links', () => {
    const classLesson = {
      formatVersion: 1,
      title: '우리 반 수업',
      category: '디지털시민교육',
      order: 1,
      lesson: { ...lesson, id: 'c1', title: '우리 반 수업', starterProject: undefined },
    }

    const classBackend = (login: ClassBackend['login']): ClassBackend => ({
      login,
      getLessonDocument: vi.fn(() => Promise.resolve(classLesson)),
      getAssetUrl: vi.fn((id: string, path: string) => Promise.resolve(`https://storage.test/${id}/${path}`)),
    })

    it('enters the class from the link and shows only its lessons', async () => {
      const login = vi.fn(() =>
        Promise.resolve({ id: 'k1', school: '가나초', grade: 5, classNum: 2, blocksLessons: ['c1'] }),
      )
      renderApp(fakeFetch({ 'index.json': catalog }), {
        classRoute: { classId: 'k1', password: 'pw' },
        loadClassBackend: () => Promise.resolve(classBackend(login)),
      })
      fireEvent.click(await screen.findByRole('button', { name: '콘텐츠' }))
      expect(await screen.findByText('가나초 5학년 2반')).toBeTruthy()
      expect(screen.getByRole('button', { name: /우리 반 수업/ })).toBeTruthy()
      expect(screen.queryByRole('button', { name: /인사 로봇/ })).toBeNull()
      expect(login).toHaveBeenCalledWith('k1', 'pw')
      expect(window.sessionStorage.getItem('em:linkpw:class:k1')).toBe('pw')
    })

    it('asks for the password when the link has none, and explains a wrong one', async () => {
      const login = vi.fn((_classId: string, password: string) =>
        password === 'right'
          ? Promise.resolve({ id: 'k1', orgName: '코딩 동아리', blocksLessons: [] })
          : Promise.reject(new ClassLoginError('wrong-password')),
      )
      renderApp(fakeFetch({ 'index.json': catalog }), {
        classRoute: { classId: 'k1', password: '' },
        loadClassBackend: () => Promise.resolve(classBackend(login)),
      })
      const dialog = await screen.findByRole('dialog', { name: '우리 반 입장' })
      expect(screen.getByRole('alert').textContent).toBe('')

      fireEvent.change(screen.getByLabelText('반 비밀번호'), { target: { value: 'wrong' } })
      fireEvent.submit(dialog)
      await waitFor(() =>
        expect(screen.getByRole('alert').textContent).toBe('비밀번호가 틀렸어요. 선생님께 확인해 주세요.'),
      )

      fireEvent.change(screen.getByLabelText('반 비밀번호'), { target: { value: 'right' } })
      fireEvent.submit(screen.getByRole('dialog'))
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      fireEvent.click(screen.getByRole('button', { name: '콘텐츠' }))
      expect(await screen.findByText('아직 우리 반에 열린 수업이 없어요.')).toBeTruthy()
    })

    it('lets the student code without the class', async () => {
      renderApp(fakeFetch({ 'index.json': catalog }), {
        classRoute: { classId: 'k1', password: '' },
        sampleSource: null,
        loadClassBackend: () =>
          Promise.resolve(classBackend(() => Promise.reject(new ClassLoginError('no-password')))),
      })
      fireEvent.click(await screen.findByRole('button', { name: '반 없이 자유롭게 코딩하기' }))
      expect(screen.queryByRole('dialog')).toBeNull()
      fireEvent.click(await screen.findByRole('button', { name: '콘텐츠' }))
      expect(await screen.findByText('반 링크로 들어오면 우리 반 수업 콘텐츠가 여기에 보여요.')).toBeTruthy()
    })
  })
})
