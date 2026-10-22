import { describe, expect, it, vi } from 'vitest'
import { classLabel, createClassSource, type ClassBackend } from '../src/class/classSource'

const lessonDocument = (id: string, order: number, extra: object = {}) => ({
  formatVersion: 1,
  title: `수업 ${id}`,
  category: '디지털시민교육',
  order,
  lesson: {
    formatVersion: 1,
    id,
    title: `수업 ${id}`,
    steps: [{ id: 's', title: '단계', image: 'images/a.png' }],
  },
  ...extra,
})

const backendWith = (documents: Record<string, unknown>): ClassBackend => ({
  login: vi.fn(),
  getLessonDocument: vi.fn((id: string) => Promise.resolve(id in documents ? documents[id] : null)),
  getAssetUrl: vi.fn((id: string, path: string) => Promise.resolve(`https://storage.test/${id}/${path}`)),
})

describe('classLabel', () => {
  it('names school classes and other groups', () => {
    expect(classLabel({ id: 'a', school: '가나초', grade: 5, classNum: 2 })).toBe('가나초 5학년 2반')
    expect(classLabel({ id: 'a', orgName: '코딩 동아리' })).toBe('코딩 동아리')
    expect(classLabel({ id: 'a' })).toBe('')
  })
})

describe('class content source', () => {
  it('lists the class lessons in menu order and skips ones it cannot read', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const backend = backendWith({
      b: lessonDocument('b', 2),
      a: lessonDocument('a', 1),
      broken: { formatVersion: 1, title: 'x' },
    })
    const source = createClassSource(backend, {
      id: 'class1',
      school: '가나초',
      blocksLessons: ['b', 'missing', 'broken', 'a', 3],
    })
    expect(source.title).toBe('가나초')
    const catalog = await source.loadCatalog()
    expect(catalog.lessons.map((entry) => entry.id)).toEqual(['a', 'b'])
    expect(catalog.lessons[0]).toEqual({
      id: 'a',
      title: '수업 a',
      category: '디지털시민교육',
      summary: undefined,
      path: 'a',
    })

    const { lesson } = await source.loadLesson(catalog.lessons[0])
    expect(lesson.steps[0].image).toBe('https://storage.test/a/images/a.png')
    vi.restoreAllMocks()
  })

  it('has no lessons when the class has none', async () => {
    const source = createClassSource(backendWith({}), { id: 'class1' })
    await expect(source.loadCatalog()).resolves.toEqual({ lessons: [] })
  })
})
