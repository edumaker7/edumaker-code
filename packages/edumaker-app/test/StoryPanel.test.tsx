import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StoryPanel, type StoryPanelProps } from '../src/app/StoryPanel'
import { parseLesson } from '../src/content/format'

const loaded = {
  lesson: parseLesson({
    formatVersion: 1,
    id: 'lesson',
    title: '수업',
    subtitle: '부제목',
    steps: [
      {
        id: 'intro',
        title: '시작',
        body: ['첫 문단', '둘째 문단'],
        image: 'https://example.test/contents/images/intro.png',
      },
      {
        id: 'mission',
        title: '미션 단계',
        mission: '말하기 블록을 붙이세요.',
        hint: '이벤트 블록 아래에 붙여요.',
        checks: [{ type: 'hasSprites' }],
      },
      { id: 'outro', title: '마무리' },
    ],
  }),
}

const renderPanel = (props: Partial<StoryPanelProps> = {}) => {
  const handlers = {
    onStepChange: vi.fn(),
    onSideChange: vi.fn(),
    onClose: vi.fn(),
    onCheck: vi.fn<StoryPanelProps['onCheck']>(() => ({ passed: false })),
  }
  const result = render(<StoryPanel loaded={loaded} stepIndex={0} side="left" {...handlers} {...props} />)
  return { ...result, ...handlers }
}

describe('StoryPanel', () => {
  it('shows the story of the current step', () => {
    renderPanel()
    expect(screen.getByRole('heading', { name: '수업' })).toBeTruthy()
    expect(screen.getByText('1 / 3')).toBeTruthy()
    expect(screen.getByRole('heading', { name: '시작' })).toBeTruthy()
    expect(screen.getByText('둘째 문단')).toBeTruthy()
    expect(screen.getByRole('presentation').getAttribute('src')).toBe(
      'https://example.test/contents/images/intro.png',
    )
    expect(screen.queryByRole('button', { name: '확인하기' })).toBeNull()
  })

  it('moves between steps', () => {
    const { onStepChange } = renderPanel()
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '이전' }).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: '다음' }))
    expect(onStepChange).toHaveBeenCalledWith(1)
  })

  it('checks the mission and explains what to fix', () => {
    const { onCheck } = renderPanel({ stepIndex: 1 })
    fireEvent.click(screen.getByRole('button', { name: '확인하기' }))
    expect(screen.getByRole('status').textContent).toBe(
      '블록이 아직 미션과 맞지 않아요. 미션과 힌트를 보고 블록을 고쳐 보세요.',
    )

    onCheck.mockReturnValue({ passed: false, feedback: '말하기 블록이 떨어져 있어요.' })
    fireEvent.click(screen.getByRole('button', { name: '확인하기' }))
    expect(screen.getByRole('status').textContent).toBe('말하기 블록이 떨어져 있어요.')

    onCheck.mockReturnValue({ passed: true })
    fireEvent.click(screen.getByRole('button', { name: '확인하기' }))
    expect(screen.getByRole('status').textContent).toBe('잘했어요! 다음 단계로 가 볼까요?')
  })

  it('unlocks the next step once the mission passes, and remembers it', () => {
    const { onCheck, rerender } = renderPanel({ stepIndex: 1 })
    const next = () => screen.getByRole<HTMLButtonElement>('button', { name: '다음' })
    expect(next().disabled).toBe(true)
    expect(screen.getByText('미션을 완료하면 다음 단계로 갈 수 있어요.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '확인하기' }))
    expect(next().disabled).toBe(true)

    onCheck.mockReturnValue({ passed: true })
    fireEvent.click(screen.getByRole('button', { name: '확인하기' }))
    expect(next().disabled).toBe(false)
    expect(screen.queryByText('미션을 완료하면 다음 단계로 갈 수 있어요.')).toBeNull()

    const props = {
      loaded,
      side: 'left',
      onStepChange: vi.fn(),
      onSideChange: vi.fn(),
      onClose: vi.fn(),
      onCheck,
    } as const
    rerender(<StoryPanel {...props} stepIndex={0} />)
    expect(screen.queryByRole('status')).toBeNull()
    rerender(<StoryPanel {...props} stepIndex={1} />)
    expect(next().disabled).toBe(false)
  })

  it('says the lesson is finished when the last mission passes', () => {
    const last = {
      ...loaded,
      lesson: { ...loaded.lesson, steps: loaded.lesson.steps.slice(0, 2) },
    }
    renderPanel({ loaded: last, stepIndex: 1, onCheck: () => ({ passed: true }) })
    fireEvent.click(screen.getByRole('button', { name: '확인하기' }))
    expect(screen.getByRole('status').textContent).toBe('잘했어요! 모든 미션을 마쳤어요.')
  })

  it('moves to the other side and closes', () => {
    const { onSideChange, onClose } = renderPanel()
    fireEvent.click(screen.getByRole('button', { name: '패널을 오른쪽으로' }))
    expect(onSideChange).toHaveBeenCalledWith('right')
    fireEvent.click(screen.getByRole('button', { name: '콘텐츠 닫기' }))
    expect(onClose).toHaveBeenCalled()
  })
})
