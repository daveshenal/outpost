import { useState, useEffect } from 'react'
import { Settings, Server, Database, Cpu, Save } from 'lucide-react'

const API = 'http://localhost:8765'

function fromApi(data) {
  return {
    ollamaHost: data.ollama_host ?? 'localhost',
    ollamaPort: String(data.ollama_port ?? 11434),
    backendPort: String(data.backend_port ?? 8765),
    qdrantPort: String(data.qdrant_port ?? 6333),
    contextLength: String(data.context_length ?? 4096),
    temperature: String(data.temperature ?? 0.7),
    systemPrompt: data.system_prompt ?? 'You are a helpful AI assistant running locally.',
    ragEnabled: data.rag_enabled ?? true,
    ragTopK: String(data.rag_top_k ?? 5),
    streamEnabled: data.stream_enabled ?? true,
    gpuLayers: String(data.gpu_layers ?? 99),
  }
}

function toApi(cfg) {
  return {
    ollama_host: cfg.ollamaHost,
    ollama_port: parseInt(cfg.ollamaPort, 10),
    backend_port: parseInt(cfg.backendPort, 10),
    qdrant_port: parseInt(cfg.qdrantPort, 10),
    context_length: parseInt(cfg.contextLength, 10),
    temperature: parseFloat(cfg.temperature),
    system_prompt: cfg.systemPrompt,
    rag_enabled: cfg.ragEnabled,
    rag_top_k: parseInt(cfg.ragTopK, 10),
    stream_enabled: cfg.streamEnabled,
    gpu_layers: parseInt(cfg.gpuLayers, 10),
  }
}

const Section = ({ icon: Icon, title, children }) => (
  <div style={{ marginBottom: 24 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <Icon size={14} color="var(--accent)" />
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</span>
    </div>
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)', overflow: 'hidden',
    }}>
      {children}
    </div>
  </div>
)

const Field = ({ label, hint, children, last }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 14px',
    borderBottom: last ? 'none' : '1px solid var(--border)',
  }}>
    <div>
      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{label}</div>
      {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{hint}</div>}
    </div>
    {children}
  </div>
)

const Input = ({ value, onChange, mono }) => (
  <input value={value} onChange={e => onChange(e.target.value)}
    style={{
      background: 'var(--bg-base)', border: '1px solid var(--border)',
      borderRadius: 6, padding: '5px 10px', fontSize: 12,
      color: 'var(--text-primary)', outline: 'none', width: 160,
      fontFamily: mono ? 'var(--font-mono)' : 'inherit',
    }}
    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
    onBlur={e => e.target.style.borderColor = 'var(--border)'}
  />
)

const Toggle = ({ value, onChange }) => (
  <button onClick={() => onChange(!value)} style={{
    width: 38, height: 20, borderRadius: 10,
    background: value ? 'var(--accent)' : 'var(--bg-hover)',
    border: `1px solid ${value ? 'var(--accent)' : 'var(--border)'}`,
    position: 'relative', transition: 'all 0.2s',
    flexShrink: 0,
  }}>
    <div style={{
      position: 'absolute', top: 2,
      left: value ? 18 : 2,
      width: 14, height: 14, borderRadius: '50%',
      background: 'white', transition: 'left 0.2s',
    }} />
  </button>
)

export default function SettingsPage() {
  const [cfg, setCfg] = useState(fromApi({}))
  const set = (k) => (v) => setCfg(c => ({ ...c, [k]: v }))
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(`${API}/config`)
      .then(r => r.json())
      .then(data => setCfg(fromApi(data)))
      .catch(() => {})
  }, [])

  const save = async () => {
    try {
      await fetch(`${API}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toApi(cfg)),
      })
    } catch {}
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Settings</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Configure your local AI stack</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        <Section icon={Server} title="Ollama">
          <Field label="Host" hint="Ollama server address">
            <Input value={cfg.ollamaHost} onChange={set('ollamaHost')} mono />
          </Field>
          <Field label="Port" last>
            <Input value={cfg.ollamaPort} onChange={set('ollamaPort')} mono />
          </Field>
        </Section>

        <Section icon={Cpu} title="Inference">
          <Field label="GPU Layers" hint="Number of layers offloaded to GPU (99 = all)">
            <Input value={cfg.gpuLayers} onChange={set('gpuLayers')} />
          </Field>
          <Field label="Context Length" hint="Max tokens per conversation">
            <Input value={cfg.contextLength} onChange={set('contextLength')} />
          </Field>
          <Field label="Temperature" hint="0 = focused, 1 = creative">
            <Input value={cfg.temperature} onChange={set('temperature')} />
          </Field>
          <Field label="Streaming" hint="Stream tokens as they generate" last>
            <Toggle value={cfg.streamEnabled} onChange={set('streamEnabled')} />
          </Field>
        </Section>

        <Section icon={Database} title="Vector Database (Qdrant)">
          <Field label="Port">
            <Input value={cfg.qdrantPort} onChange={set('qdrantPort')} mono />
          </Field>
          <Field label="Enable RAG" hint="Inject document context into prompts">
            <Toggle value={cfg.ragEnabled} onChange={set('ragEnabled')} />
          </Field>
          <Field label="Top K results" hint="Chunks retrieved per query" last>
            <Input value={cfg.ragTopK} onChange={set('ragTopK')} />
          </Field>
        </Section>

        <Section icon={Settings} title="System Prompt">
          <div style={{ padding: 14 }}>
            <textarea value={cfg.systemPrompt} onChange={e => set('systemPrompt')(e.target.value)}
              rows={4}
              style={{
                width: '100%', background: 'var(--bg-base)',
                border: '1px solid var(--border)', borderRadius: 6,
                padding: '8px 10px', fontSize: 13, color: 'var(--text-primary)',
                outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5,
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
        </Section>

        <button onClick={save} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px',
          borderRadius: 'var(--radius-sm)',
          background: saved ? 'var(--green-dim)' : 'var(--accent)',
          border: saved ? '1px solid var(--green)40' : 'none',
          color: saved ? 'var(--green)' : 'white',
          fontSize: 13, fontWeight: 500, transition: 'all 0.2s',
        }}>
          <Save size={13} />
          {saved ? 'Saved!' : 'Save settings'}
        </button>
      </div>
    </div>
  )
}
