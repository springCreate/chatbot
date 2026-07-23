import { ref, reactive } from 'vue'

const API_BASE = import.meta.env.DEV ? 'http://localhost:3000' : ''

let token = localStorage.getItem('chatbot_token')

export function useAuth() {
  const user = ref(null)
  const tokenRef = ref(token)
  
  async function login(username, password) {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json()
    if (res.ok) {
      token = data.token
      tokenRef.value = token
      user.value = { username: data.username }
      localStorage.setItem('chatbot_token', token)
    }
    return { success: res.ok, error: data.error }
  }
  
  async function register(username, password, email) {
    const res = await fetch(`${API_BASE}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email }),
    })
    const data = await res.json()
    return { success: res.ok, error: data.error }
  }
  
  async function fetchUser() {
    if (!token) {
      user.value = null
      return false
    }
    try {
      const res = await fetch(`${API_BASE}/api/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        user.value = await res.json()
        return true
      } else {
        user.value = null
        return false
      }
    } catch {
      user.value = null
      return false
    }
  }
  
  function logout() {
    token = null
    tokenRef.value = null
    user.value = null
    localStorage.removeItem('chatbot_token')
  }
  
  function getToken() {
    return token
  }
  
  return { user, tokenRef, login, register, logout, getToken, fetchUser }
}

export function useChat() {
  const messages = ref([])
  const loading = ref(false)
  const error = ref('')
  let readerRef = null
  let stopped = false
  
  async function sendMessage(sessionId, messageData, model = 'deepseek-chat', options = {}) {
    if (loading.value) return
    const data = typeof messageData === 'string'
      ? { text: messageData, attachments: [] }
      : (messageData || { text: '', attachments: [] })
    const text = (data.text || '').trim()
    const attachments = Array.isArray(data.attachments) ? data.attachments : []
    if (!text && attachments.length === 0) return

    const userMessage = { role: 'user', content: text, attachments }
    messages.value.push(userMessage)
    loading.value = true
    error.value = ''
    stopped = false

    const NL = String.fromCharCode(10)
    const DNL = NL + NL
    const requestMessages = messages.value.map((m) => {
      let fullContent = m.content || ''
      const mAtts = Array.isArray(m.attachments) ? m.attachments : []
      if (mAtts.length > 0) {
        const attachText = mAtts.map((a) => {
          return '[附件: ' + a.name + ']' + NL + (a.content || '')
        }).join(DNL)
        fullContent = fullContent ? fullContent + DNL + attachText : attachText
      }
      return { role: m.role, content: fullContent, attachments: mAtts }
    })
    
    const aiMessage = reactive({ role: 'assistant', content: '' })
    messages.value.push(aiMessage)
    
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          session_id: sessionId,
          messages: requestMessages,
          model,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 4096,
        }),
      })
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || `请求失败 (${response.status})`)
      }
      
      readerRef = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      
      while (true) {
        const { done, value } = await readerRef.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data:')) continue
          const data = trimmed.slice(5).trim()
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            if (parsed.error) {
              error.value = parsed.error
              break
            }
            if (parsed.content) {
              aiMessage.content += parsed.content
            }
          } catch (_) {}
        }
        if (stopped) break
      }
    } catch (err) {
      error.value = err.message
    } finally {
      if (!aiMessage.content && error.value) {
        const idx = messages.value.indexOf(aiMessage)
        if (idx > -1) messages.value.splice(idx, 1)
      }
      loading.value = false
      readerRef = null
      stopped = false
    }
  }
  
  function stop() {
    stopped = true
    if (readerRef) {
      readerRef.cancel().catch(() => {})
    }
  }
  
  function clearMessages() {
    if (loading.value) stop()
    messages.value = []
    error.value = ''
  }
  
  async function loadMessages(sessionId) {
    const headers = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/messages`, { headers })
    if (res.ok) {
      messages.value = (await res.json()).map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        attachments: Array.isArray(m.attachments) ? m.attachments : [],
      }))
    }
    return res.ok
  }
  
  return { messages, loading, error, sendMessage, stop, clearMessages, loadMessages }
}

export function useSessions() {
  const sessions = ref([])
  
  async function fetchSessions() {
    const headers = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    
    const res = await fetch(`${API_BASE}/api/sessions`, { headers })
    if (res.ok) {
      sessions.value = await res.json()
    }
    return res.ok
  }
  
  async function createSession(title) {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    
    const res = await fetch(`${API_BASE}/api/sessions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title }),
    })
    if (res.ok) {
      await fetchSessions()
      return await res.json()
    }
    return null
  }
  
  async function updateSession(id, title) {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    
    const res = await fetch(`${API_BASE}/api/sessions/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ title }),
    })
    if (res.ok) await fetchSessions()
    return res.ok
  }
  
  async function deleteSession(id) {
    const headers = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    
    const res = await fetch(`${API_BASE}/api/sessions/${id}`, {
      method: 'DELETE',
      headers,
    })
    if (res.ok) await fetchSessions()
    return res.ok
  }
  
  return { sessions, fetchSessions, createSession, updateSession, deleteSession }
}

export function useUpload() {
  async function uploadFile(file) {
    const formData = new FormData()
    formData.append('file', file)
    
    const headers = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    
    const res = await fetch(`${API_BASE}/api/upload`, {
      method: 'POST',
      headers,
      body: formData,
    })
    if (res.ok) return await res.json()
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || '上传失败')
  }
  
  return { uploadFile }
}


