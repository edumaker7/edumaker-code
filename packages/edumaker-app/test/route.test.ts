import { describe, expect, it, vi } from 'vitest'
import { parseClassRoute, rememberClassPassword } from '../src/class/route'

const memoryStorage = (): Storage => {
  const items = new Map<string, string>()
  return {
    get length() {
      return items.size
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => items.delete(key),
    setItem: (key, value) => items.set(key, value),
  }
}

const at = (hash: string) => ({ hash, pathname: '/', search: '' }) as Location

describe('parseClassRoute', () => {
  it('ignores addresses without a class link', () => {
    const history = { replaceState: vi.fn() } as unknown as History
    expect(parseClassRoute(at(''), history, memoryStorage())).toBeNull()
    expect(parseClassRoute(at('#teacher/abc'), history, memoryStorage())).toBeNull()
    expect(parseClassRoute(at('#class/bad id'), history, memoryStorage())).toBeNull()
  })

  it('keeps the link password in session storage and removes it from the address', () => {
    const replaceState = vi.fn()
    const storage = memoryStorage()
    const route = parseClassRoute(
      at('#class/abc123?pw=%EB%B0%98%201'),
      { replaceState } as unknown as History,
      storage,
    )
    expect(route).toEqual({ classId: 'abc123', password: '반 1' })
    expect(replaceState).toHaveBeenCalledWith(null, '', '/#class/abc123')
    expect(parseClassRoute(at('#class/abc123'), { replaceState } as unknown as History, storage)).toEqual(route)
  })

  it('remembers a typed password', () => {
    const storage = memoryStorage()
    rememberClassPassword(storage, { classId: 'abc', password: 'pw' })
    const history = { replaceState: vi.fn() } as unknown as History
    expect(parseClassRoute(at('#class/abc'), history, storage)).toEqual({ classId: 'abc', password: 'pw' })
  })
})
