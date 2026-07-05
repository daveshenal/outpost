import { useState, useEffect } from 'react'
import { useStore } from '../store'
import { Download, Trash2, CheckCircle, PackageOpen } from 'lucide-react'

const FEATURED = [
  { name: 'llama3.2:3b',        label: 'Llama 3.2 3B',        size: '2.0 GB', vram: '~3 GB', tag: 'Fast',        desc: 'Great for quick tasks, low VRAM' },
  { name: 'llama3.1:8b',        label: 'Llama 3.1 8B',        size: '4.7 GB', vram: '~6 GB', tag: 'Balanced',    desc: 'Best balance of speed and quality' },
  { name: 'deepseek-coder-v2:16b', label: 'DeepSeek Coder 16B', size: '9.1 GB', vram: '~10 GB', tag: 'Coding',  desc: 'Specialized for code generation' },
  { name: 'qwen2.5:7b',         label: 'Qwen 2.5 7B',         size: '4.4 GB', vram: '~6 GB', tag: 'Multilingual', desc: 'Excellent multilingual support' },
  { name: 'mistral:7b',         label: 'Mistral 7B',          size: '4.1 GB', vram: '~6 GB', tag: 'Classic',    desc: 'Reliable, widely tested' },
  { name: 'nomic-embed-text',   label: 'Nomic Embed',         size: '0.3 GB', vram: '~1 GB', tag: 'Embeddings', desc: 'Required for document Q&A (RAG)' },
]

const TAG_COLORS = {
  Fast:         { bg: 'var(--green-dim)',   color: 'var(--green)' },
  Balanced:     { bg: 'var(--accent-dim)',  color: 'var(--accent)' },
  Coding:       { bg: '#f59e0b15',          color: 'var(--amber)' },
  Multilingual: { bg: '#06b6d415',          color: '#06b6d4' },
  Classic:      { bg: 'var(--bg-hover)',    color: 'var(--text-secondary)' },
  Embeddings:   { bg: '#ec489915',          color: '#ec4899' },
}

const isEmbedModel = (name) => name.toLowerCase().includes('embed')

function PullProgress({ progress }) {
  const pct = progress?.total ? Math.round((progress.completed / progress.total) * 100) : 0
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
        <span>{progress?.status || 'Downloading…'}</span>
        <span>{pct}%</span>
      </div>
      <div style={{ height: 3, background: 'var(--bg-hover)', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width 0.2s' }} />
      </div>
    </div>
  )
}

function InstalledModelRow({ m, activeModel, setActiveModel, deleteModel, isEmbed }) {
  return (
    <div key={m.name} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', borderRadius: 'var(--radius-md)',
      background: activeModel === m.name ? 'var(--accent-dim)' : 'var(--bg-elevated)',
      border: `1px solid ${activeModel === m.name ? 'var(--accent)40' : 'var(--border)'}`,
      cursor: isEmbed ? 'default' : 'pointer',
      transition: 'all 0.12s',
    }} onClick={() => !isEmbed && setActiveModel(m.name)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <CheckCircle size={14} color={activeModel === m.name ? 'var(--accent)' : isEmbed ? '#ec4899' : 'var(--green)'} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {m.size ? `${(m.size / 1e9).toFixed(1)} GB` : ''}
            {isEmbed ? ' · embedding only' : activeModel === m.name ? ' · active' : ''}
          </div>
        </div>
      </div>
      <button onClick={e => { e.stopPropagation(); deleteModel(m.name) }} style={{
        padding: 6, borderRadius: 6,
        color: 'var(--text-muted)', transition: 'color 0.1s',
      }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

function SectionLabel({ text }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
      textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10,
    }}>
      {text}
    </div>
  )
}

function NoModelsPrompt({ onPull, pulling }) {
  const starter = FEATURED[0] // llama3.2:3b
  return (
    <div style={{
      margin: '0 0 28px',
      padding: '20px',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--accent-dim)',
      border: '1px solid var(--accent)30',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'var(--bg-elevated)', border: '1px solid var(--accent)40',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <PackageOpen size={17} color="var(--accent)" />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>No models installed yet</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Start with {starter.label} — {starter.size}, runs on {starter.vram} VRAM
          </div>
        </div>
      </div>
      {pulling ? (
        <PullProgress progress={pulling} />
      ) : (
        <button
          onClick={() => onPull(starter.name)}
          style={{
            alignSelf: 'flex-start',
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 'var(--radius-sm)',
            background: 'var(--accent)', color: 'white',
            fontSize: 12, fontWeight: 500,
          }}
        >
          <Download size={12} /> Download {starter.label}
        </button>
      )}
    </div>
  )
}

export default function ModelsPage() {
  const models = useStore(s => s.models)
  const ollamaStatus = useStore(s => s.ollamaStatus)
  const fetchModels = useStore(s => s.fetchModels)
  const pullModel = useStore(s => s.pullModel)
  const deleteModel = useStore(s => s.deleteModel)
  const setActiveModel = useStore(s => s.setActiveModel)
  const activeModel = useStore(s => s.activeModel)

  const [pulling, setPulling] = useState({}) // name -> progress
  const [customModel, setCustomModel] = useState('')

  useEffect(() => { fetchModels() }, [])

  const chatModels = models.filter(m => !isEmbedModel(m.name))
  const embedModels = models.filter(m => isEmbedModel(m.name))
  const noModels = models.length === 0 && ollamaStatus === 'connected'

  const isInstalled = (name) => models.some(m => m.name === name || m.name.startsWith(name.split(':')[0]))

  const handlePull = async (name) => {
    setPulling(p => ({ ...p, [name]: { status: 'Starting…' } }))
    try {
      await pullModel(name, (progress) => {
        setPulling(p => ({ ...p, [name]: progress }))
      })
    } finally {
      setPulling(p => { const next = { ...p }; delete next[name]; return next })
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>Models</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Download and manage local LLMs · RTX 3070 (8 GB VRAM) detected
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

        {/* Fresh install prompt */}
        {noModels && (
          <NoModelsPrompt
            onPull={handlePull}
            pulling={pulling['llama3.2:3b']}
          />
        )}

        {/* Installed — Chat Models */}
        {chatModels.length > 0 && (
          <section style={{ marginBottom: 20 }}>
            <SectionLabel text={`Chat Models (${chatModels.length})`} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {chatModels.map(m => (
                <InstalledModelRow
                  key={m.name} m={m}
                  activeModel={activeModel}
                  setActiveModel={setActiveModel}
                  deleteModel={deleteModel}
                  isEmbed={false}
                />
              ))}
            </div>
          </section>
        )}

        {/* Installed — Embedding Models */}
        {embedModels.length > 0 && (
          <section style={{ marginBottom: 28 }}>
            <SectionLabel text={`Embedding Models (${embedModels.length})`} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {embedModels.map(m => (
                <InstalledModelRow
                  key={m.name} m={m}
                  activeModel={activeModel}
                  setActiveModel={setActiveModel}
                  deleteModel={deleteModel}
                  isEmbed={true}
                />
              ))}
            </div>
          </section>
        )}

        {/* Featured */}
        <section style={{ marginBottom: 28 }}>
          <SectionLabel text="Available to download" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {FEATURED.map(m => {
              const installed = isInstalled(m.name)
              const inProgress = pulling[m.name]
              const tc = TAG_COLORS[m.tag] || TAG_COLORS.Classic
              const isEmbed = isEmbedModel(m.name)
              return (
                <div key={m.name} style={{
                  padding: '14px', borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  display: 'flex', flexDirection: 'column', gap: 6,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{m.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{m.desc}</div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                      background: tc.bg, color: tc.color, flexShrink: 0, marginLeft: 8,
                    }}>{m.tag}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                    <span>{m.size}</span>
                    <span>{m.vram} VRAM</span>
                  </div>
                  {inProgress ? (
                    <PullProgress progress={inProgress} />
                  ) : (
                    <button
                      onClick={() => {
                        if (installed && !isEmbed) setActiveModel(m.name)
                        else if (!installed) handlePull(m.name)
                      }}
                      style={{
                        marginTop: 4, padding: '6px 10px', borderRadius: 6,
                        background: installed ? 'var(--green-dim)' : 'var(--accent)',
                        border: installed ? '1px solid var(--green)40' : 'none',
                        color: installed ? 'var(--green)' : 'white',
                        fontSize: 12, fontWeight: 500,
                        display: 'flex', alignItems: 'center', gap: 6,
                        justifyContent: 'center',
                        cursor: installed && isEmbed ? 'default' : 'pointer',
                      }}>
                      {installed
                        ? <><CheckCircle size={12} /> {isEmbed ? 'Installed' : 'Use this model'}</>
                        : <><Download size={12} /> Download</>
                      }
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Custom */}
        <section>
          <SectionLabel text="Custom model" />
          <div style={{
            display: 'flex', gap: 8,
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '10px 12px',
          }}>
            <input value={customModel} onChange={e => setCustomModel(e.target.value)}
              placeholder="e.g. phi3:mini or llama3.2:1b"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: 13, color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
              }}
            />
            <button onClick={() => { if (customModel.trim()) { handlePull(customModel.trim()); setCustomModel('') } }} style={{
              padding: '5px 12px', borderRadius: 6, background: 'var(--accent)',
              color: 'white', fontSize: 12, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <Download size={12} /> Pull
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            Any model from <span style={{ fontFamily: 'var(--font-mono)' }}>ollama.com/library</span>
          </div>
        </section>
      </div>
    </div>
  )
}