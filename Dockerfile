 # ============================================================
 # Stage 1: Build frontend (Vue 3 + Vite)
 # ============================================================
 FROM node:18-alpine AS build
 WORKDIR /app
 
 # 单独复制 package.json 以利用 Docker 层缓存
 COPY client/package*.json ./client/
 RUN npm --prefix client ci
 
 # 复制源码并构建
 COPY client/ ./client/
 RUN npm --prefix client run build
 
 # ============================================================
 # Stage 2: Runtime (Express server + built frontend)
 # ============================================================
 FROM node:18-alpine AS runtime
 WORKDIR /app
 
 # 安装 server 生产依赖
 COPY server/package*.json ./server/
 RUN npm --prefix server ci --omit=dev
 
 # 复制 server 源码 + 前端构建产物
 COPY server/ ./server/
 COPY --from=build /app/client/dist ./client/dist
 
 EXPOSE 3000
 
 CMD ["node", "server/index.js"]
