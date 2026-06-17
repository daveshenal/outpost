import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store'
import { Upload, Trash2, CheckCircle, Loader, File } from 'lucide-react'

function DocCard({ doc, onDelete }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', borderRadius: 'var(--radius-md)',
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: 'var(--accent-dim)', border: '1px solid var(--accent)30',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <File size={16} color="var(--accent)" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {doc.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {doc.chunks} chunks · {doc.size}
        </div>
      </div>
      <CheckCircle size={14} color="var(--green)" />
      <button onClick={() => onDelete(doc.id)} style={{
        padding: 6, borderRadius: 6, color: 'var(--text-muted)', transition: 'color 0.1s',
      }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

export default function DocumentsPage() {
  const documents = useStore(s => s.documents)
  const fetchDocuments = useStore(s => s.fetchDocuments)
  const ingestDocument = useStore(s => s.ingestDocument)
  const deleteDocument = useStore(s => s.deleteDocument)
  const [uploading, setUploading] = useState(null) // { name, progress }
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef()

  useEffect(() => { fetchDocuments() }, [])

  const handleFiles = async (files) => {
    for (const file of files) {
      setUploading({ name: file.name, progress: 0 })
      try {
        await ingestDocument(file, (p) => setUploading(u => ({ ...u, progress: p })))
      } finally {
        setUploading(null)
      }
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(Array.from(e.dataTransfer.files))
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>Documents</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Add files to enable document Q&A (RAG) · Requires an embedding model
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '32px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragging ? 'var(--accent-dim)' : 'var(--bg-elevated)',
            transition: 'all 0.15s',
            marginBottom: 20,
          }}
        >
          <input ref={fileRef} type="file" hidden multiple
            accept=".pdf,.txt,.md,.docx,.csv"
            onChange={e => handleFiles(Array.from(e.target.files))}
          />
          <Upload size={24} color={dragging ? 'var(--accent)' : 'var(--text-muted)'} style={{ margin: '0 auto 10px' }} />
          <div style={{ fontSize: 14, fontWeight: 500, color: dragging ? 'var(--accent)' : 'var(--text-primary)', marginBottom: 4 }}>
            {dragging ? 'Drop files here' : 'Drop files or click to upload'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            PDF, TXT, Markdown, DOCX, CSV
          </div>
        </div>

        {/* Upload progress */}
        {uploading && (
          <div style={{
            padding: '12px 14px', borderRadius: 'var(--radius-md)',
            background: 'var(--accent-dim)', border: '1px solid var(--accent)30',
            marginBottom: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Loader size={13} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
              <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
              <span style={{ fontSize: 13, color: 'var(--accent)' }}>Processing {uploading.name}…</span>
            </div>
            <div style={{ height: 3, background: 'var(--bg-hover)', borderRadius: 2 }}>
              <div style={{ height: '100%', width: `${uploading.progress}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width 0.2s' }} />
            </div>
          </div>
        )}

        {/* Doc list */}
        {documents.length > 0 ? (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>
              Indexed ({documents.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {documents.map(doc => (
                <DocCard key={doc.id} doc={doc} onDelete={deleteDocument} />
              ))}
            </div>
          </div>
        ) : !uploading && (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            No documents indexed yet. Add files to start chatting with your data.
          </div>
        )}

        {/* Info */}
        <div style={{
          marginTop: 24, padding: '14px', borderRadius: 'var(--radius-md)',
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7,
        }}>
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>How it works</div>
          Documents are chunked, embedded locally using <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>nomic-embed-text</span>, and stored in a local Qdrant vector database. When you ask a question, relevant chunks are retrieved and injected into the prompt - all offline.
        </div>
      </div>
    </div>
  )
}
