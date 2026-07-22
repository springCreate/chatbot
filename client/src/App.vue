<script setup>
import { ref, onMounted } from 'vue'
import { useAuth } from './composables/useChat.js'
import Login from './components/Login.vue'
import Chat from './components/Chat.vue'

const { user, login, register, logout, getToken, fetchUser } = useAuth()
const showLogin = ref(true)
const loading = ref(true)

onMounted(async () => {
  loading.value = true
  if (getToken()) {
    const success = await fetchUser()
    showLogin.value = !success
  } else {
    showLogin.value = true
  }
  loading.value = false
})

async function handleLogin(username, password) {
  const { success, error } = await login(username, password)
  if (success) {
    showLogin.value = false
  }
  return { success, error }
}

async function handleRegister(username, password, email) {
  const { success, error } = await register(username, password, email)
  if (success) {
    await login(username, password)
    showLogin.value = false
  }
  return { success, error }
}

function handleLogout() {
  logout()
  showLogin.value = true
}
</script>

<template>
  <div class="app" :class="{ 'dark': true }">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
    </div>
    <Login
      v-else-if="showLogin"
      @login="handleLogin"
      @register="handleRegister"
    />
    <Chat
      v-else
      :user="user"
      @logout="handleLogout"
    />
  </div>
</template>

<style>
:root {
  --bg: #0a0a0f;
  --bg-soft: #111118;
  --panel: #1a1a24;
  --border: #2a2a3a;
  --text: #e4e4e7;
  --text-dim: #71717a;
  --accent: #6366f1;
  --accent-soft: rgba(99, 102, 241, 0.1);
  --user-bubble: #6366f1;
  --ai-bubble: #1e1e2a;
  --danger: #ef4444;
  --success: #22c55e;
  --radius: 12px;
  --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --mono: 'Fira Code', 'Monaco', 'Consolas', monospace;
}

[data-theme="light"] {
  --bg: #f8fafc;
  --bg-soft: #f1f5f9;
  --panel: #ffffff;
  --border: #e2e8f0;
  --text: #1e293b;
  --text-dim: #94a3b8;
  --accent: #4f46e5;
  --accent-soft: rgba(79, 70, 229, 0.1);
  --user-bubble: #4f46e5;
  --ai-bubble: #f1f5f9;
  --danger: #dc2626;
  --success: #16a34a;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
}

#app {
  min-height: 100vh;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>

