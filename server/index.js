import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
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
const JWT_SECRET = process.env.JWT_SECRET || 'chatbot-secret-key';

const upload = multer({
  dest: path.join(__dirname, 'uploads'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'text/plain', 'text/markdown'];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith('.md')) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 PDF、TXT、Markdown 文件'));
    }
  },
});

fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

const db = new sqlite3.Database(path.join(__dirname, 'data', 'chatbot.db'), (err) => {
  if (err) console.error('数据库连接失败:', err);
  else console.log('✓ 数据库连接成功');
});

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT DEFAULT '新会话',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  )
`);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

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

app.post('/api/register', async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
  
  try {
    const hashedPwd = await bcrypt.hash(password, 10);
    db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPwd], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) return res.status(400).json({ error: '用户名已存在' });
        return res.status(500).json({ error: '注册失败' });
      }
      res.status(201).json({ id: this.lastID, username });
    });
  } catch (err) {
    res.status(500).json({ error: '注册失败' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
  
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err || !user) return res.status(401).json({ error: '用户名或密码错误' });
    
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: '用户名或密码错误' });
    
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, username: user.username });
  });
});

app.get('/api/sessions', authenticateToken, (req, res) => {
  db.all('SELECT * FROM sessions WHERE user_id = ? ORDER BY updated_at DESC', [req.user.id], (err, sessions) => {
    if (err) return res.status(500).json({ error: '获取会话列表失败' });
    res.json(sessions);
  });
});

app.post('/api/sessions', authenticateToken, (req, res) => {
  const { title } = req.body;
  db.run('INSERT INTO sessions (user_id, title) VALUES (?, ?)', [req.user.id, title || '新会话'], function(err) {
    if (err) return res.status(500).json({ error: '创建会话失败' });
    db.get('SELECT * FROM sessions WHERE id = ?', [this.lastID], (_, session) => res.json(session));
  });
});

app.put('/api/sessions/:id', authenticateToken, (req, res) => {
  const { title } = req.body;
  db.run('UPDATE sessions SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?', [title, req.params.id, req.user.id], function(err) {
    if (err) return res.status(500).json({ error: '更新会话失败' });
    res.json({ success: this.changes > 0 });
  });
});

app.delete('/api/sessions/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM messages WHERE session_id = ?', [req.params.id], () => {
    db.run('DELETE FROM sessions WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], function(err) {
      if (err) return res.status(500).json({ error: '删除会话失败' });
      res.json({ success: this.changes > 0 });
    });
  });
});

app.get('/api/sessions/:id/messages', authenticateToken, (req, res) => {
  db.all('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC', [req.params.id], (err, messages) => {
    if (err) return res.status(500).json({ error: '获取消息失败' });
    res.json(messages);
  });
});

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
    if (req.file.path) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: '文件解析失败' });
  }
});

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

    const userMsg = messages[messages.length - 1];
    if (userMsg && userMsg.role === 'user') {
      db.run('INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)', [session_id, userMsg.role, userMsg.content]);
      db.run('UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [session_id]);
    }

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

    if (fullContent) {
      db.run('INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)', [session_id, 'assistant', fullContent]);
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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasKey: !!DEEPSEEK_API_KEY });
});

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

