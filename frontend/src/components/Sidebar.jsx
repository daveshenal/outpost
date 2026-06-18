import { useStore } from '../store'
import { MessageSquare, Package, FileText, Settings, Plus, Trash2, Cpu } from 'lucide-react'
import outpostIcon from '../assets/icon-64.png'

const NAV = [
  { id: 'chat',      icon: MessageSquare, label: 'Chat' },
  { id: 'models',    icon: Package,       label: 'Models' },
  { id: 'documents', icon: FileText,      label: 'Documents' },
  { id: 'settings',  icon: Settings,      label: 'Settings' },
]

export default function Sidebar() {
  const page = useStore(s => s.page)
  const setPage = useStore(s => s.setPage)
  const activeModel = useStore(s => s.activeModel)
  const backendReady = useStore(s => s.backendReady)
  const conversations = useStore(s => s.conversations)
  const activeConvId = useStore(s => s.activeConvId)
  const createConversation = useStore(s => s.createConversation)
  const setActiveConv = useStore(s => s.setActiveConv)
  const deleteConversation = useStore(s => s.deleteConversation)

  return (
    <aside style={{
      width: 240,
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <img src={outpostIcon} width={32} height={32} />
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, letterSpacing: '-0.2px' }}>OUTPOST</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: backendReady ? 'var(--green)' : 'var(--amber)',
              display: 'inline-block',
            }} />
            {backendReady ? 'ready' : 'starting…'}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '8px 8px 0' }}>
        {NAV.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setPage(id)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 'var(--radius-sm)',
            color: page === id ? 'var(--text-primary)' : 'var(--text-secondary)',
            background: page === id ? 'var(--bg-hover)' : 'transparent',
            fontSize: 13, fontWeight: page === id ? 500 : 400,
            transition: 'all 0.12s', marginBottom: 1,
          }}
            onMouseEnter={e => { if (page !== id) e.currentTarget.style.background = 'var(--bg-elevated)' }}
            onMouseLeave={e => { if (page !== id) e.currentTarget.style.background = 'transparent' }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </nav>

      {/* Conversations (only show on chat page) */}
      {page === 'chat' && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', marginTop: 12 }}>
          <div style={{
            padding: '0 8px 6px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Chats
            </span>
            <button onClick={() => { createConversation(); setPage('chat') }} style={{
              width: 22, height: 22, borderRadius: 5,
              background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)',
            }}>
              <Plus size={12} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
            {conversations.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 2px' }}>
                No chats yet
              </div>
            ) : conversations.map(conv => (
              <div key={conv.id}
                onClick={() => setActiveConv(conv.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 8px', borderRadius: 'var(--radius-sm)', marginBottom: 1, cursor: 'pointer',
                  background: activeConvId === conv.id ? 'var(--bg-hover)' : 'transparent',
                  group: true,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--bg-hover)'
                  e.currentTarget.querySelector('.del-btn').style.opacity = '1'
                }}
                onMouseLeave={e => {
                  if (activeConvId !== conv.id) e.currentTarget.style.background = 'transparent'
                  e.currentTarget.querySelector('.del-btn').style.opacity = '0'
                }}
              >
                <span style={{
                  fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                }}>
                  {conv.title}
                </span>
                <button className="del-btn"
                  onClick={e => { e.stopPropagation(); deleteConversation(conv.id) }}
                  style={{ opacity: 0, color: 'var(--text-muted)', padding: 2, transition: 'opacity 0.1s', flexShrink: 0 }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active model footer */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid var(--border)',
        fontSize: 11,
        color: 'var(--text-muted)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <Cpu size={11} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activeModel || 'No model selected'}
        </span>
      </div>
    </aside>
  )
}
