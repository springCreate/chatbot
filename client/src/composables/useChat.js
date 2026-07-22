import { ref, reactive } from 'vue'

const API_BASE = import.meta.env.DEV ? 'http://localhost:3000' : ''

export function useChat() {
  const messages = ref([])
  const loading = ref(false)
  const error = ref('')
  let readerRef = null
  let stopped = false

  async function sendMessage(content, model = 'deepseek-chat') {
    if (loading.value) return
    const text = content.trim()
    if (!text) return

    const userMessage = { role: 'user', content: text }
    messages.value.push(userMessage)
    loading.value = true
    error.value = ''
    stopped = false

    // 构建请求消息（在加入 AI 占位符之前）
    const requestMessages = messages.value.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    // 加入 AI 占位消息用于流式填充
    const aiMessage = reactive({ role: 'assistant', content: '' })
    messages.value.push(aiMessage)

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: requestMessages, model }),
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
          } catch (_) {
            // 跳过无法解析的行
          }
        }
        if (stopped) break
      }
    } catch (err) {
      error.value = err.message
    } finally {
      // 回复为空且出错时移除占位消息
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

  return { messages, loading, error, sendMessage, stop, clearMessages }
}
