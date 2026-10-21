import { describe, expect, it, vi } from 'vitest'
import { loadCatalog, loadLesson, resolveLessonUrl } from '../src/content/loader'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('content loader', () => {
  const base = new URL('https://example.test/app/contents/')

  it('loads the catalog from index.json', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ formatVersion: 1, lessons: [] }))
    await expect(loadCatalog(base, fetcher)).resolves.toEqual({ lessons: [] })
    expect(fetcher.mock.calls[0][0]).toEqual(new URL('https://example.test/app/contents/index.json'))
  })

  it('resolves lesson files and their assets relative to each other', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ formatVersion: 1, id: 'l', title: 'L', steps: [{ id: 's', title: 'S' }] }))
    const loaded = await loadLesson(base, { id: 'l', title: 'L', category: 'C', path: 'unit1/l.json' }, fetcher)
    expect(loaded.url.href).toBe('https://example.test/app/contents/unit1/l.json')
    expect(resolveLessonUrl(loaded, 'images/a.png')).toBe('https://example.test/app/contents/unit1/images/a.png')
  })

  it('reports HTTP errors', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}, 404))
    await expect(loadCatalog(base, fetcher)).rejects.toThrow('HTTP 404')
  })
})
