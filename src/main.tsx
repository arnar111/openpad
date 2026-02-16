import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'

function applyInitialDisplaySettings() {
  try {
    const raw = window.localStorage.getItem('openpad:display:pixelFont')
    const pixelFont = raw == null ? true : raw === 'true'
    document.body.classList.toggle('font-system', !pixelFont)
  } catch {
    // ignore
  }
}

applyInitialDisplaySettings()
window.addEventListener('openpad:display-settings', applyInitialDisplaySettings)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
