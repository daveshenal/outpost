import { create } from 'zustand'

const API = 'http://localhost:8765'

function uid() {
  return crypto.randomUUID()
}

function loadConversations() {
  try {
    return JSON.parse(localStorage.getItem('conversations') || '[]')
  } catch {
    return []
  }
}

function saveConversations(conversations) {
  localStorage.setItem('conversations', JSON.stringify(conversations))
}

export const useStore = create((set, get) => ({
  page: 'chat',
  backendReady: false,
  models: [],
  documents: [],
  activeModel: localStorage.getItem('activeModel') || null,
  conversations: loadConversations(),
  activeConvId: null,
  streaming: false,

  setPage: (page) => set({ page }),
  setBackendReady: (ready) => set({ backendReady: ready }),

  setActiveModel: (model) => {
    localStorage.setItem('activeModel', model)
    set({ activeModel: model })
  },

  fetchModels: async () => {
    try {
      const r = await fetch(`${API}/models`)
      const data = await r.json()
      const models = data.models || []
      set({ models })
  
      const isEmbedModel = (name) => name.toLowerCase().includes('embed')
  
      const chatModels = models.filter(m => !isEmbedModel(m.name))
      const { activeModel } = get()
  
      if (!activeModel && chatModels.length) {
        // No model selected yet — pick first chat model
        get().setActiveModel(chatModels[0].name)
      } else if (activeModel && isEmbedModel(activeModel) && chatModels.length) {
        // Current active is an embed model — swap to first chat model
        get().setActiveModel(chatModels[0].name)
      }
    } catch {}
  },

  fetchDocuments: async () => {
    try {
      const r = await fetch(`${API}/documents`)
      const data = await r.json()
      set({ documents: data.documents || [] })
    } catch {}
  },

  pullModel: async (name, onProgress) => {
    const r = await fetch(`${API}/models/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const reader = r.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (!line) continue
        try {
          onProgress?.(JSON.parse(line))
        } catch {}
      }
    }
    await get().fetchModels()
  },

  deleteModel: async (name) => {
    await fetch(`${API}/models/${encodeURIComponent(name)}`, { method: 'DELETE' })
    if (get().activeModel === name) {
      localStorage.removeItem('activeModel')
      set({ activeModel: null })
    }
    await get().fetchModels()
  },

  ingestDocument: async (file, onProgress) => {
    onProgress?.(30)
    const form = new FormData()
    form.append('file', file)
    onProgress?.(60)
    await fetch(`${API}/documents/ingest`, { method: 'POST', body: form })
    onProgress?.(100)
    await get().fetchDocuments()
  },

  deleteDocument: async (docId) => {
    await fetch(`${API}/documents/${docId}`, { method: 'DELETE' })
    await get().fetchDocuments()
  },

  createConversation: () => {
    const conv = { id: uid(), title: 'New chat', messages: [] }
    const conversations = [conv, ...get().conversations]
    saveConversations(conversations)
    set({ conversations, activeConvId: conv.id, page: 'chat' })
  },

  setActiveConv: (id) => set({ activeConvId: id }),

  deleteConversation: (id) => {
    const conversations = get().conversations.filter(c => c.id !== id)
    saveConversations(conversations)
    const activeConvId = get().activeConvId === id
      ? (conversations[0]?.id || null)
      : get().activeConvId
    set({ conversations, activeConvId })
  },

  sendMessage: async (text) => {
    const { activeConvId, conversations, activeModel } = get()
    if (!activeModel) return

    let convId = activeConvId
    let convs = [...conversations]
    if (!convId) {
      const conv = { id: uid(), title: text.slice(0, 40), messages: [] }
      convs = [conv, ...convs]
      convId = conv.id
    }

    const convIdx = convs.findIndex(c => c.id === convId)
    const conv = { ...convs[convIdx] }
    const apiMessages = conv.messages.map(({ role, content }) => ({ role, content }))
    apiMessages.push({ role: 'user', content: text })
    conv.messages = [...conv.messages, { role: 'user', content: text }]
    if (conv.messages.length === 1) conv.title = text.slice(0, 40)
    conv.messages.push({ role: 'assistant', content: '', streaming: true })
    convs[convIdx] = conv
    saveConversations(convs)
    set({ conversations: convs, activeConvId: convId, streaming: true })

    try {
      const r = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: activeModel,
          messages: apiMessages,
          stream: true,
          use_rag: true,
        }),
      })

      const reader = r.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop()
        for (const part of parts) {
          for (const line of part.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const chunk = JSON.parse(data)
              full += chunk.choices?.[0]?.delta?.content || ''
              const updated = [...get().conversations]
              const idx = updated.findIndex(c => c.id === convId)
              const c = { ...updated[idx] }
              c.messages = [...c.messages]
              c.messages[c.messages.length - 1] = { role: 'assistant', content: full, streaming: true }
              updated[idx] = c
              set({ conversations: updated })
            } catch {}
          }
        }
      }

      const final = [...get().conversations]
      const idx = final.findIndex(c => c.id === convId)
      const c = { ...final[idx] }
      c.messages = [...c.messages]
      c.messages[c.messages.length - 1] = { role: 'assistant', content: full }
      final[idx] = c
      saveConversations(final)
      set({ conversations: final, streaming: false })
    } catch {
      set({ streaming: false })
    }
  },
}))