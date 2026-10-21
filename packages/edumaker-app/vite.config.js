/// <reference types="vitest/config" />
import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'

const guiDist = path.resolve(import.meta.dirname, '../scratch-gui/dist')

/** @type {Record<string, string>} */
const contentTypes = {
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.hex': 'application/octet-stream',
}

/**
 * Serves the built Scratch editor (`scratch-gui/dist`) next to the app and copies it into the app build.
 * The editor's own files (chunks, workers, static assets) resolve some URLs against the page, so they must sit at
 * the app root rather than in a subfolder. Their names (`scratch-gui-standalone.js`, `chunks/`, `static/`, …) do not
 * clash with the app's (`index.html`, `assets/`, `contents/`).
 * @returns {import('vite').Plugin} The plugin.
 */
const scratchEditor = () => ({
  name: 'edumaker-scratch-editor',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = new URL(req.url ?? '/', 'http://localhost')
      const file = path.resolve(guiDist, decodeURIComponent(url.pathname.slice(1)))
      if (!file.startsWith(guiDist + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return next()
      res.setHeader('Content-Type', contentTypes[path.extname(file)] ?? 'application/octet-stream')
      fs.createReadStream(file).pipe(res)
    })
  },
  // Not closeBundle: dev servers (and Vitest) call that on close as well.
  writeBundle(options) {
    if (!options.dir) return
    if (!fs.existsSync(path.join(guiDist, 'scratch-gui-standalone.js'))) {
      throw new Error(`Build the editor first (npm run build --workspace=packages/scratch-gui): ${guiDist}`)
    }
    fs.cpSync(guiDist, options.dir, {
      recursive: true,
      // `scratch-gui.js` is the library build for bundlers and `types/` its typings; the app loads the standalone build.
      filter: (source) => {
        const relative = path.relative(guiDist, source)
        return !relative.endsWith('.map') && !relative.startsWith('scratch-gui.js') && relative !== 'types'
      },
    })
  },
})

export default defineConfig({
  base: './',
  plugins: [scratchEditor()],
  test: {
    environment: 'jsdom',
    setupFiles: ['test/setup.ts'],
    reporters: ['default', 'junit', ...(process.env.GITHUB_ACTIONS === 'true' ? ['github-actions'] : [])],
    outputFile: {
      junit: 'test-results/junit.xml',
    },
  },
})
