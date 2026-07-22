<script setup>
import { ref, nextTick } from 'vue'

const emit = defineEmits(['send'])
const props = defineProps({
  loading: { type: Boolean, default: false },
})

const text = ref('')
const textareaRef = ref(null)

function submit() {
  if (props.loading || !text.value.trim()) return
  emit('send', text.value)
  text.value = ''
  nextTick(autoResize)
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    submit()
  }
}

function autoResize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}
</script>

<template>
  <div class="input-bar">
    <textarea
      ref="textareaRef"
      v-model="text"
      @keydown="onKeydown"
      @input="autoResize"
      placeholder="输入消息，Enter 发送，Shift+Enter 换行"
      rows="1"
    ></textarea>
    <button
      class="send-btn"
      @click="submit"
      :disabled="loading || !text.trim()"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.input-bar {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px;
}
textarea {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  color: var(--text);
  font-family: var(--font);
  font-size: 15px;
  line-height: 1.5;
  max-height: 160px;
  padding: 8px 4px;
}
textarea::placeholder {
  color: var(--text-dim);
}
.send-btn {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s, transform 0.1s;
}
.send-btn:hover:not(:disabled) {
  opacity: 0.85;
}
.send-btn:active:not(:disabled) {
  transform: scale(0.94);
}
.send-btn:disabled {
  background: var(--border);
  color: var(--text-dim);
  cursor: not-allowed;
}
</style>
