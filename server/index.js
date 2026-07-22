import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import fs from 'fs';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const JWT_SECRET = process.env.JWT_SECRET || 'chatbot-secret-key-2024';

// 文件存储路径
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// 简单 JSON 数据库
function loadDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch {
    return { users: [], sessions: [], messages: [], nextUserId: 1, nextSessionId: 1, nextMessageId: 1 };
  }
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'text/plain', 'text/markdown'];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith('.md') || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 PDF、TXT、Markdown 文件'));
    }
  },
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 鉴权中间件
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: '需要登录' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: '无效的 token' });
    req.user = user;
    next();
  });
}

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasKey: !!DEEPSEEK_API_KEY });
});

// 注册
app.post('/api/register', async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
  
  const db = loadDB();
  if (db.users.find(u => u.username === username)) {
    return res.status(400).json({ error: '用户名已存在' });
  }
  
  try {
    const hashedPwd = await bcrypt.hash(password, 10);
    const newUser = {
      id: db.nextUserId++,
      username,
      email: email || '',
      password: hashedPwd,
      created_at: new Date().toISOString(),
    };
    db.users.push(newUser);
    saveDB(db);
    res.status(201).json({ id: newUser.id, username: newUser.username });
  } catch (err) {
    res.status(500).json({ error: '注册失败' });
  }
});

// 登录
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
  
  const db = loadDB();
  const user = db.users.find(u => u.username === username);
  if (!user) return res.status(401).json({ error: '用户名或密码错误' });
  
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: '用户名或密码错误' });
  
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, username: user.username, userId: user.id });
});

// 获取会话列表
app.get('/api/sessions', authenticateToken, (req, res) => {
  const db = loadDB();
  const sessions = db.sessions
    .filter(s => s.user_id === req.user.id)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  res.json(sessions);
});

// 创建会话
app.post('/api/sessions', authenticateToken, (req, res) => {
  const { title } = req.body;
  const db = loadDB();
  const newSession = {
    id: db.nextSessionId++,
    user_id: req.user.id,
    title: title || '新会话',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  db.sessions.push(newSession);
  saveDB(db);
  res.json(newSession);
});

// 更新会话标题
app.put('/api/sessions/:id', authenticateToken, (req, res) => {
  const { title } = req.body;
  const db = loadDB();
  const session = db.sessions.find(s => s.id === parseInt(req.params.id) && s.user_id === req.user.id);
  if (!session) return res.status(404).json({ error: '会话不存在' });
  
  session.title = title;
  session.updated_at = new Date().toISOString();
  saveDB(db);
  res.json({ success: true });
});

// 删除会话
app.delete('/api/sessions/:id', authenticateToken, (req, res) => {
  const sessionId = parseInt(req.params.id);
  const db = loadDB();
  const sessionIdx = db.sessions.findIndex(s => s.id === sessionId && s.user_id === req.user.id);
  if (sessionIdx === -1) return res.status(404).json({ error: '会话不存在' });
  
  db.sessions.splice(sessionIdx, 1);
  db.messages = db.messages.filter(m => m.session_id !== sessionId);
  saveDB(db);
  res.json({ success: true });
});

// 获取会话消息
app.get('/api/sessions/:id/messages', authenticateToken, (req, res) => {
  const db = loadDB();
  const sessionId = parseInt(req.params.id);
  const session = db.sessions.find(s => s.id === sessionId && s.user_id === req.user.id);
  if (!session) return res.status(404).json({ error: '会话不存在' });
  
  const messages = db.messages
    .filter(m => m.session_id === sessionId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  res.json(messages);
});

// 文件上传
app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请选择文件' });
  
  try {
    let text = '';
    const ext = req.file.originalname.split('.').pop().toLowerCase();
    
    if (ext === 'pdf') {
      const data = await pdfParse(fs.readFileSync(req.file.path));
      text = data.text;
    } else {
      text = fs.readFileSync(req.file.path, 'utf-8');
    }
    
    fs.unlinkSync(req.file.path);
    res.json({ content: text.substring(0, 20000), filename: req.file.originalname });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: '文件解析失败' });
  }
});

// 流式聊天接口
app.post('/api/chat', authenticateToken, async (req, res) => {
  const controller = new AbortController();
  res.on("close", () => { if (!res.writableEnded) controller.abort(); });

  try {
    const { session_id, messages, model = 'deepseek-chat', temperature = 0.7, max_tokens = 4096 } = req.body;

    if (!DEEPSEEK_API_KEY) {
      return res.status(500).json({ error: '服务器未配置 DEEPSEEK_API_KEY' });
    }

    if (!session_id) {
      return res.status(400).json({ error: 'session_id 参数无效' });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages 参数无效' });
    }

    // 保存用户消息
    const db = loadDB();
    const userMsg = messages[messages.length - 1];
    if (userMsg && userMsg.role === 'user') {
      db.messages.push({
        id: db.nextMessageId++,
        session_id: session_id,
        role: userMsg.role,
        content: userMsg.content,
        created_at: new Date().toISOString(),
      });
      const session = db.sessions.find(s => s.id === session_id);
      if (session) {
        session.updated_at = new Date().toISOString();
        // 如果是新会话且标题是默认的，用第一条消息作为标题
        if (session.title === '新会话' && userMsg.content.length > 0) {
          session.title = userMsg.content.substring(0, 30) + (userMsg.content.length > 30 ? '...' : '');
        }
      }
      saveDB(db);
    }

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const response = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({ model, messages, stream: true, temperature, max_tokens }),
      signal: controller.signal,
    });

    if (!response.ok) {
      let errMsg = `DeepSeek API 错误 (${response.status})`;
      try {
        const errBody = await response.json();
        if (errBody.error?.message) errMsg = errBody.error.message;
      } catch (_) {}
      res.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') {
          res.write('data: [DONE]\n\n');
          continue;
        }
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;
          const content = delta?.content;
          if (content) {
            fullContent += content;
            res.write(`data: ${JSON.stringify({ content })}\n\n`);
          }
        } catch (_) {}
      }
    }

    // 保存 AI 回复
    if (fullContent) {
      const db2 = loadDB();
      db2.messages.push({
        id: db2.nextMessageId++,
        session_id: session_id,
        role: 'assistant',
        content: fullContent,
        created_at: new Date().toISOString(),
      });
      saveDB(db2);
    }
    res.end();
  } catch (err) {
    if (err.name === 'AbortError') {
      res.write('data: [DONE]\n\n');
      return res.end();
    }
    console.error('聊天接口异常:', err);
    try {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.write('data: [DONE]\n\n');
    } catch (_) {}
    res.end();
  }
});

// 生产环境托管前端静态文件
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(404).send('请先构建前端：cd client && npm run build');
  });
});

app.listen(PORT, () => {
  console.log(`✓ 服务已启动: http://localhost:${PORT}`);
  if (!DEEPSEEK_API_KEY) {
    console.warn('⚠ 警告: 未配置 DEEPSEEK_API_KEY，请在 server/.env 中设置');
  }
});

