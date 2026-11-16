import React from 'react'
import ReactDOM from 'react-dom/client'
// Self-hosted font (no requests to Google servers).
import '@fontsource-variable/inter'
import 'maplibre-gl/dist/maplibre-gl.css'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
