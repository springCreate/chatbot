<script setup>
import { ref, onMounted } from 'vue'
import { useAuth } from './composables/useChat.js'
import Login from './components/Login.vue'
import Chat from './components/Chat.vue'

const { user, login, register, logout, getToken, fetchUser } = useAuth()
const showLogin = ref(true)
const loading = ref(true)
const theme = ref('dark')

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t)
}

onMounted(async () => {
  loading.value = true
  const savedTheme = localStorage.getItem('chatbot_theme')
  if (savedTheme) {
    theme.value = savedTheme
  }
  applyTheme(theme.value)
  
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

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  localStorage.setItem('chatbot_theme', theme.value)
  applyTheme(theme.value)
}
</script>

<template>
  <div class="app">
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
      :theme="theme"
      @logout="handleLogout"
      @toggleTheme="toggleTheme"
    />
  </div>
</template>

<style>
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
