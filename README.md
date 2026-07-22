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
│   ├── .env             # API 密钥（不提交 Git）
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

## 🚀 快速开始

### 1. 克隆仓库

```bash
git clone <repository-url>
cd Chatbot
```

### 2. 配置后端

```bash
cd server
npm install
cp .env.example .env
# 编辑 .env，填入你的 DeepSeek API Key
# DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
```

API Key 获取地址：https://platform.deepseek.com/

### 3. 启动后端

```bash
npm start
# 服务运行于 http://localhost:3000
```

### 4. 启动前端（新开终端）

```bash
cd client
npm install
npm run dev
# 前端运行于 http://localhost:5173
```

打开浏览器访问 http://localhost:5173 即可开始对话。

## 📦 生产部署

```bash
# 构建前端
cd client && npm install && npm run build

# 启动后端（自动托管前端静态文件）
cd ../server && npm install && npm start
```

访问 http://localhost:3000 即可使用完整应用。

## ⚙️ 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥（必填） | - |
| `PORT` | 后端端口 | 3000 |

## 📄 许可证

MIT License
