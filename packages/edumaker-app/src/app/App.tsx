import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ClassLoginError, createClassSource, type ClassBackend, type ClassLoginErrorCode } from '../class/classSource'
import { rememberClassPassword, type ClassRoute } from '../class/route'
import { findFailedCheck, summarizeTargets } from '../content/checks'
import type { Catalog, CatalogEntry, PanelSide } from '../content/format'
import type { ContentSource, LoadedLesson } from '../content/source'
import { loadEditorBundle, mountEditor, type EditorHandle } from '../editor/scratch-editor'
import { useElementById } from '../editor/useElementById'
import { messages } from '../messages'
import { AboutDialog } from './AboutDialog'
import styles from './App.module.css'
import { ClassGate } from './ClassGate'
import { ContentMenu } from './ContentMenu'
import { StoryPanel, type CheckOutcome } from './StoryPanel'

export const MENU_SLOT_ID = 'em-menu'

export type CatalogState =
  /** No lessons to offer: the app is used without a class link and without sample lessons. */
  | { status: 'none' }
  | { status: 'loading' }
  | { status: 'error' }
  /** `title` is set for a class's lessons. */
  | { status: 'ready'; catalog: Catalog; title?: string }

interface ClassGateState {
  checking: boolean
  error?: ClassLoginErrorCode
  /** The dialog stays up while a typed password is checked; the link's own password is checked without it. */
  shown?: boolean
}

interface OpenLesson {
  loaded: LoadedLesson
  stepIndex: number
  side: PanelSide
}

export interface AppProps {
  /** Lessons offered without a class link (the bundled samples), or null for none. */
  sampleSource: ContentSource | null
  /** The class link the app was opened with. */
  classRoute: ClassRoute | null
  /** Loads the Firebase connection; only called for class links. */
  loadClassBackend: () => Promise<ClassBackend>
  fetcher?: typeof fetch
  sessionStorage?: Storage
}

const editorLocale = (): string => new URLSearchParams(window.location.search).get('locale') ?? 'ko'

export const App = ({
  sampleSource,
  classRoute,
  loadClassBackend,
  fetcher = fetch,
  sessionStorage = window.sessionStorage,
}: AppProps) => {
  const [editorHost, setEditorHost] = useState<HTMLDivElement | null>(null)
  const editorRef = useRef<EditorHandle | null>(null)
  const [editorError, setEditorError] = useState(false)
  const [source, setSource] = useState<ContentSource | null>(classRoute ? null : sampleSource)
  const [classGate, setClassGate] = useState<ClassGateState | null>(classRoute ? { checking: true } : null)
  const [loadedCatalog, setLoadedCatalog] = useState<{ source: ContentSource; state: CatalogState } | null>(null)
  const [lesson, setLesson] = useState<OpenLesson | null>(null)
  const [alert, setAlert] = useState<string | null>(null)
  const [aboutOpen, setAboutOpen] = useState(false)
  const menuSlot = useElementById(editorHost, MENU_SLOT_ID)

  useEffect(() => {
    if (!editorHost) return
    let cancelled = false
    loadEditorBundle('scratch-gui-standalone.js')
      .then(() => {
        if (cancelled) return
        editorRef.current = mountEditor(editorHost, {
          locale: editorLocale(),
          logo: 'edumaker-logo.svg',
          logoAlt: messages.appName,
          menuSlotId: MENU_SLOT_ID,
          basePath: './',
        })
      })
      .catch((error: unknown) => {
        console.error(error)
        if (!cancelled) setEditorError(true)
      })
    return () => {
      cancelled = true
      editorRef.current?.unmount()
      editorRef.current = null
    }
  }, [editorHost])

  // Signs in to the class and reports the outcome to the screen; `firstTry` is the attempt with the link's password.
  const tryClass = useCallback(
    (route: ClassRoute, firstTry: boolean): Promise<void> =>
      loadClassBackend()
        .then(async (backend) => {
          const info = await backend.login(route.classId, route.password)
          rememberClassPassword(sessionStorage, route)
          const classSource = createClassSource(backend, info)
          setSource({ ...classSource, title: classSource.title ?? messages.classDefaultTitle })
          setClassGate(null)
        })
        .catch((error: unknown) => {
          const code = error instanceof ClassLoginError ? error.code : 'unknown'
          if (code === 'unknown') console.error(error)
          // A link without a password is not an error yet: ask for it.
          const askQuietly =
            firstTry && route.password === '' && (code === 'wrong-password' || code === 'no-password')
          setClassGate({ checking: false, error: askQuietly ? undefined : code, shown: true })
        }),
    [loadClassBackend, sessionStorage],
  )

  useEffect(() => {
    if (classRoute) void tryClass(classRoute, true)
  }, [classRoute, tryClass])

  useEffect(() => {
    if (!source) return
    let cancelled = false
    source
      .loadCatalog()
      .then((loaded) => {
        if (!cancelled) setLoadedCatalog({ source, state: { status: 'ready', catalog: loaded, title: source.title } })
      })
      .catch((error: unknown) => {
        console.error(error)
        if (!cancelled) setLoadedCatalog({ source, state: { status: 'error' } })
      })
    return () => {
      cancelled = true
    }
  }, [source])

  const catalog: CatalogState = !source
    ? { status: 'none' }
    : loadedCatalog?.source === source
      ? loadedCatalog.state
      : { status: 'loading' }

  const openLesson = useCallback(
    async (entry: CatalogEntry) => {
      if (!source) return
      setAlert(null)
      let loaded: LoadedLesson
      try {
        loaded = await source.loadLesson(entry)
      } catch (error) {
        console.error(error)
        setAlert(messages.lessonError)
        return
      }
      setLesson({ loaded, stepIndex: 0, side: loaded.lesson.panelSide })
      const { starterProject } = loaded.lesson
      const editor = editorRef.current
      if (!starterProject || !editor) return
      try {
        const response = await fetcher(starterProject)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        await editor.getVm().loadProject(await response.arrayBuffer())
      } catch (error) {
        console.error(error)
        setAlert(messages.starterProjectError)
      }
    },
    [source, fetcher],
  )

  const checkStep = useCallback((): CheckOutcome => {
    const editor = editorRef.current
    if (!editor || !lesson) return { passed: false }
    const step = lesson.loaded.lesson.steps[lesson.stepIndex]
    const failed = findFailedCheck(summarizeTargets(editor.getVm().runtime.targets), step.checks)
    return failed ? { passed: false, feedback: failed.feedback } : { passed: true }
  }, [lesson])

  // The panel takes space from the editor: use the small stage meanwhile, and restore the student's choice after.
  const lessonOpen = lesson !== null
  useEffect(() => {
    const editor = editorRef.current
    if (!lessonOpen || !editor) return
    const stageSize = editor.getStageSize()
    editor.setStageSize('small')
    return () => editor.setStageSize(stageSize)
  }, [lessonOpen])

  // The editor measures its layout (block palette, delete area, stage) only on window resize events.
  const panelSide = lesson?.side
  useEffect(() => {
    window.dispatchEvent(new Event('resize'))
  }, [panelSide])

  const layoutClass = [styles.layout, lesson?.side === 'right' ? styles.panelRight : ''].join(' ')

  return (
    <div className={layoutClass}>
      {lesson && (
        <StoryPanel
          key={lesson.loaded.lesson.id}
          loaded={lesson.loaded}
          stepIndex={lesson.stepIndex}
          side={lesson.side}
          onStepChange={(stepIndex) => setLesson({ ...lesson, stepIndex })}
          onSideChange={(side) => setLesson({ ...lesson, side })}
          onClose={() => setLesson(null)}
          onCheck={checkStep}
        />
      )}
      <div className={styles.editor} ref={setEditorHost} />
      {editorError && (
        <p className={styles.fatal} role="alert">
          {messages.editorError}
        </p>
      )}
      {alert && (
        <p className={styles.toast} role="alert">
          {alert}
          <button type="button" className={styles.toastClose} onClick={() => setAlert(null)}>
            {messages.close}
          </button>
        </p>
      )}
      {menuSlot &&
        createPortal(
          <ContentMenu
            catalog={catalog}
            onOpenLesson={(entry) => void openLesson(entry)}
            onOpenAbout={() => setAboutOpen(true)}
          />,
          menuSlot,
        )}
      {aboutOpen && <AboutDialog onClose={() => setAboutOpen(false)} />}
      {classRoute && classGate?.shown && (
        <ClassGate
          checking={classGate.checking}
          error={classGate.error}
          onEnter={(password) => {
            setClassGate({ checking: true, shown: true })
            void tryClass({ classId: classRoute.classId, password }, false)
          }}
          onSkip={() => {
            setClassGate(null)
            setSource(sampleSource)
          }}
        />
      )}
    </div>
  )
}
