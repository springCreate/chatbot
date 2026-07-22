<script setup>
import { computed } from 'vue'
import { renderMarkdown } from '../utils/markdown.js'

const props = defineProps({
  message: { type: Object, required: true },
  streaming: { type: Boolean, default: false },
})

const isUser = computed(() => props.message.role === 'user')
const html = computed(() =>
  isUser.value ? '' : renderMarkdown(props.message.content)
)
</script>

<template>
  <div class="msg" :class="isUser ? 'user' : 'ai'">
    <div class="avatar">{{ isUser ? '🧑' : '🤖' }}</div>
    <div class="bubble">
      <template v-if="isUser">{{ message.content }}</template>
      <template v-else>
        <div v-if="message.content" class="md" v-html="html"></div>
        <span v-if="streaming && !message.content" class="dots">
          <i></i><i></i><i></i>
        </span>
        <span v-if="streaming && message.content" class="cursor">▋</span>
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

/* Markdown 内容样式 */
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
