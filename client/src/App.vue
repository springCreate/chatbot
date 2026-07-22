<script setup>
import { ref, nextTick, watch } from 'vue'
import { useChat } from './composables/useChat.js'
import ChatMessage from './components/ChatMessage.vue'
import ChatInput from './components/ChatInput.vue'

const { messages, loading, error, sendMessage, stop, clearMessages } = useChat()
const model = ref('deepseek-chat')
const scrollRef = ref(null)

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

function handleSend(text) {
  sendMessage(text, model.value)
}
</script>

<template>
  <header class="topbar">
    <div class="brand">
      <span class="logo">🤖</span>
      <h1>DeepSeek 智能助手</h1>
    </div>
    <div class="actions">
      <select v-model="model" class="model-select" title="选择模型">
        <option value="deepseek-chat">DeepSeek-V3</option>
        <option value="deepseek-reasoner">DeepSeek-R1</option>
      </select>
      <button class="clear-btn" @click="clearMessages" :disabled="loading">
        清空会话
      </button>
    </div>
  </header>

  <main class="chat-area" ref="scrollRef">
    <div v-if="messages.length === 0" class="welcome">
      <div class="welcome-icon">💬</div>
      <h2>开始与 DeepSeek 对话</h2>
      <p>支持流式输出 · Markdown 渲染 · 多轮对话</p>
      <div class="tips">
        <span class="tip">试试问我：</span>
        <button class="tip-chip" @click="handleSend('用一句话介绍你自己')">
          介绍你自己
        </button>
        <button class="tip-chip" @click="handleSend('写一个快速排序的 Python 实现')">
          快速排序代码
        </button>
        <button class="tip-chip" @click="handleSend('解释什么是闭包')">
          解释闭包
        </button>
      </div>
    </div>
    <ChatMessage
      v-for="(msg, i) in messages"
      :key="i"
      :message="msg"
      :streaming="loading && i === messages.length - 1 && msg.role === 'assistant'"
    />
    <div v-if="error" class="error-tip">⚠ {{ error }}</div>
  </main>

  <footer class="footer">
    <ChatInput :loading="loading" @send="handleSend" />
    <button v-if="loading" class="stop-btn" @click="stop">⏹ 停止生成</button>
  </footer>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  background: var(--panel);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.logo {
  font-size: 24px;
}
h1 {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.3px;
}
.actions {
  display: flex;
  gap: 10px;
  align-items: center;
}
.model-select {
  background: var(--bg-soft);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 13px;
  outline: none;
  cursor: pointer;
}
.model-select:hover {
  border-color: var(--accent);
}
.clear-btn {
  background: transparent;
  color: var(--text-dim);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 13px;
  transition: all 0.2s;
}
.clear-btn:hover:not(:disabled) {
  color: var(--danger);
  border-color: var(--danger);
}
.clear-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  max-width: 820px;
  width: 100%;
  margin: 0 auto;
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
  transition: all 0.2s;
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

@media (max-width: 600px) {
  .topbar {
    padding: 12px 16px;
  }
  .chat-area {
    padding: 16px;
  }
  .footer {
    padding: 8px 16px 16px;
  }
  h1 {
    font-size: 16px;
  }
}
</style>
