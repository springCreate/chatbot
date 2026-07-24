# DeepSeek 智能聊天助手

基于 DeepSeek 大模型 API 的全栈智能聊天应用，支持流式输出、Markdown 渲染、文件上传与图片 OCR 识别。

## 功能特性

- **AI 对话**：接入 DeepSeek-V3 与 DeepSeek-R1 模型，SSE 流式输出
- **文件解析**：上传 PDF、Word、Excel、图片等文件，自动提取文字内容
- **图片 OCR**：上传图片自动识别中英文文字
- **多轮对话**：保留上下文记忆，支持连续追问
- **Markdown 渲染**：代码高亮、表格、列表完整展示
- **用户认证**：注册/登录系统，会话数据隔离
- **响应式布局**：桌面与移动端自适应
- **主题切换**：暗色/亮色主题自由切换

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + Vite |
| 后端 | Node.js + Express |
| 模型 | DeepSeek API |
| 渲染 | marked + highlight.js |
| OCR | Tesseract.js |
| 文件解析 | pdf-parse, mammoth, xlsx |

## 快速上手

> **前置条件**：需要 [DeepSeek API Key](https://platform.deepseek.com/)，申请后复制备用。

### 方式一：Docker（推荐，本地一点即开）

确保已安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)。

```bash
git clone https://github.com/springCreate/chatbot.git
cd chatbot

# Windows: copy server\.env.example server\.env
# macOS/Linux: cp server/.env.example server/.env
# 编辑 server/.env，填入 DeepSeek API Key

docker compose up -d
```

浏览器打开 **http://localhost:3000** 即可使用。

### 方式二：使用预构建的 Docker 镜像（无需克隆仓库）

GitHub Actions 每次推送会自动构建镜像并推送到 ghcr.io，任何人都可以直接运行：

```bash
docker run -d -p 3000:3000 -e DEEPSEEK_API_KEY=sk-your-key-here ghcr.io/springCreate/chatbot:latest
```

### 方式三：传统 Node 方式

```bash
npm install
npm --prefix client install
npm --prefix client run build
npm start
```

## 把本地服务分享给他人（Cloudflare Tunnel）

不需要云服务器，也不需要任何平台授权。在你本地运行好 Docker 后，加一个 Cloudflare Tunnel 就能生成公开的 HTTPS 网址，直接把链接发给朋友即可访问。

```bash
# 启动服务 + 隧道（本地 + 公网同时生效）
docker compose --profile tunnel up -d

# 查看生成的公开网址
docker compose logs tunnel
# 输出中寻找:  https://xxxx.trycloudflare.com
```

整个过程无需注册任何账号，Cloudflare 在中国可正常访问，隧道流量走 Cloudflare 全球网络。

> 如果 Tunnel URL 会随重启变化，你可以绑定自己的域名（需一个 Cloudflare 免费账号 + 域名），详情见 [Cloudflare Tunnel 文档](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)。

## 部署到云服务器

### 使用 Docker 部署到任意 VPS

```bash
docker run -d \
  --name chatbot \
  -p 80:3000 \
  -e DEEPSEEK_API_KEY=sk-your-key-here \
  -e JWT_SECRET=your-secret-here \
  -v chatbot-data:/var/data \
  ghcr.io/springCreate/chatbot:latest
```

之后访问 `http://你的服务器IP`。如需 HTTPS，用 Nginx 反向代理 + certbot。

### 手动部署到 Render（备选）

如果 Render 的 GitHub OAuth 流程可用，也可以手动创建 Web Service：

1. 登录 [Render Dashboard](https://dashboard.render.com/)
2. **New +** → **Web Service** → **Build and deploy from a Git repository**
3. 配置：
   - **Runtime**: Node
   - **Build Command**: npm install && npm --prefix client install && npm --prefix client run build
   - **Start Command**: node server/index.js
4. 添加环境变量：DEEPSEEK_API_KEY、JWT_SECRET、NODE_ENV=production

## 项目结构

```
chatbot/
├── server/                     # Express 后端
│   ├── index.js                # 服务入口 + DeepSeek 流式代理 + 文件解析
│   ├── package.json
│   ├── .env                    # API 密钥（不提交 Git）
│   └── .env.example            # 配置模板
├── client/                     # Vue 3 前端
│   ├── src/
│   │   ├── components/         # Chat / ChatInput / ChatMessage / SettingsPanel
│   │   ├── composables/        # useChat / useAuth / useSessions
│   │   ├── utils/              # Markdown 渲染 + OCR 工具
│   │   ├── App.vue
│   │   ├── main.js
│   │   └── style.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── Dockerfile                  # 多阶段 Docker 构建
├── docker-compose.yml          # Docker 编排（含 Cloudflare Tunnel 配置）
├── render.yaml                 # Render 云部署配置
├── .github/
│   ├── workflows/
│   │   ├── ci.yml              # 前端构建 + Docker 镜像验证
│   │   └── docker-publish.yml  # 自动推送镜像到 ghcr.io
└── .gitignore
```

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

### Docker 启动后页面空白
确保 `server/.env` 文件存在且包含 `DEEPSEEK_API_KEY`。查看日志：`docker compose logs -f`。

### 端口被占用
修改 `docker-compose.yml` 中的端口映射为其他端口（如 `"3001:3000"`）。

## 许可证

MIT
