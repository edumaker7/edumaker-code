import fs from 'node:fs'
import path from 'node:path'
import { CONTENT_FORMAT_VERSION, ContentFormatError, parseCatalog, parseLesson } from '../src/content/format.ts'

/** One file to upload to Storage. */
export interface PlannedAsset {
  file: string
  storagePath: string
}

/** One lesson to write to Firestore (`blocksLessons/{id}`), with its files. */
export interface PlannedLesson {
  id: string
  document: Record<string, unknown>
  assets: PlannedAsset[]
}

const readJson = (file: string): unknown => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (error) {
    throw new ContentFormatError(`${file}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// Asset paths are also the Storage paths the app asks for, so they must be plain relative paths.
const checkAssetPath = (assetPath: string, where: string) => {
  if (
    /^[a-z][a-z0-9+.-]*:/i.test(assetPath) ||
    assetPath.startsWith('/') ||
    path.posix.normalize(assetPath) !== assetPath ||
    assetPath.startsWith('../')
  ) {
    throw new ContentFormatError(`${where}: "${assetPath}" must be a relative path inside the lesson folder`)
  }
}

/**
 * Reads a content folder (an `index.json` catalog and the lesson files it lists) and works out what to publish.
 * Throws a ContentFormatError naming the file and field for the first problem, so it also validates content.
 * @param contentDir - The content folder.
 * @returns The lessons in catalog order (the order is the content menu order).
 */
export const planPublish = (contentDir: string): PlannedLesson[] => {
  const root = path.resolve(contentDir)
  const catalog = parseCatalog(readJson(path.join(root, 'index.json')))
  return catalog.lessons.map((entry, order) => {
    const lessonFile = path.resolve(root, entry.path)
    if (!lessonFile.startsWith(root + path.sep)) {
      throw new ContentFormatError(`index.json: lesson "${entry.id}" path must be inside the content folder`)
    }
    const raw = readJson(lessonFile)
    let lesson
    try {
      lesson = parseLesson(raw)
    } catch (error) {
      throw new ContentFormatError(`${entry.path}: ${error instanceof Error ? error.message : String(error)}`)
    }
    if (lesson.id !== entry.id) {
      throw new ContentFormatError(`${entry.path}: lesson id "${lesson.id}" differs from index.json id "${entry.id}"`)
    }
    const lessonDir = path.dirname(lessonFile)
    const assetPaths = [
      ...(lesson.starterProject ? [lesson.starterProject] : []),
      ...lesson.steps.flatMap((step) => (step.image ? [step.image] : [])),
    ]
    const assets = [...new Set(assetPaths)].map((assetPath) => {
      checkAssetPath(assetPath, entry.path)
      const file = path.join(lessonDir, assetPath)
      if (!fs.existsSync(file)) throw new ContentFormatError(`${entry.path}: file "${assetPath}" does not exist`)
      return { file, storagePath: `blocks/lessons/${entry.id}/${assetPath}` }
    })
    return {
      id: entry.id,
      document: {
        formatVersion: CONTENT_FORMAT_VERSION,
        title: entry.title,
        category: entry.category,
        ...(entry.summary === undefined ? {} : { summary: entry.summary }),
        order,
        lesson: raw,
      },
      assets,
    }
  })
}
