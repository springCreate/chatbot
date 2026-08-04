<script setup>
import { ref, computed } from 'vue'
import { renderMarkdown } from '../utils/markdown.js'

const props = defineProps({
  message: { type: Object, required: true },
  streaming: { type: Boolean, default: false },
  // 是否为当前会话最后一条消息：仅最后一条 AI 消息才显示「重新生成」
  isLast: { type: Boolean, default: false },
})

const emit = defineEmits(['copy', 'regenerate'])

const isUser = computed(() => props.message.role === 'user')
const html = computed(() =>
  isUser.value ? '' : renderMarkdown(props.message.content)
)

const attachments = computed(() => props.message.attachments || [])

// 复制成功后的临时态：2 秒内显示「已复制」
const copied = ref(false)
async function copyContent() {
  const text = props.message.content || ''
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // 降级：旧浏览器或非 HTTPS 环境用临时 textarea 兜底
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try { document.execCommand('copy') } catch {}
    document.body.removeChild(ta)
  }
  emit('copy', text)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function getFileIcon(type) {
  const icons = {
    PDF: '📕',
    Word: '📘',
    Excel: '📗',
    CSV: '📓',
    Text: '📄',
    Markdown: '📝',
    Image: '🖼️',
    PNG: '🖼️',
    JPEG: '🖼️',
    GIF: '🖼️',
    WebP: '🖼️',
    BMP: '🖼️',
    Unknown: '📁',
  }
  return icons[type] || icons.Unknown
}
</script>

<template>
  <div class="msg" :class="isUser ? 'user' : 'ai'">
    <div class="avatar">{{ isUser ? '🧑' : '🤖' }}</div>
    <div class="bubble">
      <template v-if="isUser">
        <div v-if="message.content" class="text-content">{{ message.content }}</div>
        <div v-if="attachments.length > 0" class="attachments-list">
          <div
            v-for="(attach, idx) in attachments"
            :key="idx"
            class="attachment-card"
            :class="{ image: attach.type === 'Image' || attach.type === 'PNG' || attach.type === 'JPEG' || attach.type === 'GIF' || attach.type === 'WebP' || attach.type === 'BMP' }"
          >
            <div class="attach-icon">{{ getFileIcon(attach.type) }}</div>
            <div class="attach-info">
              <span class="attach-name" :title="attach.name">{{ attach.name }}</span>
              <span class="attach-meta">{{ attach.type }} · {{ formatSize(attach.size) }}</span>
            </div>
            <div v-if="attach.images && attach.images.length > 0" class="attach-images">
              <img
                v-for="(img, imgIdx) in attach.images"
                :key="imgIdx"
                :src="img.data"
                class="attach-image"
                :alt="img.name"
              />
            </div>
          </div>
        </div>
      </template>
      <template v-else>
        <div v-if="message.content" class="md" v-html="html"></div>
        <span v-if="streaming && !message.content" class="dots">
          <i></i><i></i><i></i>
        </span>
        <span v-if="streaming && message.content" class="cursor">▋</span>
        <!-- 操作条：AI 回答完成（非流式）且有内容时显示 -->
        <div v-if="!streaming && message.content" class="msg-actions">
          <button
            class="action-item"
            :class="{ active: copied }"
            @click="copyContent"
            :title="copied ? '已复制到剪贴板' : '复制回答'"
          >
            {{ copied ? '✓ 已复制' : '复制' }}
          </button>
          <button
            v-if="isLast"
            class="action-item"
            @click="emit('regenerate')"
            title="基于上一条提问重新生成回答"
          >
            重新生成
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.msg {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  animation: fadeIn 0.3s ease;
}
.msg.user {
  flex-direction: row-reverse;
}
.avatar {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: var(--panel);
  border: 1px solid var(--border);
}
.bubble {
  max-width: 75%;
  padding: 12px 16px;
  border-radius: var(--radius);
  line-height: 1.6;
  word-break: break-word;
}
.user .bubble {
  background: var(--user-bubble);
  color: #fff;
  border-bottom-right-radius: 4px;
}
.ai .bubble {
  background: var(--ai-bubble);
  border: 1px solid var(--border);
  border-bottom-left-radius: 4px;
}

.text-content {
  margin-bottom: 10px;
}

.attachments-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.attachment-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.user .attachment-card {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.attach-icon {
  font-size: 24px;
}

.attach-info {
  flex: 1;
  min-width: 0;
}

.attach-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attach-meta {
  display: block;
  font-size: 12px;
  opacity: 0.7;
}

.attach-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.attach-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: 6px;
  object-fit: contain;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.md :deep(p) {
  margin: 0 0 8px;
}
.md :deep(p:last-child) {
  margin-bottom: 0;
}
.md :deep(pre) {
  background: #0d1117;
  border-radius: 8px;
  padding: 14px;
  overflow-x: auto;
  margin: 8px 0;
  font-family: var(--mono);
  font-size: 13px;
}
.md :deep(code) {
  font-family: var(--mono);
  font-size: 0.9em;
}
.md :deep(p code),
.md :deep(li code) {
  background: rgba(110, 118, 129, 0.25);
  padding: 2px 6px;
  border-radius: 4px;
}
.md :deep(ul),
.md :deep(ol) {
  margin: 8px 0;
  padding-left: 22px;
}
.md :deep(li) {
  margin: 4px 0;
}
.md :deep(blockquote) {
  border-left: 3px solid var(--accent);
  padding-left: 12px;
  margin: 8px 0;
  color: var(--text-dim);
}
.md :deep(table) {
  border-collapse: collapse;
  margin: 8px 0;
  width: 100%;
}
.md :deep(th),
.md :deep(td) {
  border: 1px solid var(--border);
  padding: 6px 10px;
  text-align: left;
}
.md :deep(h1),
.md :deep(h2),
.md :deep(h3) {
  margin: 12px 0 6px;
  font-weight: 600;
}

.dots {
  display: inline-flex;
  gap: 4px;
}
.dots i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-dim);
  animation: bounce 1.4s infinite ease-in-out;
}
.dots i:nth-child(2) {
  animation-delay: 0.2s;
}
.dots i:nth-child(3) {
  animation-delay: 0.4s;
}
.cursor {
  display: inline-block;
  color: var(--accent);
  animation: blink 1s step-end infinite;
}

/* AI 消息操作条：复制 / 重新生成
   桌面端默认弱化、hover 时强化；触屏设备（无 hover）始终可见 */
.msg-actions {
  display: flex;
  gap: 4px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
  opacity: 0.5;
  transition: opacity 0.2s;
}

.ai .bubble:hover .msg-actions {
  opacity: 1;
}

/* 触屏设备无 hover，操作条始终可见 */
@media (hover: none) {
  .msg-actions {
    opacity: 1;
  }
}

.action-item {
  background: transparent;
  border: none;
  color: var(--text-dim);
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-item:hover {
  background: var(--bg-soft);
  color: var(--accent);
}

.action-item.active {
  color: var(--success, #10b981);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes bounce {
  0%,
  80%,
  100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}
</style>