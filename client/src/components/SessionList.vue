<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  sessions: { type: Array, default: () => [] },
  current: { type: Object, default: null },
})

const emit = defineEmits(['select', 'delete', 'rename'])

const editingId = ref(null)
const editingTitle = ref('')

// 危险操作二次确认：删除会话
const deletingId = ref(null)
let deleteConfirmTimer = null

// 当前会话变化时，重置删除确认态，避免状态污染
watch(() => props.current?.id, () => {
  deletingId.value = null
  clearTimeout(deleteConfirmTimer)
})

onBeforeUnmount(() => {
  clearTimeout(deleteConfirmTimer)
})

function startEdit(session) {
  editingId.value = session.id
  editingTitle.value = session.title
}

function saveEdit(session) {
  if (editingTitle.value.trim()) {
    emit('rename', session.id, editingTitle.value.trim())
  }
  editingId.value = null
}

function cancelEdit() {
  editingId.value = null
}

// 两段式确认：首次点击进入确认态，3 秒内再次点击才真正删除
function clickDelete(session) {
  if (deletingId.value !== session.id) {
    deletingId.value = session.id
    clearTimeout(deleteConfirmTimer)
    deleteConfirmTimer = setTimeout(() => {
      deletingId.value = null
    }, 3000)
    return
  }
  deletingId.value = null
  clearTimeout(deleteConfirmTimer)
  emit('delete', session.id)
}

function formatDate(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="session-list">
    <div v-if="sessions.length === 0" class="empty-list">
      <p>暂无会话</p>
    </div>
    
    <div
      v-for="session in sessions"
      :key="session.id"
      class="session-item"
      :class="{ active: current?.id === session.id }"
    >
      <div v-if="editingId !== session.id" class="session-content" @click="emit('select', session)">
        <div class="session-title">{{ session.title }}</div>
        <div class="session-time">{{ formatDate(session.updated_at) }}</div>
      </div>
      
      <div v-else class="session-edit">
        <input
          v-model="editingTitle"
          type="text"
          @keyup.enter="saveEdit(session)"
          @keyup.escape="cancelEdit"
          autofocus
        />
        <div class="edit-actions">
          <button class="save-btn" @click="saveEdit(session)">✓</button>
          <button class="cancel-btn" @click="cancelEdit">✕</button>
        </div>
      </div>
      
      <div class="session-actions">
        <button class="action-btn" @click.stop="startEdit(session)" title="重命名">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button
          class="action-btn delete"
          :class="{ confirming: deletingId === session.id }"
          @click.stop="clickDelete(session)"
          :title="deletingId === session.id ? '再次点击确认删除（3 秒内有效）' : '删除'"
        >
          <span v-if="deletingId === session.id" class="confirm-text">确认</span>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.empty-list {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-dim);
}

.session-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
}

.session-item:hover {
  background: var(--bg-soft);
}

.session-item.active {
  background: var(--accent-soft);
}

.session-content {
  flex: 1;
  min-width: 0;
}

.session-title {
  font-size: 14px;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-time {
  font-size: 12px;
  color: var(--text-dim);
  margin-top: 2px;
}

.session-edit {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
}

.session-edit input {
  flex: 1;
  background: var(--bg-soft);
  border: 1px solid var(--accent);
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 13px;
  color: var(--text);
  outline: none;
}

.edit-actions {
  display: flex;
  gap: 4px;
}

.save-btn, .cancel-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.save-btn {
  background: var(--success);
  color: #fff;
}

.cancel-btn {
  background: var(--danger);
  color: #fff;
}

.session-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.session-item:hover .session-actions {
  opacity: 1;
}

.action-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: var(--text-dim);
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background: var(--bg);
}

.action-btn.delete:hover {
  color: var(--danger);
}

.action-btn.delete.confirming {
  background: var(--danger);
  color: #fff;
  width: auto;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 600;
  animation: pulseDanger 1s ease-in-out infinite;
}

.action-btn.delete.confirming .confirm-text {
  white-space: nowrap;
}

@keyframes pulseDanger {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
</style>

