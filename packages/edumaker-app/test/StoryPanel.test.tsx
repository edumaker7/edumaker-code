import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StoryPanel, type StoryPanelProps } from '../src/app/StoryPanel'
import { parseLesson } from '../src/content/format'

const loaded = {
  url: new URL('https://example.test/contents/lesson.json'),
  lesson: parseLesson({
    formatVersion: 1,
    id: 'lesson',
    title: '수업',
    subtitle: '부제목',
    steps: [
      { id: 'intro', title: '시작', body: ['첫 문단', '둘째 문단'], image: 'images/intro.png' },
      {
        id: 'mission',
        title: '미션 단계',
        mission: '말하기 블록을 붙이세요.',
        hint: '이벤트 블록 아래에 붙여요.',
        checks: [{ type: 'hasSprites' }],
      },
    ],
  }),
}

const renderPanel = (props: Partial<StoryPanelProps> = {}) => {
  const handlers = {
    onStepChange: vi.fn(),
    onSideChange: vi.fn(),
    onClose: vi.fn(),
    onCheck: vi.fn(() => false),
  }
  const result = render(<StoryPanel loaded={loaded} stepIndex={0} side="left" {...handlers} {...props} />)
  return { ...result, ...handlers }
}

describe('StoryPanel', () => {
  it('shows the story of the current step', () => {
    renderPanel()
    expect(screen.getByRole('heading', { name: '수업' })).toBeTruthy()
    expect(screen.getByText('1 / 2')).toBeTruthy()
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

  it('checks the mission and shows the result', () => {
    const { onCheck, rerender } = renderPanel({ stepIndex: 1 })
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '다음' }).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: '확인하기' }))
    expect(screen.getByRole('status').textContent).toBe('아직 미션이 끝나지 않았어요. 미션을 다시 읽어 보세요.')

    onCheck.mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: '확인하기' }))
    expect(screen.getByRole('status').textContent).toBe('잘했어요! 다음 단계로 가 볼까요?')

    rerender(
      <StoryPanel
        loaded={loaded}
        stepIndex={0}
        side="left"
        onStepChange={vi.fn()}
        onSideChange={vi.fn()}
        onClose={vi.fn()}
        onCheck={onCheck}
      />,
    )
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('moves to the other side and closes', () => {
    const { onSideChange, onClose } = renderPanel()
    fireEvent.click(screen.getByRole('button', { name: '패널을 오른쪽으로' }))
    expect(onSideChange).toHaveBeenCalledWith('right')
    fireEvent.click(screen.getByRole('button', { name: '콘텐츠 닫기' }))
    expect(onClose).toHaveBeenCalled()
  })
})
