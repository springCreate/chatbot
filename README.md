# DeepSeek 智能聊天助手

基于 DeepSeek 大模型 API 的全栈智能聊天应用，支持流式输出、Markdown 渲染、文件上传与图片OCR识别。

## ✨ 功能特性

- 🤖 **接入 DeepSeek**：支持 DeepSeek-V3 与 DeepSeek-R1 模型切换
- ⚡ **流式输出**：SSE 实时打字机效果，逐字呈现 AI 回复
- 💬 **多轮对话**：保留上下文记忆，支持连续追问
- 📝 **Markdown 渲染**：代码高亮、表格、列表、引用块完整支持
- 📎 **文件上传**：支持 PDF、Word、Excel、TXT、Markdown、CSV、图片等格式
- 🖼️ **图片OCR识别**：上传图片自动识别文字内容（中英文混合）
- 🔒 **密钥安全**：API Key 仅存于后端环境变量，前端永不接触
- 🎨 **主题切换**：暗色/亮色主题自由切换
- 🔐 **用户认证**：注册/登录系统，数据隔离
- 📱 **响应式布局**：桌面与移动端自适应

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + Vite |
| 后端 | Node.js + Express |
| 模型 | DeepSeek API (deepseek-chat / deepseek-reasoner) |
| 渲染 | marked + highlight.js |
| OCR | Tesseract.js |
| 文件解析 | pdf-parse, mammoth, xlsx |

## 📁 项目结构

```
Chatbot/
├── server/              # Express 后端
│   ├── index.js         # 服务入口 + DeepSeek 流式代理 + 文件解析
│   ├── package.json
│   ├── .env             # API 密钥（不提交 Git，需自行创建）
│   └── .env.example     # 配置模板
├── client/             # Vue 3 前端
│   ├── src/
│   │   ├── components/  # Chat / ChatInput / ChatMessage / SettingsPanel 组件
│   │   ├── composables/ # useChat / useAuth / useSessions 逻辑
│   │   ├── utils/       # Markdown渲染 + OCR识别工具
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

## 📎 文件上传支持

| 类型 | 扩展名 | 说明 |
|------|--------|------|
| 文档 | `.pdf` `.docx` `.doc` `.txt` `.md` | 提取文本内容 |
| 表格 | `.xlsx` `.xls` `.csv` | 转为文本格式 |
| 图片 | `.png` `.jpg` `.jpeg` `.gif` `.webp` `.bmp` | OCR文字识别 |

> 文件大小限制：10MB

## ⚠️ 常见问题

### 端口被占用（EADDRINUSE）

```bash
# Windows：查找占用 3000 端口的进程
netstat -ano | findstr ":3000"
# 终止对应进程（替换 PID，选择 LISTENING 状态的）
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

