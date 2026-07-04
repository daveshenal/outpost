import { useState, useEffect } from 'react'
import { useStore } from '../store'
import { Wifi, RefreshCw, Terminal } from 'lucide-react'

const RETRY_INTERVAL = 5000
const RETRY_TIMEOUT = 60000

export default function OllamaBanner() {
  const ollamaStatus = useStore(s => s.ollamaStatus)
  const checkOllama = useStore(s => s.checkOllama)

  const [retrying, setRetrying] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(null)

  // Auto-retry on first appearance (startup check)
  useEffect(() => {
    if (ollamaStatus !== 'unreachable') {
      setRetrying(false)
      setTimedOut(false)
      setSecondsLeft(null)
      return
    }
  }, [ollamaStatus])

  const startRetrying = () => {
    setRetrying(true)
    setTimedOut(false)
    setSecondsLeft(Math.round(RETRY_TIMEOUT / 1000))

    const started = Date.now()

    const tick = async () => {
      const elapsed = Date.now() - started
      const remaining = Math.max(0, Math.round((RETRY_TIMEOUT - elapsed) / 1000))
      setSecondsLeft(remaining)

      const ok = await checkOllama()
      if (ok) {
        setRetrying(false)
        setSecondsLeft(null)
        return
      }

      if (elapsed >= RETRY_TIMEOUT) {
        setRetrying(false)
        setTimedOut(true)
        setSecondsLeft(null)
        return
      }

      setTimeout(tick, RETRY_INTERVAL)
    }

    setTimeout(tick, RETRY_INTERVAL)
  }

  if (ollamaStatus === 'checking' || ollamaStatus === 'connected') return null

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 100,
      background: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 0,
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse-icon { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
      `}</style>

      {/* Icon */}
      <div style={{
        width: 56, height: 56, borderRadius: 16, marginBottom: 20,
        background: 'var(--bg-elevated)',
        border: `1px solid ${timedOut ? 'var(--red)30' : 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: retrying ? 'pulse-icon 2s ease-in-out infinite' : 'none',
      }}>
        <Wifi size={24} color={timedOut ? 'var(--red)' : 'var(--text-muted)'} />
      </div>

      {/* Title */}
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
        {timedOut ? "Couldn't connect to Ollama" : "Ollama isn't reachable"}
      </div>

      {/* Subtitle */}
      <div style={{
        fontSize: 13, color: 'var(--text-muted)', textAlign: 'center',
        maxWidth: 340, lineHeight: 1.6, marginBottom: 28,
      }}>
        {timedOut
          ? "Still no connection after 60s. Make sure Ollama is installed and running, then try again."
          : "Outpost needs Ollama to run models. Start it and retry."
        }
      </div>

      {/* Fix hint */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px', borderRadius: 'var(--radius-md)',
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        marginBottom: 20,
      }}>
        <Terminal size={13} color="var(--text-muted)" />
        <code style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
          ollama serve
        </code>
      </div>

      {/* Retry button / status */}
      {retrying ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
            <div style={{
              width: 14, height: 14, border: '2px solid var(--border)',
              borderTopColor: 'var(--accent)', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', flexShrink: 0,
            }} />
            Retrying…
          </div>
          {secondsLeft !== null && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Giving up in {secondsLeft}s
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={startRetrying}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 18px', borderRadius: 'var(--radius-sm)',
            background: 'var(--accent)', color: 'white',
            fontSize: 13, fontWeight: 500,
          }}
        >
          <RefreshCw size={13} />
          {timedOut ? 'Try again' : 'Retry'}
        </button>
      )}
    </div>
  )
}