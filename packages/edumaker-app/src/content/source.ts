import { parseCatalog, parseLesson, type Catalog, type CatalogEntry, type Lesson } from './format'

/** A lesson ready to show: image and project paths in it are absolute URLs. */
export interface LoadedLesson {
  lesson: Lesson
}

/** Where the content menu's lessons come from: the bundled sample folder, or a class's lessons in Firebase. */
export interface ContentSource {
  /** Shown above the lessons in the content menu, e.g. the class name. */
  title?: string
  loadCatalog(): Promise<Catalog>
  loadLesson(entry: CatalogEntry): Promise<LoadedLesson>
}

/**
 * Makes every image and starter project path in a lesson absolute.
 * @param lesson - A parsed lesson whose paths are relative to its own location.
 * @param resolve - Turns one relative path into a URL.
 * @returns The lesson with resolved paths.
 */
export const resolveLessonAssets = async (
  lesson: Lesson,
  resolve: (path: string) => Promise<string>,
): Promise<Lesson> => ({
  ...lesson,
  starterProject: lesson.starterProject && (await resolve(lesson.starterProject)),
  steps: await Promise.all(
    lesson.steps.map(async (step) => ({ ...step, image: step.image && (await resolve(step.image)) })),
  ),
})

/**
 * The content folder bundled with the app (`contents/`, public samples only). It can be pointed elsewhere by
 * building with `VITE_CONTENT_BASE_URL`.
 * @returns The content folder URL.
 */
export const contentBaseUrl = (): URL =>
  new URL(import.meta.env.VITE_CONTENT_BASE_URL ?? 'contents/', document.baseURI)

const fetchJson = async (url: URL, fetcher: typeof fetch): Promise<unknown> => {
  const response = await fetcher(url)
  if (!response.ok) throw new Error(`${url.href}: HTTP ${response.status}`)
  return response.json()
}

/**
 * Lessons served as static files: `index.json` lists them, and each lesson's paths are relative to its file.
 * @param baseUrl - The content folder.
 * @param fetcher - `fetch`, replaceable in tests.
 * @returns The content source.
 */
export const createStaticSource = (baseUrl: URL, fetcher: typeof fetch = fetch): ContentSource => ({
  loadCatalog: async () => parseCatalog(await fetchJson(new URL('index.json', baseUrl), fetcher)),
  loadLesson: async (entry) => {
    const url = new URL(entry.path, baseUrl)
    const lesson = parseLesson(await fetchJson(url, fetcher))
    return { lesson: await resolveLessonAssets(lesson, (path) => Promise.resolve(new URL(path, url).href)) }
  },
})
