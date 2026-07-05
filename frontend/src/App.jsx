import { useEffect } from 'react'
import { useStore } from './store'
import Sidebar from './components/Sidebar'
import OllamaBanner from './components/OllamaBanner'
import ChatPage from './pages/ChatPage'
import ModelsPage from './pages/ModelsPage'
import DocumentsPage from './pages/DocumentsPage'
import SettingsPage from './pages/SettingsPage'
import './index.css'

const PAGES = {
  chat:      ChatPage,
  models:    ModelsPage,
  documents: DocumentsPage,
  settings:  SettingsPage,
}

const API = 'http://localhost:8765'

export default function App() {
  const page = useStore(s => s.page)
  const setBackendReady = useStore(s => s.setBackendReady)
  const checkOllama = useStore(s => s.checkOllama)
  const backendReady = useStore(s => s.backendReady)
  const ollamaStatus = useStore(s => s.ollamaStatus)

  // Wait for the Tauri sidecar backend to be ready, then check Ollama once
  useEffect(() => {
    const pollBackend = async () => {
      try {
        const r = await fetch(`${API}/health`)
        if (r.ok) {
          setBackendReady(true)
          await checkOllama()
          return
        }
      } catch {}
      setTimeout(pollBackend, 2000)
    }
    pollBackend()
  }, [])

  const Page = PAGES[page] || ChatPage
  const blocked = ollamaStatus === 'unreachable' && page !== 'settings'

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden', background: 'var(--bg-base)', position: 'relative' }}>
        {!backendReady ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
          }}>
            <div style={{
              width: 40, height: 40, border: '2px solid var(--border)',
              borderTopColor: 'var(--accent)', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Starting backend…</div>
          </div>
        ) : (
          <>
            <Page />
            {blocked && <OllamaBanner />}
          </>
        )}
      </main>
    </div>
  )
}