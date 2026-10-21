import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { findFailedCheck, summarizeTargets } from '../content/checks'
import type { Catalog, CatalogEntry, PanelSide } from '../content/format'
import { loadCatalog, loadLesson, resolveLessonUrl, type LoadedLesson } from '../content/loader'
import { loadEditorBundle, mountEditor, type EditorHandle } from '../editor/scratch-editor'
import { useElementById } from '../editor/useElementById'
import { messages } from '../messages'
import { AboutDialog } from './AboutDialog'
import styles from './App.module.css'
import { ContentMenu } from './ContentMenu'
import { StoryPanel, type CheckOutcome } from './StoryPanel'

export const MENU_SLOT_ID = 'em-menu'

export type CatalogState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; catalog: Catalog }

interface OpenLesson {
  loaded: LoadedLesson
  stepIndex: number
  side: PanelSide
}

export interface AppProps {
  contentBaseUrl: URL
  fetcher?: typeof fetch
}

const editorLocale = (): string => new URLSearchParams(window.location.search).get('locale') ?? 'ko'

export const App = ({ contentBaseUrl, fetcher = fetch }: AppProps) => {
  const [editorHost, setEditorHost] = useState<HTMLDivElement | null>(null)
  const editorRef = useRef<EditorHandle | null>(null)
  const [editorError, setEditorError] = useState(false)
  const [catalog, setCatalog] = useState<CatalogState>({ status: 'loading' })
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

  useEffect(() => {
    let cancelled = false
    loadCatalog(contentBaseUrl, fetcher)
      .then((loaded) => !cancelled && setCatalog({ status: 'ready', catalog: loaded }))
      .catch((error: unknown) => {
        console.error(error)
        if (!cancelled) setCatalog({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [contentBaseUrl, fetcher])

  const openLesson = useCallback(
    async (entry: CatalogEntry) => {
      setAlert(null)
      let loaded: LoadedLesson
      try {
        loaded = await loadLesson(contentBaseUrl, entry, fetcher)
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
        const response = await fetcher(resolveLessonUrl(loaded, starterProject))
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        await editor.getVm().loadProject(await response.arrayBuffer())
      } catch (error) {
        console.error(error)
        setAlert(messages.starterProjectError)
      }
    },
    [contentBaseUrl, fetcher],
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
    </div>
  )
}
