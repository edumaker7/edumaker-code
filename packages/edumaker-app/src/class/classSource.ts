import { parseLessonDocument, type CatalogEntry, type Lesson } from '../content/format'
import { resolveLessonAssets, type ContentSource } from '../content/source'

/** The class document fields this app reads (from the hub's `classLogin`, without passwords). */
export interface ClassInfo {
  id: string
  blocksLessons?: unknown
  school?: unknown
  grade?: unknown
  classNum?: unknown
  orgName?: unknown
  name?: unknown
}

export type ClassLoginErrorCode = 'not-found' | 'wrong-password' | 'no-password' | 'throttled' | 'unknown'

export class ClassLoginError extends Error {
  readonly code: ClassLoginErrorCode
  constructor(code: ClassLoginErrorCode, message?: string) {
    super(message ?? code)
    this.name = 'ClassLoginError'
    this.code = code
  }
}

/** The Firebase calls the class content needs, replaceable in tests. */
export interface ClassBackend {
  /** Checks the class password and signs this browser in with the class pass; throws a ClassLoginError. */
  login(classId: string, password: string): Promise<ClassInfo>
  /** The lesson document (`blocksLessons/{lessonId}`), or null when it is missing or not open to this class. */
  getLessonDocument(lessonId: string): Promise<unknown>
  /** A download URL for a lesson file (`blocks/lessons/{lessonId}/{path}` in Storage). */
  getAssetUrl(lessonId: string, path: string): Promise<string>
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

/**
 * A short name for the class, from the fields the hub's admin page fills in.
 * @param info - The class document from the hub.
 * @returns For example "가나초 5학년 2반", or the organization or class name.
 */
export const classLabel = (info: ClassInfo): string => {
  const school = text(info.school)
  if (school) {
    const grade = typeof info.grade === 'number' ? ` ${info.grade}학년` : ''
    const classNum = typeof info.classNum === 'number' ? ` ${info.classNum}반` : ''
    return `${school}${grade}${classNum}`
  }
  return text(info.orgName) || text(info.name)
}

const lessonIdsOf = (info: ClassInfo): string[] =>
  Array.isArray(info.blocksLessons)
    ? info.blocksLessons.filter((id): id is string => typeof id === 'string' && id !== '')
    : []

/**
 * The lessons the admin opened for a class. Lessons that can't be read or are malformed are left out.
 * @param backend - Firebase access.
 * @param info - The class, from `backend.login`.
 * @returns The content source.
 */
export const createClassSource = (backend: ClassBackend, info: ClassInfo): ContentSource => {
  const lessons = new Map<string, Lesson>()
  return {
    title: classLabel(info) || undefined,
    loadCatalog: async () => {
      const documents = await Promise.all(
        lessonIdsOf(info).map(async (id) => {
          try {
            const raw = await backend.getLessonDocument(id)
            if (raw === null) {
              console.warn(`createClassSource: lesson ${id} of class ${info.id} is missing or not readable`)
              return null
            }
            return parseLessonDocument(raw, id)
          } catch (error) {
            console.error(`createClassSource: lesson ${id} of class ${info.id} could not be loaded`, error)
            return null
          }
        }),
      )
      const loaded = documents.filter((document) => document !== null)
      loaded.sort((a, b) => a.order - b.order)
      for (const document of loaded) lessons.set(document.entry.id, document.lesson)
      return { lessons: loaded.map((document): CatalogEntry => document.entry) }
    },
    loadLesson: async (entry) => {
      const lesson = lessons.get(entry.id)
      if (!lesson) throw new Error(`createClassSource: lesson ${entry.id} is not in the catalog`)
      return { lesson: await resolveLessonAssets(lesson, (path) => backend.getAssetUrl(entry.id, path)) }
    },
  }
}
