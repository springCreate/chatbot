<script setup>
import { ref } from 'vue'

const props = defineProps({
  model: { type: String, default: 'deepseek-chat' },
  temperature: { type: Number, default: 0.7 },
  maxTokens: { type: Number, default: 4096 },
  models: { type: Array, default: () => [] },
  theme: { type: String, default: 'dark' },
})

const emit = defineEmits(['update:model', 'update:temperature', 'update:maxTokens', 'toggleTheme'])

const panelOpen = ref(false)

function togglePanel() {
  panelOpen.value = !panelOpen.value
}
</script>

<template>
  <div class="settings-wrapper">
    <button class="settings-btn" @click="togglePanel">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    
    <div class="settings-panel" :class="{ open: panelOpen }">
      <h3>设置</h3>
      
      <div class="section">
        <label class="section-title">模型选择</label>
        <select class="select" :value="model" @change="emit('update:model', $event.target.value)">
          <option v-for="m in models" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>
      </div>
      
      <div class="section">
        <label class="section-title">温度 (Temperature)</label>
        <div class="slider-group">
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            :value="temperature"
            @input="emit('update:temperature', parseFloat($event.target.value))"
            class="slider"
          />
          <span class="slider-value">{{ temperature.toFixed(1) }}</span>
        </div>
        <p class="hint">越低越精确，越高越有创意</p>
      </div>
      
      <div class="section">
        <label class="section-title">最大长度 (Max Tokens)</label>
        <select class="select" :value="maxTokens" @change="emit('update:maxTokens', parseInt($event.target.value))">
          <option :value="1024">1024</option>
          <option :value="2048">2048</option>
          <option :value="4096">4096</option>
          <option :value="8192">8192</option>
        </select>
      </div>
      
      <div class="section">
        <label class="section-title">主题</label>
        <button class="theme-btn" :class="theme" @click="emit('toggleTheme')">
          {{ theme === 'dark' ? '🌙 暗色' : '☀️ 亮色' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-wrapper {
  position: relative;
}

.settings-btn {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px;
  color: var(--text-dim);
}

.settings-btn:hover {
  border-color: var(--accent);
}

.settings-panel {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  width: 260px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  opacity: 0;
  visibility: hidden;
  transform: translateY(-8px);
  transition: all 0.2s;
  z-index: 100;
}

.settings-panel.open {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

h3 {
  font-size: 15px;
  margin-bottom: 16px;
}

.section {
  margin-bottom: 16px;
}

.section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 13px;
  color: var(--text-dim);
  display: block;
  margin-bottom: 6px;
}

.select {
  width: 100%;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 10px;
  color: var(--text);
  font-size: 13px;
  outline: none;
}

.select:focus {
  border-color: var(--accent);
}

.slider-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: var(--bg-soft);
  appearance: none;
  outline: none;
}

.slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
}

.slider-value {
  font-size: 13px;
  color: var(--text-dim);
  min-width: 30px;
  text-align: right;
}

.hint {
  font-size: 12px;
  color: var(--text-dim);
  margin-top: 4px;
}

.theme-btn {
  width: 100%;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px;
  color: var(--text);
  font-size: 13px;
}

.theme-btn:hover {
  border-color: var(--accent);
}
</style>

