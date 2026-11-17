import React from 'react'
import ReactDOM from 'react-dom/client'
// Self-hosted fonts (no requests to Google servers): Inter for UI, Barlow Condensed for display.
import '@fontsource-variable/inter'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import 'maplibre-gl/dist/maplibre-gl.css'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
