# DeepSeek 智能聊天助手

基于 DeepSeek 大模型 API 的全栈智能聊天应用，支持流式输出、Markdown 渲染、文件上传与图片 OCR 识别。

## 功能特性

- **AI 对话**：接入 DeepSeek-V4 Pro 与 DeepSeek-V4 Flash 模型，SSE 流式输出
- **文件解析**：上传 PDF、Word、Excel、图片等文件，自动提取文字内容
- **图片 OCR**：上传图片自动识别中英文文字
- **多轮对话**：保留上下文记忆，支持连续追问
- **Markdown 渲染**：代码高亮、表格、列表完整展示
- **用户认证**：注册/登录系统，JWT 鉴权，会话数据隔离
- **会话管理**：多会话创建、重命名、删除，消息持久化存储
- **响应式布局**：桌面与移动端自适应
- **主题切换**：暗色/亮色主题自由切换

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + Vite |
| 后端 | Node.js + Express |
| 认证 | JWT (jsonwebtoken) + bcryptjs |
| 模型 | DeepSeek API (流式 SSE) |
| 渲染 | marked + highlight.js |
| OCR | Tesseract.js |
| 文件解析 | pdf-parse, mammoth, xlsx, docx |
| 数据存储 | JSON 文件 (db.json) |

## 快速上手

> **前置条件**：需要 [DeepSeek API Key](https://platform.deepseek.com/)，申请后复制备用。

### 1. 克隆仓库

```bash
git clone https://github.com/springCreate/chatbot.git
cd chatbot
```

### 2. 配置环境变量

```bash
# Windows
copy server\.env.example server\.env

# macOS / Linux
# cp server/.env.example server/.env
```

编辑 `server/.env`，填入你的 DeepSeek API Key：

```env
DEEPSEEK_API_KEY=sk-your-key-here
```

### 3. 安装依赖

```bash
npm run install:all
```

### 4. 启动开发服务

需要同时启动后端和前端两个终端：

**终端 1 —— 后端（端口 3000）：**
```bash
npm run dev:server
```

**终端 2 —— 前端（端口 5173）：**
```bash
npm run dev:client
```

浏览器打开 **http://localhost:5173** 即可使用。前端 Vite 开发服务器会自动将 `/api` 请求代理到后端。

### 5. 生产构建

```bash
npm run build
npm start
```

浏览器打开 **http://localhost:3000** 即可使用。

## 项目结构

```
chatbot/
├── server/                     # Express 后端
│   ├── index.js                # 服务入口 + DeepSeek 流式代理 + 文件解析 + 认证
│   ├── package.json
│   ├── .env                    # API 密钥（不提交 Git）
│   └── .env.example            # 配置模板
├── client/                     # Vue 3 前端
│   ├── src/
│   │   ├── components/         # Chat / ChatInput / ChatMessage / Login / SessionList / SettingsPanel
│   │   ├── composables/        # useChat (含 useAuth / useSessions / useUpload)
│   │   ├── utils/              # Markdown 渲染 + OCR 工具
│   │   ├── App.vue
│   │   ├── main.js
│   │   └── style.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── package.json                # 根项目脚本
├── README.md
└── .gitignore
```

## API 接口

所有接口前缀：`/api`

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/health` | 健康检查 | 否 |
| POST | `/register` | 用户注册 | 否 |
| POST | `/login` | 用户登录 | 否 |
| GET | `/me` | 获取当前用户信息 | 是 |
| GET | `/sessions` | 获取会话列表 | 是 |
| POST | `/sessions` | 创建会话 | 是 |
| PUT | `/sessions/:id` | 更新会话标题 | 是 |
| DELETE | `/sessions/:id` | 删除会话 | 是 |
| GET | `/sessions/:id/messages` | 获取会话消息 | 是 |
| POST | `/chat` | 流式对话 (SSE) | 是 |
| POST | `/upload` | 文件上传与解析 | 是 |

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| DEEPSEEK_API_KEY | DeepSeek API 密钥（必填） | - |
| PORT | 后端端口 | 3000 |
| JWT_SECRET | JWT 签名密钥 | chatbot-secret-key-2024 |
| DATA_DIR | 数据持久化目录 | 系统临时目录 |

## 文件上传支持

| 类型 | 扩展名 | 说明 |
|------|--------|------|
| 文档 | .pdf .docx .doc .txt .md | 提取文本内容（docx 同步提取内嵌图片） |
| 表格 | .xlsx .xls .csv | 转为文本格式 |
| 图片 | .png .jpg .jpeg .gif .webp .bmp | OCR 文字识别（中英文） |

> 文件大小限制：10MB

## 常见问题

### 前端请求 502 / 连接失败
确保后端服务已启动（`npm run dev:server`），并检查 `server/.env` 中已正确配置 `DEEPSEEK_API_KEY`。

### 端口被占用
修改 `server/.env` 中的 `PORT` 为其他值（如 3001），并同步更新 `client/vite.config.js` 中的代理目标端口。

### 数据存储在哪里
默认存储在系统临时目录下的 `deepseek-chat-data` 文件夹中，包含 `db.json`（用户/会话/消息数据）和 `uploads/`（上传文件缓存）。如需持久化，请设置 `DATA_DIR` 环境变量。

## 许可证

MIT
