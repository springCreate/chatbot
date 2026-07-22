<script setup>
import { ref, nextTick, watch, onMounted } from 'vue'
import { useChat, useSessions, useUpload } from '../composables/useChat.js'
import ChatMessage from './ChatMessage.vue'
import ChatInput from './ChatInput.vue'
import SessionList from './SessionList.vue'
import SettingsPanel from './SettingsPanel.vue'

const props = defineProps({
  user: { type: Object, required: true },
})

const emit = defineEmits(['logout'])

const { messages, loading, error, sendMessage, stop, clearMessages, loadMessages } = useChat()
const { sessions, fetchSessions, createSession, updateSession, deleteSession } = useSessions()
const { uploadFile } = useUpload()

const currentSession = ref(null)
const scrollRef = ref(null)
const model = ref('deepseek-chat')
const temperature = ref(0.7)
const maxTokens = ref(4096)
const sidebarOpen = ref(true)
const theme = ref('dark')

const models = [
  { value: 'deepseek-chat', label: 'DeepSeek-V3' },
  { value: 'deepseek-reasoner', label: 'DeepSeek-R1' },
]

async function scrollToBottom() {
  await nextTick()
  if (scrollRef.value) {
    scrollRef.value.scrollTop = scrollRef.value.scrollHeight
  }
}

watch(() => messages.value.length, scrollToBottom)
watch(
  () => messages.value.map((m) => m.content).join(''),
  scrollToBottom
)

async function handleSend(text) {
  if (!currentSession.value) {
    currentSession.value = await createSession('新会话')
  }
  sendMessage(currentSession.value.id, text, model.value, {
    temperature: temperature.value,
    maxTokens: maxTokens.value,
  })
}

async function handleCreateSession() {
  const newSession = await createSession('新会话')
  if (newSession) {
    currentSession.value = newSession
    messages.value = []
  }
}

async function handleSelectSession(session) {
  currentSession.value = session
  messages.value = []
  await loadMessages(session.id)
}

async function handleDeleteSession(sessionId) {
  await deleteSession(sessionId)
  if (currentSession.value?.id === sessionId) {
    currentSession.value = sessions.value[0] || null
    messages.value = []
    if (currentSession.value) {
      await loadMessages(currentSession.value.id)
    }
  }
}

async function handleRenameSession(sessionId, title) {
  await updateSession(sessionId, title)
}

async function handleUpload(file) {
  try {
    const result = await uploadFile(file)
    const content = `请分析以下文件内容：\n\n${result.content}`
    handleSend(content)
  } catch (err) {
    error.value = err.message
  }
}

function handleClear() {
  if (currentSession.value) {
    clearMessages()
  }
}

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', theme.value)
}

onMounted(async () => {
  await fetchSessions()
  if (sessions.value.length > 0) {
    currentSession.value = sessions.value[0]
    await loadMessages(currentSession.value.id)
  }
})
</script>

<template>
  <div class="chat-container">
    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <div class="sidebar-header">
        <div class="brand">
          <span class="logo">🤖</span>
          <span class="title">DeepSeek</span>
        </div>
        <button class="new-btn" @click="handleCreateSession">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14" stroke-linecap="round"/>
          </svg>
          新会话
        </button>
      </div>
      
      <SessionList
        :sessions="sessions"
        :current="currentSession"
        @select="handleSelectSession"
        @delete="handleDeleteSession"
        @rename="handleRenameSession"
      />
      
      <div class="sidebar-footer">
        <button class="user-btn" @click="emit('logout')">
          <span class="avatar">{{ user.username[0] }}</span>
          <span class="name">{{ user.username }}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m6 14h4a2 2 0 002-2V5a2 2 0 00-2-2h-4" stroke-linecap="round"/>
            <path d="M15 3v4M9 21v-4" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </aside>
    
    <main class="main">
      <header class="topbar">
        <button class="toggle-btn" @click="sidebarOpen = !sidebarOpen">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 6h16M4 12h16M4 18h16" stroke-linecap="round"/>
          </svg>
        </button>
        
        <div class="session-info" v-if="currentSession">
          <span class="session-title">{{ currentSession.title }}</span>
        </div>
        
        <div class="actions">
          <SettingsPanel
            v-model:model="model"
            v-model:temperature="temperature"
            v-model:maxTokens="maxTokens"
            :models="models"
            :theme="theme"
            @toggleTheme="toggleTheme"
          />
          
          <button class="clear-btn" @click="handleClear" :disabled="loading">
            清空
          </button>
        </div>
      </header>
      
      <div class="chat-area" ref="scrollRef">
        <div v-if="!currentSession" class="empty">
          <div class="empty-icon">📭</div>
          <h2>暂无会话</h2>
          <p>点击左侧"新会话"开始聊天</p>
        </div>
        
        <div v-else-if="messages.length === 0" class="welcome">
          <div class="welcome-icon">💬</div>
          <h2>开始与 DeepSeek 对话</h2>
          <p>支持流式输出 · Markdown 渲染 · 文件上传</p>
          <div class="tips">
            <span class="tip">试试问我：</span>
            <button class="tip-chip" @click="handleSend('用一句话介绍你自己')">介绍你自己</button>
            <button class="tip-chip" @click="handleSend('写一个快速排序的 Python 实现')">快速排序代码</button>
            <button class="tip-chip" @click="handleSend('解释什么是闭包')">解释闭包</button>
          </div>
        </div>
        
        <ChatMessage
          v-for="(msg, i) in messages"
          :key="msg.id || i"
          :message="msg"
          :streaming="loading && i === messages.length - 1 && msg.role === 'assistant'"
        />
        
        <div v-if="error" class="error-tip">⚠ {{ error }}</div>
      </div>
      
      <footer class="footer">
        <ChatInput
          :loading="loading"
          @send="handleSend"
          @upload="handleUpload"
        />
        <button v-if="loading" class="stop-btn" @click="stop">⏹ 停止生成</button>
      </footer>
    </main>
  </div>
</template>

<style scoped>
.chat-container {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 280px;
  background: var(--panel);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width 0.3s;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid var(--border);
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.logo {
  font-size: 22px;
}

.title {
  font-size: 16px;
  font-weight: 600;
}

.new-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 10px;
  font-size: 14px;
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid var(--border);
  margin-top: auto;
}

.user-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text);
  font-size: 14px;
}

.user-btn .avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 24px;
  background: var(--panel);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.toggle-btn {
  background: transparent;
  border: none;
  color: var(--text);
  padding: 4px;
  display: none;
}

.session-info {
  flex: 1;
}

.session-title {
  font-size: 15px;
  font-weight: 500;
}

.actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.clear-btn {
  background: transparent;
  color: var(--text-dim);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 13px;
}

.clear-btn:hover:not(:disabled) {
  color: var(--danger);
  border-color: var(--danger);
}

.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  max-width: 820px;
  width: 100%;
  margin: 0 auto;
}

.empty {
  text-align: center;
  padding: 80px 20px;
  color: var(--text-dim);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.welcome {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-dim);
}

.welcome-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.welcome h2 {
  color: var(--text);
  font-size: 22px;
  margin-bottom: 8px;
}

.welcome p {
  font-size: 14px;
}

.tips {
  margin-top: 28px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  align-items: center;
}

.tip {
  font-size: 13px;
  width: 100%;
  margin-bottom: 4px;
}

.tip-chip {
  background: var(--bg-soft);
  color: var(--accent);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 6px 14px;
  font-size: 13px;
}

.tip-chip:hover {
  background: var(--accent-soft);
  border-color: var(--accent);
}

.error-tip {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: var(--danger);
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin-top: 8px;
}

.footer {
  padding: 12px 24px 20px;
  max-width: 820px;
  width: 100%;
  margin: 0 auto;
  flex-shrink: 0;
}

.stop-btn {
  margin-top: 8px;
  background: transparent;
  color: var(--danger);
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: 8px;
  padding: 6px 16px;
  font-size: 13px;
}

.stop-btn:hover {
  background: rgba(239, 68, 68, 0.1);
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 100;
    width: 260px;
    transform: translateX(-100%);
  }
  
  .sidebar.open {
    transform: translateX(0);
  }
  
  .toggle-btn {
    display: block;
  }
}
</style>

