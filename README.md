 # DeepSeek 智能聊天助手
 
 基于 DeepSeek 大模型 API 的全栈智能聊天应用，支持流式输出、Markdown 渲染、文件上传与图片 OCR 识别。
 
 每次推送到 `main` 分支，GitHub Actions 会自动构建 Docker 镜像并发布到 [GitHub Container Registry](https://github.com/springCreate/chatbot/pkgs/container/chatbot)，任何人都可以直接拉取运行。
 
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
 # 克隆仓库
 git clone https://github.com/springCreate/chatbot.git
 cd chatbot
 
 # 配置 API Key
 # Windows: copy server\.env.example server\.env
 # macOS/Linux: cp server/.env.example server/.env
 # 编辑 server/.env，填入你的 DeepSeek API Key
 
 # 启动（后台运行）
 docker compose up -d
 ```
 
 浏览器打开 **http://localhost:3000** 即可使用。
 
 停止服务：`docker compose down`
 查看日志：`docker compose logs -f`
 
 ### 方式二：使用预构建的 Docker 镜像（无需克隆仓库）
 
 GitHub Actions 每次推送会自动构建镜像并推送到 ghcr.io。任何人都可以直接运行，无需 Node.js 环境：
 
 ```bash
 # 拉取镜像（首次自动下载）
 docker run -d -p 3000:3000 -e DEEPSEEK_API_KEY=sk-your-key-here ghcr.io/springCreate/chatbot:latest
 ```
 
 > 可选的持久化数据：`-v chatbot-data:/var/data`
 
 浏览器打开 **http://localhost:3000** 即可使用。
 
 ### 方式三：传统 Node 方式
 
 ```bash
 # 1. 安装依赖
 npm install
 npm --prefix client install
 
 # 2. 构建前端
 npm --prefix client run build
 
 # 3. 启动服务（需先配置 server/.env）
 npm start
 ```
 
 浏览器打开 **http://localhost:3000**。
 
 ## 部署到云服务器
 
 ### 使用 Docker 部署到任意 VPS
 
 ```bash
 # 登录到你的云服务器后：
 docker run -d \
   --name chatbot \
   -p 80:3000 \
   -e DEEPSEEK_API_KEY=sk-your-key-here \
   -e JWT_SECRET=your-secret-here \
   -v chatbot-data:/var/data \
   ghcr.io/springCreate/chatbot:latest
 ```
 
 之后访问 `http://你的服务器IP` 即可使用。如需 HTTPS，可用 Nginx 反向代理 + certbot。
 
 ### 手动部署到 Render
 
 如果 Render 的 GitHub OAuth 授权流程可用，也可以在 Render 控制台手动创建 Web Service：
 
 1. 登录 [Render Dashboard](https://dashboard.render.com/)
 2. 点击 **New +** → **Web Service**
 3. 选择 **Build and deploy from a Git repository** → 连接你的 GitHub 仓库
 4. 配置：
    - **Name**: `deepseek-chatbot`
    - **Runtime**: `Node`
    - **Build Command**: `npm install && npm --prefix client install && npm --prefix client run build`
    - **Start Command**: `node server/index.js`
    - **Plan**: `Free`
 5. 添加环境变量：
    - `DEEPSEEK_API_KEY` → 你的 API Key
    - `JWT_SECRET` → 自动生成一个随机字符串
    - `NODE_ENV` → `production`
 6. 点击 **Create Web Service**，等待部署完成
 
 部署成功后 Render 会分配一个 `https://xxx.onrender.com` 域名，可直接分享给任何人使用。
 
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
 ├── docker-compose.yml          # Docker 编排
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
 | `DEEPSEEK_API_KEY` | DeepSeek API 密钥（必填） | - |
 | `PORT` | 后端端口 | 3000 |
 | `JWT_SECRET` | JWT 签名密钥 | chatbot-secret-key-2024 |
 | `DATA_DIR` | 数据持久化目录 | 系统临时目录 |
 
 ## 文件上传支持
 
 | 类型 | 扩展名 | 说明 |
 |------|--------|------|
 | 文档 | .pdf .docx .doc .txt .md | 提取文本内容（docx 同步提取内嵌图片） |
 | 表格 | .xlsx .xls .csv | 转为文本格式 |
 | 图片 | .png .jpg .jpeg .gif .webp .bmp | OCR 文字识别（中英文） |
 
 > 文件大小限制：10MB
 
 ### 附件显示机制
 
 上传的文件以**附件卡片**形式呈现在聊天框中。用户消息包含 `content`（纯文字）和 `attachments`（附件数组），UI 仅显示附件卡片。调用 DeepSeek API 时自动将 `content` 与附件内容拼接，AI 可读取全部信息。
 
 ## 常见问题
 
 ### Docker 启动后页面空白
 
 确保 `server/.env` 文件存在且包含 `DEEPSEEK_API_KEY`。查看日志：`docker compose logs -f`。
 
 ### 端口被占用
 
 ```bash
 # Windows
 netstat -ano | findstr ":3000"
 taskkill /PID <PID> /F
 
 # macOS / Linux
 lsof -i :3000
 kill -9 <PID>
 ```
 
 或修改 `docker-compose.yml` 中的端口映射为其他端口（如 `"3001:3000"`）。
 
 ## 许可证
 
 MIT
