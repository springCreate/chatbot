<script setup>
import { ref, nextTick, computed } from 'vue'
import { recognizeImage } from '../utils/ocr.js'

const emit = defineEmits(['send', 'upload'])


const props = defineProps({
  loading: { type: Boolean, default: false },
})

const text = ref('')
const textareaRef = ref(null)
const fileInputRef = ref(null)
const attachments = ref([])
const nextAttachId = ref(1)

const hasContent = computed(() => text.value.trim().length > 0 || attachments.value.length > 0)
const isImageType = (filename) => /\.(png|jpe?g|gif|webp|bmp)$/i.test(filename)

function submit() {
  if (props.loading || !hasContent.value) return

  let fullContent = text.value.trim()

  if (attachments.value.length > 0) {
    const attachTexts = attachments.value.map((a) => {
      if (a.isImage) {
        return `[附件: ${a.name}]\n${a.content || '[图片内容识别中...]'}`
      }
      return `[附件: ${a.name}]\n${a.content}`
    })
    fullContent = fullContent
      ? fullContent + '\n\n' + attachTexts.join('\n\n')
      : attachTexts.join('\n\n')
  }

  if (!fullContent.trim()) return
  emit('send', fullContent)
  text.value = ''
  attachments.value = []
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

async function handleFileSelect(e) {
  const file = e.target.files?.[0]
  if (!file) return

  const size = file.size / 1024 / 1024
  if (size > 10) {
    alert('文件大小不能超过 10MB')
    e.target.value = ''
    return
  }

  const attachId = nextAttachId.value++
  const isImg = isImageType(file.name)

  const attachment = {
    id: attachId,
    name: file.name,
    size: (file.size / 1024).toFixed(1) + ' KB',
    isImage: isImg,
    content: '',
    status: isImg ? 'ocr' : 'parsing',
    progress: 0,
    previewUrl: isImg ? URL.createObjectURL(file) : null,
  }
  attachments.value.push(attachment)
  nextTick(autoResize)

  if (isImg) {
    const { text: ocrText, error: ocrErr } = await recognizeImage(file, (p) => {
      const a = attachments.value.find((x) => x.id === attachId)
      if (a) a.progress = p
    })
    const a = attachments.value.find((x) => x.id === attachId)
    if (a) {
      if (ocrErr) {
        a.status = 'error'
        a.content = '[图片OCR识别失败: ' + ocrErr + ']'
      } else if (ocrText) {
        a.status = 'done'
        a.content = ocrText
      } else {
        a.status = 'done'
        a.content = '[未能识别出图片中的文字内容]'
      }
    }
  } else {
    try {
      const result = await emitUploadFile(file)
      const a = attachments.value.find((x) => x.id === attachId)
      if (a) {
        a.status = 'done'
        a.content = result.content
        a.fileType = result.fileType
        a.images = result.images || []
      }
    } catch (err) {
      const a = attachments.value.find((x) => x.id === attachId)
      if (a) {
        a.status = 'error'
        a.content = '[文件解析失败: ' + err.message + ']'
      }
    }
  }

  e.target.value = ''
}

function emitUploadFile(file) {
  return new Promise((resolve, reject) => {
    emit('upload', file, resolve, reject)
  })
}

function removeAttachment(id) {
  const idx = attachments.value.findIndex((a) => a.id === id)
  if (idx !== -1) {
    const a = attachments.value[idx]
    if (a.previewUrl) URL.revokeObjectURL(a.previewUrl)
    attachments.value.splice(idx, 1)
  }
}

function triggerFileSelect() {
  fileInputRef.value?.click()
}

defineExpose({ appendFileContent: () => {} })
</script>

<template>
  <div class="input-wrapper">
    <div v-if="attachments.length > 0" class="attachments">
      <div
        v-for="a in attachments"
        :key="a.id"
        class="attach-card"
        :class="{ image: a.isImage, error: a.status === 'error' }"
      >
        <img v-if="a.isImage && a.previewUrl" :src="a.previewUrl" class="attach-preview" />
        <div class="attach-body">
          <div class="attach-header">
            <span class="attach-icon">{{ a.isImage ? '🖼️' : '📄' }}</span>
            <span class="attach-name" :title="a.name">{{ a.name }}</span>
            <span class="attach-size">{{ a.size }}</span>
            <button class="attach-remove" @click="removeAttachment(a.id)">&times;</button>
          </div>
          <div v-if="a.status === 'ocr' || a.status === 'parsing'" class="attach-loading">
            <span class="attach-spinner"></span>
            <span>{{ a.isImage ? '图片文字识别中' : '文件解析中' }} {{ a.progress > 0 ? a.progress + '%' : '' }}</span>
          </div>
          <div v-else-if="a.status === 'error'" class="attach-error">
            {{ a.content }}
          </div>
          <div v-else class="attach-content" :title="a.content">
            {{ a.content.substring(0, 200) + (a.content.length > 200 ? '...' : '') }}
          </div>
        </div>
      </div>
    </div>

    <div class="input-bar">
      <button class="upload-btn" @click="triggerFileSelect" :disabled="loading" title="上传文件">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M12 10l-3 3m0 0l3 3m-3-3h12" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <textarea
        ref="textareaRef"
        v-model="text"
        @keydown="onKeydown"
        @input="autoResize"
        placeholder="输入消息，Enter 发送，Shift+Enter 换行。可上传图片或文档"
        rows="1"
      ></textarea>

      <button class="send-btn" @click="submit" :disabled="loading || !hasContent">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <input
        ref="fileInputRef"
        type="file"
        accept=".pdf,.txt,.md,.docx,.doc,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.gif,.webp,.bmp"
        class="file-input"
        @change="handleFileSelect"
      />
    </div>
  </div>
</template>

<style scoped>
.input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attachments {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attach-card {
  display: flex;
  gap: 10px;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 12px;
  font-size: 13px;
}

.attach-card.image {
  align-items: flex-start;
}

.attach-card.error {
  border-color: rgba(239, 68, 68, 0.4);
}

.attach-preview {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
}

.attach-body {
  flex: 1;
  min-width: 0;
}

.attach-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.attach-icon {
  font-size: 14px;
}

.attach-name {
  font-weight: 500;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attach-size {
  color: var(--text-dim);
  font-size: 11px;
  flex-shrink: 0;
}

.attach-remove {
  margin-left: auto;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background: transparent;
  border: none;
  color: var(--text-dim);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.attach-remove:hover {
  color: var(--danger);
  background: rgba(239, 68, 68, 0.1);
}

.attach-loading {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--accent);
  font-size: 12px;
}

.attach-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.attach-error {
  color: var(--danger);
  font-size: 12px;
}

.attach-content {
  color: var(--text-dim);
  font-size: 12px;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.input-bar {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px;
}

.upload-btn {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-dim);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.upload-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.upload-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
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

.file-input {
  display: none;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
