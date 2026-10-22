import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parseLessonDocument } from '../src/content/format.ts'
import { planPublish } from './content-plan.ts'

let dir = ''

const write = (file: string, content: unknown) => {
  const target = path.join(dir, file)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, typeof content === 'string' ? content : JSON.stringify(content))
}

const lesson = (id: string, extra: object = {}) => ({
  formatVersion: 1,
  id,
  title: id,
  steps: [{ id: 's', title: 'S' }],
  ...extra,
})

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'em-contents-'))
})

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('planPublish', () => {
  it('turns the catalog and lessons into documents the app can read, with their files', () => {
    write('index.json', {
      formatVersion: 1,
      lessons: [
        { id: 'one', title: '하나', category: '디지털시민교육', summary: '요약', path: 'one/lesson.json' },
        { id: 'two', title: '둘', category: '디지털시민교육', path: 'two/lesson.json' },
      ],
    })
    write('one/lesson.json', lesson('one', { steps: [{ id: 's', title: 'S', image: 'images/a.png' }] }))
    write('one/images/a.png', 'png')
    write('two/lesson.json', lesson('two', { starterProject: 'start.sb3' }))
    write('two/start.sb3', 'sb3')

    const plan = planPublish(dir)
    expect(plan.map((planned) => planned.id)).toEqual(['one', 'two'])
    expect(plan[0].assets).toEqual([
      { file: path.join(dir, 'one/images/a.png'), storagePath: 'blocks/lessons/one/images/a.png' },
    ])
    expect(plan[1].document).not.toHaveProperty('summary')
    const parsed = parseLessonDocument(plan[0].document, 'one')
    expect(parsed.entry.summary).toBe('요약')
    expect(parsed.order).toBe(0)
  })

  it.each([
    [
      'a missing file',
      lesson('one', { steps: [{ id: 's', title: 'S', image: 'images/missing.png' }] }),
      'does not exist',
    ],
    [
      'a path outside the lesson',
      lesson('one', { steps: [{ id: 's', title: 'S', image: '../x.png' }] }),
      'relative path',
    ],
    [
      'a web address',
      lesson('one', { steps: [{ id: 's', title: 'S', image: 'https://x.test/a.png' }] }),
      'relative path',
    ],
    ['a different id', lesson('other'), 'differs'],
    ['a format problem', { formatVersion: 1, id: 'one', title: 'one', steps: [] }, 'one/lesson.json: lesson.steps'],
  ])('rejects %s', (_, content, message) => {
    write('index.json', {
      formatVersion: 1,
      lessons: [{ id: 'one', title: '하나', category: 'C', path: 'one/lesson.json' }],
    })
    write('one/lesson.json', content)
    expect(() => planPublish(dir)).toThrow(message)
  })

  it('rejects lesson paths outside the content folder', () => {
    write('index.json', {
      formatVersion: 1,
      lessons: [{ id: 'one', title: '하나', category: 'C', path: '../one.json' }],
    })
    expect(() => planPublish(dir)).toThrow('inside the content folder')
  })

  it('accepts the bundled sample content', () => {
    expect(planPublish(path.resolve(import.meta.dirname, '../public/contents')).length).toBeGreaterThan(0)
  })
})
