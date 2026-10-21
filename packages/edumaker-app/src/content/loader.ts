import { parseCatalog, parseLesson, type Catalog, type CatalogEntry, type Lesson } from './format'

/**
 * Where lesson content is served from. Public sample content ships with the app (`contents/`);
 * other content can be served from elsewhere by building with `VITE_CONTENT_BASE_URL`.
 * @returns The content folder URL.
 */
export const contentBaseUrl = (): URL =>
  new URL(import.meta.env.VITE_CONTENT_BASE_URL ?? 'contents/', document.baseURI)

const fetchJson = async (url: URL, fetcher: typeof fetch): Promise<unknown> => {
  const response = await fetcher(url)
  if (!response.ok) throw new Error(`${url.href}: HTTP ${response.status}`)
  return response.json()
}

export interface LoadedLesson {
  lesson: Lesson
  /** Lesson file URL; image and project paths in the lesson are relative to it. */
  url: URL
}

export const loadCatalog = async (baseUrl: URL, fetcher: typeof fetch = fetch): Promise<Catalog> =>
  parseCatalog(await fetchJson(new URL('index.json', baseUrl), fetcher))

export const loadLesson = async (
  baseUrl: URL,
  entry: CatalogEntry,
  fetcher: typeof fetch = fetch,
): Promise<LoadedLesson> => {
  const url = new URL(entry.path, baseUrl)
  return { lesson: parseLesson(await fetchJson(url, fetcher)), url }
}

export const resolveLessonUrl = (loaded: LoadedLesson, path: string): string => new URL(path, loaded.url).href
