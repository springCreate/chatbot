import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasKey: !!DEEPSEEK_API_KEY });
});

// 流式聊天接口
app.post('/api/chat', async (req, res) => {
  const controller = new AbortController();
  res.on("close", () => { if (!res.writableEnded) controller.abort(); });

  try {
    const { messages, model = 'deepseek-chat', temperature = 0.7 } = req.body;

    if (!DEEPSEEK_API_KEY) {
      return res.status(500).json({ error: '服务器未配置 DEEPSEEK_API_KEY' });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages 参数无效' });
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
      body: JSON.stringify({ model, messages, stream: true, temperature }),
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
            res.write(`data: ${JSON.stringify({ content })}\n\n`);
          }
        } catch (_) {
          // 跳过无法解析的行
        }
      }
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
