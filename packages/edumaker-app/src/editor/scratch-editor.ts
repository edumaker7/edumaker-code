import type { VmTarget } from '../content/checks'

/** The parts of the Scratch VM that the app uses. */
export interface ScratchVm {
  runtime: { targets: VmTarget[] }
  loadProject(project: ArrayBuffer): Promise<void>
}

interface StandaloneRoot {
  render(props: Record<string, unknown>): void
  unmount(): void
}

interface EditorStateInstance {
  store: {
    getState(): { scratchGui: { vm: ScratchVm; stageSize: { stageSize: StageSize } } }
    dispatch(action: unknown): void
  }
}

/** The editor bundle (`scratch-gui-standalone.js`) puts its exports on `window.GUI`. */
interface ScratchGuiGlobal {
  EditorState: new (params: { locale?: string }) => EditorStateInstance
  createStandaloneRoot(state: EditorStateInstance, container: HTMLElement): StandaloneRoot
  setAppElement(element: HTMLElement): void
  defaultProjectId: string
  setProjectId(id: string): unknown
  setStageSize(stageSize: StageSize): unknown
}

/** The editor's stage size modes (the buttons next to the stage). */
export type StageSize = 'large' | 'largeConstrained' | 'small'

declare global {
  interface Window {
    GUI?: ScratchGuiGlobal
  }
}

export interface EditorOptions {
  /** Locale for the editor; when undefined the editor uses the browser language. */
  locale?: string
  logo: string
  logoAlt: string
  /** Id for the empty menu bar element the app fills with its own menu items. */
  menuSlotId: string
  /** Base path of the editor's static files (block images and so on). */
  basePath: string
}

export interface EditorHandle {
  getVm(): ScratchVm
  getStageSize(): StageSize
  setStageSize(stageSize: StageSize): void
  unmount(): void
}

export const mountEditor = (container: HTMLElement, options: EditorOptions): EditorHandle => {
  const gui = window.GUI
  if (!gui) throw new Error('The Scratch editor bundle (window.GUI) is not loaded.')
  gui.setAppElement(container)
  const state = new gui.EditorState({ locale: options.locale })
  const root = gui.createStandaloneRoot(state, container)
  root.render({
    basePath: options.basePath,
    canSave: false,
    extraMenuSlotId: options.menuSlotId,
    logo: options.logo,
    logoAlt: options.logoAlt,
  })
  // Loads the default project (the editor's own pages do this through the URL hash).
  state.store.dispatch(gui.setProjectId(gui.defaultProjectId))
  return {
    getVm: () => state.store.getState().scratchGui.vm,
    getStageSize: () => state.store.getState().scratchGui.stageSize.stageSize,
    setStageSize: (stageSize) => state.store.dispatch(gui.setStageSize(stageSize)),
    unmount: () => root.unmount(),
  }
}

/**
 * Loads the editor bundle as a classic script; it defines `window.GUI`.
 * @param src - URL of `scratch-gui-standalone.js`.
 * @returns A promise that resolves once `window.GUI` is available.
 */
export const loadEditorBundle = (src: string): Promise<void> =>
  new Promise((resolve, reject) => {
    if (window.GUI) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Could not load ${src}`))
    document.head.append(script)
  })
