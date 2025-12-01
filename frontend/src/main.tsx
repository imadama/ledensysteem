import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'

// Debug: Versie informatie
// Genereer een unieke build ID op basis van build tijd
const buildTime = new Date()
const buildTimestamp = buildTime.getTime()
const buildDate = buildTime.toISOString()
const buildId = `build-${buildTimestamp.toString(36)}-${Math.random().toString(36).substring(2, 9)}`

const DEBUG_INFO = {
  buildId: buildId,
  buildTime: buildDate,
  buildTimestamp: buildTimestamp,
  env: import.meta.env.MODE,
  viteApiUrl: import.meta.env.VITE_API_URL,
  packageVersion: '0.0.0', // Van package.json
  userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
  currentUrl: typeof window !== 'undefined' ? window.location.href : 'N/A',
}

// Log versie informatie bij het laden
if (typeof window !== 'undefined') {
  console.log('========================================')
  console.log('🚀 FRONTEND DEBUG INFO')
  console.log('========================================')
  console.log('🔑 Build ID:', DEBUG_INFO.buildId)
  console.log('📅 Build Time:', DEBUG_INFO.buildTime)
  console.log('⏰ Build Timestamp:', DEBUG_INFO.buildTimestamp)
  console.log('🌍 Environment:', DEBUG_INFO.env)
  console.log('🔗 VITE_API_URL:', DEBUG_INFO.viteApiUrl)
  console.log('📦 Package Version:', DEBUG_INFO.packageVersion)
  console.log('🌐 Current URL:', DEBUG_INFO.currentUrl)
  console.log('========================================')
  
  // Maak debug info beschikbaar in window object voor debugging
  ;(window as any).__DEBUG_INFO__ = DEBUG_INFO
  
  // Helper functie om debug info te tonen
  ;(window as any).showDebugInfo = () => {
    console.log('========================================')
    console.log('🔍 DEBUG INFO COMMAND')
    console.log('========================================')
    console.log('Gebruik: window.showDebugInfo() in de console')
    console.log('Of: window.__DEBUG_INFO__')
    console.log('Of: window.getBuildId() voor alleen Build ID')
    console.log('========================================')
    console.log('📋 Volledige Debug Info:')
    console.log(DEBUG_INFO)
    console.log('========================================')
    console.log('🔧 API Config:')
    console.log({
      VITE_API_URL: import.meta.env.VITE_API_URL,
      API_BASE_URL: (window as any).__API_BASE_URL__ || 'Niet beschikbaar',
    })
    console.log('========================================')
  }
  
  // Helper om alleen Build ID te krijgen
  ;(window as any).getBuildId = () => {
    console.log('🔑 Build ID:', DEBUG_INFO.buildId)
    console.log('📅 Build Time:', DEBUG_INFO.buildTime)
    return DEBUG_INFO.buildId
  }
  
  console.log('💡 Tips:')
  console.log('   - window.showDebugInfo() - Volledige debug info')
  console.log('   - window.getBuildId() - Alleen Build ID')
  console.log('   - window.__DEBUG_INFO__ - Directe toegang tot debug object')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
