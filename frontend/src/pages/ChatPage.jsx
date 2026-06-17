import { useState, useRef, useEffect } from 'react'
import { useStore } from '../../store'
import { Send, Bot, User, Loader, Plus } from 'lucide-react'

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex', gap: 12, padding: '16px 0',
      borderBottom: '1px solid var(--border)',
      alignItems: 'flex-start',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: isUser ? 'var(--bg-elevated)' : 'var(--accent-dim)',
        border: `1px solid ${isUser ? 'var(--border)' : 'var(--accent)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 2,
      }}>
        {isUser ? <User size={13} color="var(--text-secondary)" /> : <Bot size={13} color="var(--accent)" />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>
          {isUser ? 'You' : 'Assistant'}
        </div>
        <div style={{
          fontSize: 14, lineHeight: 1.65, color: 'var(--text-primary)',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          fontFamily: msg.content?.includes('```') ? 'inherit' : 'inherit',
        }}>
          {msg.content || (msg.streaming ? (
            <span style={{ color: 'var(--text-muted)' }}>
              <Loader size={13} style={{ animation: 'spin 1s linear infinite', display: 'inline' }} />
            </span>
          ) : '')}
          {msg.streaming && msg.content && (
            <span style={{
              display: 'inline-block', width: 2, height: 14,
              background: 'var(--accent)', marginLeft: 2, verticalAlign: 'middle',
              animation: 'blink 1s step-end infinite',
            }} />
          )}
        </div>
      </div>
    </div>
  )
}

export default function ChatPage() {
  const [input, setInput] = useState('')
  const activeConvId = useStore(s => s.activeConvId)
  const conversations = useStore(s => s.conversations)
  const createConversation = useStore(s => s.createConversation)
  const setActiveConv = useStore(s => s.setActiveConv)
  const sendMessage = useStore(s => s.sendMessage)
  const streaming = useStore(s => s.streaming)
  const activeModel = useStore(s => s.activeModel)
  const setPage = useStore(s => s.setPage)

  const conv = conversations.find(c => c.id === activeConvId)
  const messages = conv?.messages || []
  const bottomRef = useRef(null)
  const textRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || streaming || !activeModel) return
    setInput('')
    textRef.current.style.height = 'auto'
    await sendMessage(text)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleInput = (e) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes blink { 0%,100% { opacity:1 } 50% { opacity:0 } }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
          {conv?.title || 'Chat'}
        </div>
        <button onClick={() => { createConversation() }} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          color: 'var(--text-secondary)', fontSize: 12,
          transition: 'all 0.12s',
        }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-bright)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <Plus size={12} /> New chat
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
        {messages.length === 0 ? (
          <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'var(--accent-dim)', border: '1px solid var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bot size={22} color="var(--accent)" />
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginTop: 4 }}>
              What can I help with?
            </div>
            {!activeModel && (
              <button onClick={() => setPage('models')} style={{
                marginTop: 8, padding: '7px 14px', borderRadius: 'var(--radius-sm)',
                background: 'var(--accent)', color: 'white', fontSize: 12, fontWeight: 500,
              }}>
                Download a model first
              </button>
            )}
          </div>
        ) : (
          messages.map((m, i) => <Message key={i} msg={m} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
        {!activeModel && (
          <div style={{
            marginBottom: 8, padding: '8px 12px', borderRadius: 'var(--radius-sm)',
            background: 'var(--amber)15', border: '1px solid var(--amber)40',
            fontSize: 12, color: 'var(--amber)',
          }}>
            No model selected — <button onClick={() => setPage('models')} style={{ color: 'var(--amber)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>download one</button>
          </div>
        )}
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-end',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 12px',
          transition: 'border-color 0.12s',
        }}
          onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--border-bright)'}
          onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <textarea ref={textRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKey}
            placeholder={activeModel ? 'Message… (Shift+Enter for newline)' : 'Select a model to start'}
            disabled={!activeModel || streaming}
            rows={1}
            style={{
              flex: 1, resize: 'none', background: 'transparent',
              border: 'none', outline: 'none', fontSize: 14,
              color: 'var(--text-primary)', lineHeight: 1.5,
              maxHeight: 160, overflow: 'auto',
            }}
          />
          <button onClick={handleSend}
            disabled={!input.trim() || streaming || !activeModel}
            style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: input.trim() && !streaming && activeModel ? 'var(--accent)' : 'var(--bg-hover)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
          >
            {streaming
              ? <Loader size={14} color="var(--text-muted)" style={{ animation: 'spin 1s linear infinite' }} />
              : <Send size={14} color={input.trim() && activeModel ? 'white' : 'var(--text-muted)'} />
            }
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 6 }}>
          Running locally · No internet required
        </div>
      </div>
    </div>
  )
}
