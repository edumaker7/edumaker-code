import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { parseClassRoute } from './class/route'
import { contentBaseUrl, createStaticSource } from './content/source'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('main: #root element is missing from index.html')

const classRoute = parseClassRoute(window.location, window.history, window.sessionStorage)
const sampleSource = import.meta.env.VITE_SAMPLE_CONTENTS === 'false' ? null : createStaticSource(contentBaseUrl())
// Firebase is only needed for class links, so it is loaded on demand.
const loadClassBackend = () => import('./class/firebaseBackend').then((module) => module.createFirebaseBackend())

// No StrictMode: its double effects would mount the whole Scratch editor (and its VM) twice.
createRoot(root).render(
  <App sampleSource={sampleSource} classRoute={classRoute} loadClassBackend={loadClassBackend} />,
)
