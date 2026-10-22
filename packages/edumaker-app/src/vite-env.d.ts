/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONTENT_BASE_URL?: string
  /** "false" leaves the bundled sample lessons out of the menu (class lessons only). */
  readonly VITE_SAMPLE_CONTENTS?: string
  readonly VITE_SOURCE_CODE_URL?: string
}
