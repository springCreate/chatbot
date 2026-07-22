# DeepSeek 智能聊天助手

基于 DeepSeek 大模型 API 的全栈智能聊天应用，支持流式输出、Markdown 渲染与多轮对话。

## ✨ 功能特性

- 🤖 **接入 DeepSeek**：支持 DeepSeek-V3 与 DeepSeek-R1 模型切换
- ⚡ **流式输出**：SSE 实时打字机效果，逐字呈现 AI 回复
- 💬 **多轮对话**：保留上下文记忆，支持连续追问
- 📝 **Markdown 渲染**：代码高亮、表格、列表、引用块完整支持
- 🔒 **密钥安全**：API Key 仅存于后端环境变量，前端永不接触
- 🎨 **暗色主题**：现代简洁的深空风格 UI
- 📱 **响应式布局**：桌面与移动端自适应

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + Vite |
| 后端 | Node.js + Express |
| 模型 | DeepSeek API (deepseek-chat) |
| 渲染 | marked + highlight.js |

## 📁 项目结构

```
Chatbot/
├── server/              # Express 后端
│   ├── index.js         # 服务入口 + DeepSeek 流式代理
│   ├── package.json
│   ├── .env             # API 密钥（不提交 Git，需自行创建）
│   └── .env.example     # 配置模板
├── client/             # Vue 3 前端
│   ├── src/
│   │   ├── components/  # ChatMessage / ChatInput 组件
│   │   ├── composables/ # useChat 聊天逻辑
│   │   ├── utils/       # Markdown 渲染工具
│   │   ├── App.vue
│   │   ├── main.js
│   │   └── style.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── .gitignore
└── README.md
```

## 🔧 环境要求

在使用前，请确保已安装以下软件：

- **Node.js** v18 或更高版本 — 下载地址：https://nodejs.org/
- **Git** — 下载地址：https://git-scm.com/

可通过以下命令验证：
```bash
node -v   # 应输出 v18.x.x 或更高
git --version
```

## 🚀 快速开始

### 方式一：生产部署（推荐，单端口访问）

#### 1. 克隆仓库

```bash
git clone https://github.com/springCreate/chatbot.git
cd chatbot
```

#### 2. 配置后端环境变量

**Windows（CMD / PowerShell）**：
```bash
cd server
copy .env.example .env
```

**macOS / Linux**：
```bash
cd server
cp .env.example .env
```

然后用编辑器打开 `server/.env`，填入你的 DeepSeek API Key：
```
DEEPSEEK_API_KEY=sk-你的API密钥
PORT=3000
```

> API Key 获取地址：https://platform.deepseek.com/ （需注册账号）

#### 3. 安装后端依赖并启动

```bash
npm install
npm start
```

#### 4. 构建前端

新开一个终端窗口：
```bash
cd chatbot/client
npm install
npm run build
```

#### 5. 访问应用

浏览器打开 **http://localhost:3000** 即可使用完整应用（后端会自动托管前端构建产物）。

---

### 方式二：开发模式（前后端分离，支持热更新）

适合二次开发或调试。

```bash
# 终端 1：启动后端
cd server
npm install
copy .env.example .env   # 编辑填入 API Key
npm run dev

# 终端 2：启动前端
cd client
npm install
npm run dev
```

访问 **http://localhost:5173**（前端开发服务器，修改代码自动刷新）。

## ⚠️ 常见问题

### 端口被占用（EADDRINUSE）

```bash
# Windows：查找占用 3000 端口的进程
netstat -ano | findstr ":3000"
# 终止对应进程（替换 PID）
taskkill /PID <PID号> /F

# macOS / Linux
lsof -i :3000
kill -9 <PID>
```

## ⚙️ 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥（必填） | - |
| `PORT` | 后端端口 | 3000 |

## 📄 许可证

MIT License

