import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import fs from 'fs';
import os from 'os';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const JWT_SECRET = process.env.JWT_SECRET || 'chatbot-secret-key-2024';

const USER_DATA_DIR = path.join(os.tmpdir(), 'deepseek-chat-' + process.env.USERNAME);
const UPLOADS_DIR = path.join(USER_DATA_DIR, 'uploads');
const DB_FILE = path.join(USER_DATA_DIR, 'db.json');

function ensureDir(dir) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    console.error('Dir error:', dir, err.message);
  }
}

ensureDir(USER_DATA_DIR);
ensureDir(UPLOADS_DIR);

let dbCache = null;

function loadDB() {
  if (dbCache) return dbCache;
  try {
    if (!fs.existsSync(DB_FILE)) {
      dbCache = { users: [], sessions: [], messages: [], nextUserId: 1, nextSessionId: 1, nextMessageId: 1 };
      return dbCache;
    }
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    dbCache = JSON.parse(content);
    return dbCache;
  } catch (err) {
    console.error('DB load error:', err.message);
    dbCache = { users: [], sessions: [], messages: [], nextUserId: 1, nextSessionId: 1, nextMessageId: 1 };
    return dbCache;
  }
}

function saveDB(db) {
  dbCache = db;
  try {
    ensureDir(USER_DATA_DIR);
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), { encoding: 'utf-8' });
    return true;
  } catch (err) {
    console.error('DB save error:', err.message);
    return false;
  }
}

const ALLOWED_EXTENSIONS = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  txt: 'text/plain',
  md: 'text/markdown',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  csv: 'text/csv',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
};

const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    const allowedExts = Object.keys(ALLOWED_EXTENSIONS);
    if (allowedExts.includes(ext) || Object.values(ALLOWED_EXTENSIONS).includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not supported'));
    }
  },
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Login required' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

app.get('/api/health', (req, res) => res.json({ status: 'ok', hasKey: !!DEEPSEEK_API_KEY }));

app.post('/api/register', async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const db = loadDB();
  if (db.users.find(u => u.username === username)) return res.status(400).json({ error: 'Username exists' });
  try {
    const hashedPwd = await bcrypt.hash(password, 10);
    const newUser = { id: db.nextUserId++, username, email: email || '', password: hashedPwd, created_at: new Date().toISOString() };
    db.users.push(newUser);
    if (!saveDB(db)) return res.status(500).json({ error: 'Save failed' });
    res.status(201).json({ id: newUser.id, username: newUser.username });
  } catch { res.status(500).json({ error: 'Register failed' }); }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const db = loadDB();
  const user = db.users.find(u => u.username === username);
  if (!user) return res.status(401).json({ error: 'Wrong username or password' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'Wrong username or password' });
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, username: user.username, userId: user.id });
});

app.get('/api/me', authenticateToken, (req, res) => {
  const db = loadDB();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, username: user.username, email: user.email });
});

app.get('/api/sessions', authenticateToken, (req, res) => {
  const db = loadDB();
  res.json(db.sessions.filter(s => s.user_id === req.user.id).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)));
});

app.post('/api/sessions', authenticateToken, (req, res) => {
  const { title } = req.body;
  const db = loadDB();
  const newSession = { id: db.nextSessionId++, user_id: req.user.id, title: title || 'New Session', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  db.sessions.push(newSession);
  saveDB(db);
  res.json(newSession);
});

app.put('/api/sessions/:id', authenticateToken, (req, res) => {
  const { title } = req.body;
  const db = loadDB();
  const session = db.sessions.find(s => s.id === parseInt(req.params.id) && s.user_id === req.user.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  session.title = title;
  session.updated_at = new Date().toISOString();
  saveDB(db);
  res.json({ success: true });
});

app.delete('/api/sessions/:id', authenticateToken, (req, res) => {
  const sessionId = parseInt(req.params.id);
  const db = loadDB();
  const idx = db.sessions.findIndex(s => s.id === sessionId && s.user_id === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Session not found' });
  db.sessions.splice(idx, 1);
  db.messages = db.messages.filter(m => m.session_id !== sessionId);
  saveDB(db);
  res.json({ success: true });
});

app.get('/api/sessions/:id/messages', authenticateToken, (req, res) => {
  const db = loadDB();
  const sessionId = parseInt(req.params.id);
  if (!db.sessions.find(s => s.id === sessionId && s.user_id === req.user.id)) return res.status(404).json({ error: 'Session not found' });
  res.json(db.messages.filter(m => m.session_id === sessionId).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
});

async function parseFile(filePath, ext, originalname) {
  let text = '';
  const typeMap = { pdf: 'PDF', docx: 'Word', doc: 'Word', xlsx: 'Excel', xls: 'Excel', csv: 'CSV', txt: 'Text', md: 'Markdown', png: 'PNG', jpg: 'JPEG', jpeg: 'JPEG', gif: 'GIF', webp: 'WebP', bmp: 'BMP' };
  const fileType = typeMap[ext] || 'Unknown';
  try {
    if (ext === 'pdf') { text = (await pdfParse(fs.readFileSync(filePath))).text; }
    else if (ext === 'docx' || ext === 'doc') { text = (await mammoth.extractRawText({ path: filePath })).value; }
    else if (ext === 'xlsx' || ext === 'xls') {
      const wb = XLSX.readFile(filePath);
      let csvContent = '';
      wb.SheetNames.forEach(function(n) {
        csvContent = csvContent + '[' + n + ']\n' + XLSX.utils.sheet_to_csv(wb.Sheets[n]) + '\n\n';
      });
      text = csvContent;
    }
    else if (ext === 'csv') { text = fs.readFileSync(filePath, 'utf-8'); }
    else if (['png','jpg','jpeg','gif','webp','bmp'].indexOf(ext) !== -1) { text = '[Image: ' + originalname + ']'; }
    else { text = fs.readFileSync(filePath, 'utf-8'); }
    return { text: text.substring(0, 30000), fileType };
  } catch (err) { throw new Error('Parse failed: ' + err.message); }
}

app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Please select a file' });
  try {
    const ext = req.file.originalname.split('.').pop().toLowerCase();
    const { text, fileType } = await parseFile(req.file.path, ext, req.file.originalname);
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.json({ content: text, filename: req.file.originalname, fileType });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chat', authenticateToken, async (req, res) => {
  const controller = new AbortController();
  res.on("close", function() { if (!res.writableEnded) controller.abort(); });
  try {
    const { session_id, messages, model = 'deepseek-chat', temperature = 0.7, max_tokens = 4096 } = req.body;
    if (!DEEPSEEK_API_KEY) return res.status(500).json({ error: 'API KEY not configured' });
    if (!session_id || !Array.isArray(messages) || messages.length === 0) return res.status(400).json({ error: 'Invalid params' });
    const db = loadDB();
    const userMsg = messages[messages.length - 1];
    if (userMsg && userMsg.role === 'user') {
      db.messages.push({ id: db.nextMessageId++, session_id, role: 'user', content: userMsg.content, created_at: new Date().toISOString() });
      const session = db.sessions.find(function(s) { return s.id === session_id; });
      if (session) { session.updated_at = new Date().toISOString(); if (['New Session', '新会话'].includes(session.title)) session.title = userMsg.content.substring(0, 30) + (userMsg.content.length > 30 ? '...' : ''); }
      saveDB(db);
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    const response = await fetch(DEEPSEEK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + DEEPSEEK_API_KEY }, body: JSON.stringify({ model, messages, stream: true, temperature, max_tokens }), signal: controller.signal });
    if (!response.ok) { let msg = 'API Error'; try { msg = (await response.json()).error?.message || msg; } catch {} res.write('data: ' + JSON.stringify({ error: msg }) + '\n\n'); return res.end(); }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '', fullContent = '';
    while (true) { const { done, value } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop() || ''; for (let i = 0; i < lines.length; i++) { const t = lines[i].trim(); if (!t || !t.startsWith('data:')) continue; const d = t.slice(5).trim(); if (d === '[DONE]') { res.write('data: [DONE]\n\n'); continue; } try { const p = JSON.parse(d); const c = p.choices?.[0]?.delta?.content; if (c) { fullContent += c; res.write('data: ' + JSON.stringify({ content: c }) + '\n\n'); } } catch {} } }
    if (fullContent) { const db2 = loadDB(); db2.messages.push({ id: db2.nextMessageId++, session_id, role: 'assistant', content: fullContent, created_at: new Date().toISOString() }); saveDB(db2); }
    res.end();
  } catch (err) { if (err.name === 'AbortError') { res.write('data: [DONE]\n\n'); return res.end(); } try { res.write('data: ' + JSON.stringify({ error: err.message }) + '\n\n'); } catch {} res.end(); }
});

const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get(/^\/(?!api).*/, function(req, res) { res.sendFile(path.join(clientDist, 'index.html'), function(err) { if (err) res.status(404).send('Build frontend first'); }); });

app.listen(PORT, function() { console.log('Server started: http://localhost:' + PORT); console.log('Data dir: ' + USER_DATA_DIR); if (!DEEPSEEK_API_KEY) console.warn('DEEPSEEK_API_KEY not configured'); });
