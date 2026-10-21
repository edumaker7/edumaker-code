import { describe, expect, it } from 'vitest'
import { ContentFormatError, parseCatalog, parseLesson } from '../src/content/format'

const minimalLesson = {
  formatVersion: 1,
  id: 'lesson',
  title: 'Lesson',
  steps: [{ id: 'one', title: 'One' }],
}

describe('parseLesson', () => {
  it('fills in defaults', () => {
    expect(parseLesson(minimalLesson)).toEqual({
      id: 'lesson',
      title: 'Lesson',
      subtitle: undefined,
      panelSide: 'left',
      starterProject: undefined,
      steps: [
        { id: 'one', title: 'One', body: [], image: undefined, mission: undefined, hint: undefined, checks: [] },
      ],
    })
  })

  it('parses checks with defaults', () => {
    const lesson = parseLesson({
      ...minimalLesson,
      panelSide: 'right',
      steps: [
        {
          id: 'one',
          title: 'One',
          checks: [
            { type: 'hasBlock', opcode: 'motion_movesteps' },
            { type: 'hasBlockInScript', hat: 'event_whenflagclicked', opcode: 'looks_say', target: { sprite: 'A' } },
            { type: 'hasSprites', minCount: 2 },
          ],
        },
      ],
    })
    expect(lesson.panelSide).toBe('right')
    expect(lesson.steps[0].checks).toEqual([
      { type: 'hasBlock', opcode: 'motion_movesteps', minCount: 1, target: 'any' },
      { type: 'hasBlockInScript', hat: 'event_whenflagclicked', opcode: 'looks_say', target: { sprite: 'A' } },
      { type: 'hasSprites', minCount: 2 },
    ])
  })

  it.each([
    ['a different format version', { ...minimalLesson, formatVersion: 2 }, 'lesson.formatVersion'],
    ['no steps', { ...minimalLesson, steps: [] }, 'lesson.steps'],
    [
      'duplicate step ids',
      { ...minimalLesson, steps: [minimalLesson.steps[0], minimalLesson.steps[0]] },
      'duplicate',
    ],
    ['an unknown panel side', { ...minimalLesson, panelSide: 'top' }, 'lesson.panelSide'],
    ['an empty title', { ...minimalLesson, title: ' ' }, 'lesson.title'],
    [
      'an unknown check type',
      { ...minimalLesson, steps: [{ id: 'a', title: 'A', checks: [{ type: 'runsWithoutErrors' }] }] },
      'lesson.steps[0].checks[0].type',
    ],
    [
      'a zero count',
      { ...minimalLesson, steps: [{ id: 'a', title: 'A', checks: [{ type: 'hasSprites', minCount: 0 }] }] },
      'minCount',
    ],
    ['a non-string paragraph', { ...minimalLesson, steps: [{ id: 'a', title: 'A', body: [3] }] }, 'body[0]'],
  ])('rejects %s', (_, value, message) => {
    expect(() => parseLesson(value)).toThrow(ContentFormatError)
    expect(() => parseLesson(value)).toThrow(message)
  })
})

describe('parseCatalog', () => {
  it('parses entries', () => {
    expect(
      parseCatalog({
        formatVersion: 1,
        lessons: [{ id: 'a', title: 'A', category: 'C', path: 'a.json' }],
      }),
    ).toEqual({ lessons: [{ id: 'a', title: 'A', category: 'C', summary: undefined, path: 'a.json' }] })
  })

  it('rejects duplicate ids', () => {
    const entry = { id: 'a', title: 'A', category: 'C', path: 'a.json' }
    expect(() => parseCatalog({ formatVersion: 1, lessons: [entry, entry] })).toThrow('duplicate id "a"')
  })
})

describe('bundled sample content', () => {
  const files = import.meta.glob<unknown>('../public/contents/**/*.json', { eager: true, import: 'default' })
  const read = (file: string): unknown => files[`../public/contents/${file}`]

  it('is valid', () => {
    const catalog = parseCatalog(read('index.json'))
    expect(catalog.lessons.length).toBeGreaterThan(0)
    for (const entry of catalog.lessons) {
      expect(parseLesson(read(entry.path)).id).toBe(entry.id)
    }
  })
})
