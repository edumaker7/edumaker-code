import { describe, expect, it, vi } from 'vitest'
import { parseLesson } from '../src/content/format'
import { createStaticSource, resolveLessonAssets } from '../src/content/source'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('static content source', () => {
  const base = new URL('https://example.test/app/contents/')

  it('loads the catalog from index.json', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ formatVersion: 1, lessons: [] }))
    await expect(createStaticSource(base, fetcher).loadCatalog()).resolves.toEqual({ lessons: [] })
    expect(fetcher.mock.calls[0][0]).toEqual(new URL('https://example.test/app/contents/index.json'))
  })

  it('resolves lesson assets relative to the lesson file', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        formatVersion: 1,
        id: 'l',
        title: 'L',
        starterProject: 'start.sb3',
        steps: [{ id: 's', title: 'S', image: 'images/a.png' }],
      }),
    )
    const { lesson } = await createStaticSource(base, fetcher).loadLesson({
      id: 'l',
      title: 'L',
      category: 'C',
      path: 'unit1/l.json',
    })
    expect(fetcher.mock.calls[0][0]).toEqual(new URL('https://example.test/app/contents/unit1/l.json'))
    expect(lesson.starterProject).toBe('https://example.test/app/contents/unit1/start.sb3')
    expect(lesson.steps[0].image).toBe('https://example.test/app/contents/unit1/images/a.png')
  })

  it('reports HTTP errors', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}, 404))
    await expect(createStaticSource(base, fetcher).loadCatalog()).rejects.toThrow('HTTP 404')
  })
})

describe('resolveLessonAssets', () => {
  it('leaves lessons without assets alone', async () => {
    const lesson = parseLesson({ formatVersion: 1, id: 'l', title: 'L', steps: [{ id: 's', title: 'S' }] })
    const resolve = vi.fn((path: string) => Promise.resolve(path))
    await expect(resolveLessonAssets(lesson, resolve)).resolves.toEqual(lesson)
    expect(resolve).not.toHaveBeenCalled()
  })
})
