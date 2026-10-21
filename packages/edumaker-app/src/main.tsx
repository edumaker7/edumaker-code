import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { contentBaseUrl } from './content/loader'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('main: #root element is missing from index.html')
// No StrictMode: its double effects would mount the whole Scratch editor (and its VM) twice.
createRoot(root).render(<App contentBaseUrl={contentBaseUrl()} />)
