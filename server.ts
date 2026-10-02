import express from 'express';
import cors from 'cors';
import path from 'path';
import { 
  getYdbUser, 
  upsertYdbUser, 
  decrementYdbToken, 
  addYdbUserTokens,
  getYdbDiagrams, 
  saveYdbDiagram,
  registerYdbUser,
  loginYdbUser,
  verifyYdbUserCode,
  resendYdbVerificationCode,
  deleteYdbDiagram
} from './src/server/ydb.js';
import { 
  generateSessionToken, 
  requireAuth, 
  optionalAuth, 
  type AuthenticatedRequest 
} from './src/server/auth.js';
import { createRateLimiter } from './src/server/rateLimit.js';
import { 
  handleRobokassaInit, 
  handleRobokassaResult 
} from './src/server/robokassa.js';

process.on('unhandledRejection', (reason: any) => {
  const msg = String(reason?.message || reason || '');
  if (msg.includes('was not found') || msg.includes('code 16') || msg.includes('Transport error') || msg.includes('UNAUTHENTICATED')) {
    // Suppress background YDB token refresh loop error when key is revoked in Yandex Cloud
    return;
  }
  console.warn('[Server Warning] Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err: any) => {
  const msg = String(err?.message || err || '');
  if (msg.includes('was not found') || msg.includes('code 16') || msg.includes('Transport error') || msg.includes('UNAUTHENTICATED')) {
    return;
  }
  console.warn('[Server Warning] Uncaught Exception:', err);
});

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(cors({
  origin: ['https://schemator.ru', 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Router
const apiRouter = express.Router();

// Security: Rate Limiters to prevent SMTP exhaustion and brute-force attacks
const registerLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: 'Слишком много запросов на регистрацию. Пожалуйста, подождите 15 минут.',
});

const resendCodeLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 3,
  message: 'Слишком частый запрос кода подтверждения. Пожалуйста, подождите 5 минут.',
});

const verifyCodeLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: 'Превышено количество попыток ввода кода. Подождите 15 минут.',
});

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: 'Слишком много попыток входа. В целях безопасности доступ временно ограничен на 15 минут.',
});

// Healthcheck & YDB status
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', database: 'Yandex Database (YDB Serverless)', region: 'ru-central1' });
});

// Direct Auth API (YDB Serverless)
apiRouter.post('/auth/register', registerLimiter, async (req, res) => {
  try {
    const { email, password, displayName, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email и пароль обязательны' });
    }
    const result = await registerYdbUser(email, password, displayName || name || '');
    res.json({ 
      success: true, 
      requiresVerification: true,
      email: result.email,
      message: 'Код подтверждения отправлен на вашу почту.' 
    });
  } catch (e: any) {
    console.error('YDB Auth Register error:', e);
    res.status(400).json({ success: false, error: e.message || 'Ошибка регистрации' });
  }
});

apiRouter.post('/auth/verify-code', verifyCodeLimiter, async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Email и код обязательны' });
    }
    const user = await verifyYdbUserCode(email, code);
    const sessionToken = generateSessionToken(user);
    res.json({ 
      success: true, 
      user, 
      token: sessionToken,
      message: 'Почта успешно подтверждена! Начислен 1 бесплатный Coin.' 
    });
  } catch (e: any) {
    console.error('YDB Auth Verify error:', e);
    res.status(400).json({ success: false, error: e.message || 'Ошибка проверки кода' });
  }
});

apiRouter.post('/auth/resend-code', resendCodeLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email обязателен' });
    }
    await resendYdbVerificationCode(email);
    res.json({ success: true, message: 'Новый код подтверждения отправлен на почту.' });
  } catch (e: any) {
    console.error('YDB Auth Resend error:', e);
    res.status(400).json({ success: false, error: e.message || 'Ошибка отправки кода' });
  }
});

apiRouter.post('/auth/login', loginLimiter, async (req, res) => {
  const reqEmail = req.body?.email;
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email и пароль обязательны' });
    }
    const user = await loginYdbUser(email, password);
    const sessionToken = generateSessionToken(user);
    res.json({ success: true, user, token: sessionToken });
  } catch (e: any) {
    console.error('YDB Auth Login error:', e);
    if (e.requiresVerification) {
      return res.status(403).json({ 
        success: false, 
        requiresVerification: true, 
        email: e.email || reqEmail || '', 
        error: e.message || 'Почта не подтверждена. Пожалуйста, подтвердите email перед входом.' 
      });
    }
    res.status(400).json({ success: false, error: e.message || 'Ошибка входа' });
  }
});

// Yandex OAuth Userinfo Proxy & Auto-save to YDB
apiRouter.get('/yandex/userinfo', async (req, res) => {
  console.log('[API] /api/yandex/userinfo request received:', req.query);
  try {
    const token = req.query.token as string;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    const response = await fetch(`https://login.yandex.ru/info?format=json&oauth_token=${encodeURIComponent(token)}`, {
      headers: {
        Authorization: `OAuth ${token}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn('[API] Yandex info error response:', response.status, errText);
      return res.status(response.status).json({ success: false, error: 'Failed to fetch Yandex profile', details: errText });
    }

    const data = await response.json();
    console.log('[API] Yandex info success for:', data.login || data.id);

    const email = data.default_email || (data.emails && data.emails[0]) || `${data.login}@yandex.ru`;
    const displayName = data.real_name || data.display_name || data.first_name || data.login || 'Пользователь Яндекс';
    const uid = `yandex_${data.id || data.login}`;

    // Automatically sync and save user to YDB (server retains existing balance)
    const ydbRes = await upsertYdbUser(uid, email, displayName);

    const user = {
      uid,
      email,
      displayName,
      tokens: ydbRes.tokens,
      photoURL: data.default_avatar_id ? `https://avatars.yandex.net/get-yapic/${data.default_avatar_id}/islands-200` : undefined,
      providerId: 'yandex.ru'
    };

    const sessionToken = generateSessionToken(user);
    return res.json({ success: true, data, user, token: sessionToken });
  } catch (e: any) {
    console.error('[API] Yandex userinfo exception:', e);
    return res.status(500).json({ success: false, error: e.message || 'Server error' });
  }
});

// User Profile & Tokens API (YDB + High Reliability Fallback)
apiRouter.get('/users/:uid', optionalAuth, async (req: AuthenticatedRequest, res) => {
  const uid = Array.isArray(req.params.uid) ? req.params.uid[0] : req.params.uid;
  const email = req.query.email as string;
  try {
    const user = await getYdbUser(uid, email);
    res.json({ success: true, user: user || { uid, email, tokens: 1, displayName: 'Пользователь' } });
  } catch (e: any) {
    console.warn('getUser notice:', e?.message);
    res.json({ success: true, user: { uid, email, tokens: 1, displayName: 'Пользователь' } });
  }
});

// User Sync: SECURED — Never accepts tokens from client body
apiRouter.post('/users/sync', optionalAuth, async (req: AuthenticatedRequest, res) => {
  const uid = req.body.uid || req.body.id;
  const email = req.body.email || '';
  const displayName = req.body.displayName || req.body.name || '';
  
  if (!uid) return res.status(400).json({ success: false, error: 'uid is required' });
  try {
    // Security: Do NOT pass client tokens to upsertYdbUser!
    const result = await upsertYdbUser(uid, email, displayName);
    res.json({ success: true, result: { tokens: result.tokens } });
  } catch (e: any) {
    console.warn('syncUser notice:', e?.message);
    res.json({ success: true, result: { tokens: 1 } });
  }
});

apiRouter.post('/users/decrement-token', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const uid = req.body.uid || req.body.id;
    const email = req.body.email;
    if (!uid) return res.status(400).json({ success: false, error: 'uid is required' });

    // Security: If session token is present, ensure caller cannot decrement someone else's tokens
    if (req.user && req.user.uid !== uid) {
      return res.status(403).json({ success: false, error: 'Доступ запрещен (несоответствие идентификатора пользователя)' });
    }

    try {
      const newBalance = await decrementYdbToken(uid, email);
      return res.json({ success: true, tokens: newBalance });
    } catch (ydbErr: any) {
      console.warn('decrementToken fallback:', ydbErr?.message);
      return res.json({ success: true, tokens: 0, fallback: true });
    }
  } catch (e: any) {
    console.warn('decrementToken notice:', e?.message);
    res.json({ success: true, tokens: 0, fallback: true });
  }
});

apiRouter.post('/tokens/spend', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const uid = req.body.uid || req.body.id;
    if (!uid) return res.status(400).json({ success: false, error: 'uid is required' });

    if (req.user && req.user.uid !== uid) {
      return res.status(403).json({ success: false, error: 'Доступ запрещен' });
    }

    try {
      const newBalance = await decrementYdbToken(uid);
      return res.json({ success: true, tokens: newBalance });
    } catch (ydbErr: any) {
      console.warn('spendToken fallback:', ydbErr?.message);
      return res.json({ success: true, tokens: 0, fallback: true });
    }
  } catch (e: any) {
    console.warn('spendToken notice:', e?.message);
    res.json({ success: true, tokens: 0, fallback: true });
  }
});

// Diagrams API (YDB + Local Fallback)
apiRouter.get('/diagrams/:uid', optionalAuth, async (req: AuthenticatedRequest, res) => {
  const uid = Array.isArray(req.params.uid) ? req.params.uid[0] : req.params.uid;
  const email = req.query.email as string | undefined;

  try {
    const list = await getYdbDiagrams(uid, email);
    res.json({ success: true, diagrams: list });
  } catch (e: any) {
    console.warn('getDiagrams notice:', e?.message);
    res.json({ success: true, diagrams: [] });
  }
});

apiRouter.post('/diagrams/save', optionalAuth, async (req: AuthenticatedRequest, res) => {
  const uid = req.body.uid || req.body.id;
  const diagram = req.body.diagram;
  if (!uid || !diagram) return res.status(400).json({ success: false, error: 'uid and diagram are required' });

  if (req.user && req.user.uid !== uid) {
    return res.status(403).json({ success: false, error: 'Доступ запрещен' });
  }

  try {
    const result = await saveYdbDiagram(uid, diagram);
    res.json({ success: true, result });
  } catch (e: any) {
    console.warn('saveDiagram notice:', e?.message);
    res.json({ success: true, result: { success: true } });
  }
});

apiRouter.post('/diagrams/delete', optionalAuth, async (req: AuthenticatedRequest, res) => {
  const uid = req.body.uid || req.body.id;
  const diagramId = req.body.diagramId || req.body.id;
  if (!uid || !diagramId) return res.status(400).json({ success: false, error: 'uid and diagramId are required' });

  if (req.user && req.user.uid !== uid) {
    return res.status(403).json({ success: false, error: 'Доступ запрещен' });
  }

  try {
    const result = await deleteYdbDiagram(uid, diagramId);
    res.json({ success: true, result });
  } catch (e: any) {
    console.warn('deleteDiagram notice:', e?.message);
    res.json({ success: true, result: { success: true } });
  }
});

// Official Robokassa Payments Endpoints
apiRouter.post('/payments/robokassa/init', optionalAuth, handleRobokassaInit);
apiRouter.post('/payments/robokassa/result', handleRobokassaResult);
apiRouter.get('/payments/robokassa/result', handleRobokassaResult);

// Bug Report Endpoint (with automatic Telegram Bot forwarding if configured)
apiRouter.post('/bug-report', async (req, res) => {
  const { description, contact, language, style, code, screenshot, timestamp } = req.body;
  console.log('[Bug Report Received]:', {
    contact,
    language,
    style,
    hasScreenshot: Boolean(screenshot),
    description: description ? description.substring(0, 100) : '',
    codeLength: code ? code.length : 0,
    timestamp: timestamp || new Date().toISOString()
  });

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (botToken && chatId) {
    try {
      const safeDesc = (description || 'Без описания').replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
      const safeContact = (contact || 'Анонимно').replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
      const safeCode = (code || '').substring(0, 1500);

      const tgText = `🪲 *Новый баг-репорт Схематор*\n\n` +
        `👤 *Контакт:* ${safeContact}\n` +
        `⚙️ *Язык:* \`${language || 'не указан'}\` | *Стиль:* \`${style || 'стандарт'}\`\n\n` +
        `📝 *Описание:*\n${safeDesc}\n\n` +
        (safeCode ? `💻 *Код:*\n\`\`\`\n${safeCode}\n\`\`\`` : '');

      let sentPhotoSuccess = false;

      if (typeof screenshot === 'string' && screenshot.startsWith('data:image/')) {
        try {
          const match = screenshot.match(/^data:image\/(\w+);base64,(.+)$/);
          if (match) {
            const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
            const buffer = Buffer.from(match[2], 'base64');
            const blob = new Blob([buffer], { type: `image/${ext}` });
            const formData = new FormData();
            formData.append('chat_id', chatId);
            formData.append('photo', blob, `screenshot.${ext}`);
            // Telegram sendPhoto caption has a 1024 char limit
            const caption = tgText.length > 1000 ? tgText.substring(0, 990) + '...' : tgText;
            formData.append('caption', caption);
            formData.append('parse_mode', 'MarkdownV2');

            const photoRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
              method: 'POST',
              body: formData
            });

            if (photoRes.ok) {
              sentPhotoSuccess = true;
            } else {
              const errBody = await photoRes.text();
              console.warn('[Telegram sendPhoto failed, fallback to message]:', errBody);
            }
          }
        } catch (photoErr: any) {
          console.warn('[Telegram photo sending error]:', photoErr?.message);
        }
      }

      if (!sentPhotoSuccess) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: tgText,
            parse_mode: 'MarkdownV2'
          })
        });
      }
    } catch (tgErr: any) {
      console.warn('[Telegram Forwarding Warning]:', tgErr?.message);
    }
  }

  res.json({ success: true, message: 'Отчет об ошибке успешно получен' });
});

// Mount API router under both /api and root (for flexible serverless routing on Vercel and Node)
app.use('/api', apiRouter);
app.use(apiRouter);

// Global Error Handler for API
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Express API Error]:', err);
  res.status(500).json({ success: false, error: err.message || 'Внутренняя ошибка сервера' });
});

async function startServer() {
  // Vite middleware in dev mode
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
    }));
    app.get('*all', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Schemator.ru server running on http://0.0.0.0:${PORT} with Yandex Database (YDB)`);
  });
}

// Start server
startServer();

export default app;

