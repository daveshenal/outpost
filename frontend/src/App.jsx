import { useEffect } from 'react'
import { useStore } from './store'
import Sidebar from './components/shared/Sidebar'
import ChatPage from './components/chat/ChatPage'
import ModelsPage from './components/models/ModelsPage'
import DocumentsPage from './components/documents/DocumentsPage'
import SettingsPage from './components/settings/SettingsPage'
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
  const fetchModels = useStore(s => s.fetchModels)
  const fetchDocuments = useStore(s => s.fetchDocuments)
  const backendReady = useStore(s => s.backendReady)

  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch(`${API}/health`)
        if (r.ok) {
          setBackendReady(true)
          await fetchModels()
          await fetchDocuments()
          return
        }
      } catch {}
      setTimeout(poll, 2000)
    }
    poll()
  }, [])

  const Page = PAGES[page] || ChatPage

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden', background: 'var(--bg-base)' }}>
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
          <Page />
        )}
      </main>
    </div>
  )
}
