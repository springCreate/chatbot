<script setup>
import { ref } from 'vue'

const emit = defineEmits(['login', 'register'])

const isLogin = ref(true)
const username = ref('')
const password = ref('')
const email = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  
  if (!username.value.trim() || !password.value.trim()) {
    error.value = '用户名和密码不能为空'
    return
  }
  
  if (!isLogin.value) {
    if (!email.value.trim()) {
      error.value = '邮箱不能为空'
      return
    }
    if (password.value !== confirmPassword.value) {
      error.value = '两次密码不一致'
      return
    }
  }
  
  loading.value = true
  
  try {
    let result
    if (isLogin.value) {
      result = await emit('login', username.value, password.value)
    } else {
      result = await emit('register', username.value, password.value, email.value)
    }
    
    if (!result.success) {
      error.value = result.error || '操作失败'
    }
  } catch (err) {
    error.value = '网络错误，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="card">
      <div class="logo">🤖</div>
      <h1>DeepSeek 智能助手</h1>
      <p class="subtitle">基于 DeepSeek 大模型的全栈 AI 聊天应用</p>
      
      <div class="tabs">
        <button
          class="tab"
          :class="{ active: isLogin }"
          @click="isLogin = true"
        >
          登录
        </button>
        <button
          class="tab"
          :class="{ active: !isLogin }"
          @click="isLogin = false"
        >
          注册
        </button>
      </div>
      
      <div class="form">
        <div class="input-group">
          <label>用户名</label>
          <input
            v-model="username"
            type="text"
            placeholder="请输入用户名"
            @keyup.enter="submit"
          />
        </div>
        
        <div v-if="!isLogin" class="input-group">
          <label>邮箱（选填）</label>
          <input
            v-model="email"
            type="email"
            placeholder="请输入邮箱"
          />
        </div>
        
        <div class="input-group">
          <label>密码</label>
          <input
            v-model="password"
            type="password"
            placeholder="请输入密码"
            @keyup.enter="submit"
          />
        </div>
        
        <div v-if="!isLogin" class="input-group">
          <label>确认密码</label>
          <input
            v-model="confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            @keyup.enter="submit"
          />
        </div>
        
        <div v-if="error" class="error">{{ error }}</div>
        
        <button class="submit-btn" @click="submit" :disabled="loading">
          {{ loading ? '处理中...' : (isLogin ? '登 录' : '注 册') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: linear-gradient(135deg, var(--bg) 0%, var(--bg-soft) 100%);
}

.card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 40px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.logo {
  font-size: 48px;
  text-align: center;
  margin-bottom: 16px;
}

h1 {
  font-size: 24px;
  text-align: center;
  margin-bottom: 8px;
}

.subtitle {
  text-align: center;
  color: var(--text-dim);
  font-size: 14px;
  margin-bottom: 28px;
}

.tabs {
  display: flex;
  gap: 4px;
  background: var(--bg-soft);
  border-radius: 10px;
  padding: 4px;
  margin-bottom: 28px;
}

.tab {
  flex: 1;
  padding: 10px;
  border: none;
  background: transparent;
  color: var(--text-dim);
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.tab.active {
  background: var(--accent);
  color: #fff;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-group label {
  font-size: 13px;
  color: var(--text-dim);
}

.input-group input {
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
  color: var(--text);
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
}

.input-group input:focus {
  border-color: var(--accent);
}

.input-group input::placeholder {
  color: var(--text-dim);
}

.error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: var(--danger);
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
}

.submit-btn {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 14px;
  font-size: 15px;
  font-weight: 500;
  margin-top: 8px;
  transition: opacity 0.2s;
}

.submit-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

