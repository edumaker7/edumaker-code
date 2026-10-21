/**
 * Lesson content format, version 1.
 *
 * Lessons are plain data (text, image paths, mission checks), kept apart from the editor code so that
 * lesson content can be published separately from the editor. The content base URL points at a folder with
 * an `index.json` catalog; each catalog entry points at a lesson file relative to that folder.
 */

export const CONTENT_FORMAT_VERSION = 1

export type PanelSide = 'left' | 'right'

/** Where to look for a block: any target, only the stage, only sprites, or one sprite by name. */
export type CheckTarget = 'any' | 'stage' | 'sprite' | { sprite: string }

export type Check =
  /** At least `minCount` blocks with this opcode exist. */
  | { type: 'hasBlock'; opcode: string; minCount: number; target: CheckTarget }
  /** Some script that starts with `hat` contains a block with `opcode`. */
  | { type: 'hasBlockInScript'; hat: string; opcode: string; target: CheckTarget }
  /** The project has at least `minCount` sprites. */
  | { type: 'hasSprites'; minCount: number }

export interface LessonStep {
  id: string
  title: string
  /** Paragraphs of the story, shown as plain text. */
  body: string[]
  /** Image URL, resolved against the lesson file. */
  image?: string
  mission?: string
  hint?: string
  checks: Check[]
}

export interface Lesson {
  id: string
  title: string
  subtitle?: string
  panelSide: PanelSide
  /** Project (.sb3) URL loaded when the lesson opens, resolved against the lesson file. */
  starterProject?: string
  steps: LessonStep[]
}

export interface CatalogEntry {
  id: string
  title: string
  category: string
  summary?: string
  /** Lesson file URL, resolved against the catalog file. */
  path: string
}

export interface Catalog {
  lessons: CatalogEntry[]
}

export class ContentFormatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ContentFormatError'
  }
}

type Raw = Record<string, unknown>

const fail = (path: string, problem: string): never => {
  throw new ContentFormatError(`${path}: ${problem}`)
}

const asObject = (value: unknown, path: string): Raw =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Raw)
    : fail(path, 'expected an object')

const asString = (value: unknown, path: string): string =>
  typeof value === 'string' && value.trim() !== '' ? value : fail(path, 'expected a non-empty string')

const optionalString = (value: unknown, path: string): string | undefined =>
  value === undefined ? undefined : asString(value, path)

const asArray = (value: unknown, path: string): unknown[] =>
  Array.isArray(value) ? value : fail(path, 'expected an array')

const asCount = (value: unknown, path: string): number => {
  if (value === undefined) return 1
  return typeof value === 'number' && Number.isInteger(value) && value >= 1
    ? value
    : fail(path, 'expected an integer ≥ 1')
}

const checkVersion = (raw: Raw, path: string) => {
  if (raw.formatVersion !== CONTENT_FORMAT_VERSION) {
    fail(`${path}.formatVersion`, `expected ${CONTENT_FORMAT_VERSION}, got ${JSON.stringify(raw.formatVersion)}`)
  }
}

const parseTarget = (value: unknown, path: string): CheckTarget => {
  if (value === undefined) return 'any'
  if (value === 'any' || value === 'stage' || value === 'sprite') return value
  const raw = asObject(value, path)
  return { sprite: asString(raw.sprite, `${path}.sprite`) }
}

const parseCheck = (value: unknown, path: string): Check => {
  const raw = asObject(value, path)
  switch (raw.type) {
    case 'hasBlock':
      return {
        type: 'hasBlock',
        opcode: asString(raw.opcode, `${path}.opcode`),
        minCount: asCount(raw.minCount, `${path}.minCount`),
        target: parseTarget(raw.target, `${path}.target`),
      }
    case 'hasBlockInScript':
      return {
        type: 'hasBlockInScript',
        hat: asString(raw.hat, `${path}.hat`),
        opcode: asString(raw.opcode, `${path}.opcode`),
        target: parseTarget(raw.target, `${path}.target`),
      }
    case 'hasSprites':
      return { type: 'hasSprites', minCount: asCount(raw.minCount, `${path}.minCount`) }
    default:
      return fail(`${path}.type`, `unknown check type ${JSON.stringify(raw.type)}`)
  }
}

const uniqueIds = <T extends { id: string }>(items: T[], path: string): T[] => {
  const seen = new Set<string>()
  for (const item of items) {
    if (seen.has(item.id)) fail(path, `duplicate id "${item.id}"`)
    seen.add(item.id)
  }
  return items
}

export const parseLesson = (value: unknown): Lesson => {
  const raw = asObject(value, 'lesson')
  checkVersion(raw, 'lesson')
  const side = raw.panelSide ?? 'left'
  if (side !== 'left' && side !== 'right') fail('lesson.panelSide', 'expected "left" or "right"')
  const steps = asArray(raw.steps, 'lesson.steps').map((stepValue, index): LessonStep => {
    const path = `lesson.steps[${index}]`
    const step = asObject(stepValue, path)
    return {
      id: asString(step.id, `${path}.id`),
      title: asString(step.title, `${path}.title`),
      body: asArray(step.body ?? [], `${path}.body`).map((paragraph, i) => asString(paragraph, `${path}.body[${i}]`)),
      image: optionalString(step.image, `${path}.image`),
      mission: optionalString(step.mission, `${path}.mission`),
      hint: optionalString(step.hint, `${path}.hint`),
      checks: asArray(step.checks ?? [], `${path}.checks`).map((check, i) =>
        parseCheck(check, `${path}.checks[${i}]`),
      ),
    }
  })
  if (steps.length === 0) fail('lesson.steps', 'expected at least one step')
  return {
    id: asString(raw.id, 'lesson.id'),
    title: asString(raw.title, 'lesson.title'),
    subtitle: optionalString(raw.subtitle, 'lesson.subtitle'),
    panelSide: side as PanelSide,
    starterProject: optionalString(raw.starterProject, 'lesson.starterProject'),
    steps: uniqueIds(steps, 'lesson.steps'),
  }
}

export const parseCatalog = (value: unknown): Catalog => {
  const raw = asObject(value, 'catalog')
  checkVersion(raw, 'catalog')
  const lessons = asArray(raw.lessons, 'catalog.lessons').map((entryValue, index): CatalogEntry => {
    const path = `catalog.lessons[${index}]`
    const entry = asObject(entryValue, path)
    return {
      id: asString(entry.id, `${path}.id`),
      title: asString(entry.title, `${path}.title`),
      category: asString(entry.category, `${path}.category`),
      summary: optionalString(entry.summary, `${path}.summary`),
      path: asString(entry.path, `${path}.path`),
    }
  })
  return { lessons: uniqueIds(lessons, 'catalog.lessons') }
}
