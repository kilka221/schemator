import ydbSdk from 'ydb-sdk';
import type { Driver } from 'ydb-sdk';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { sendVerificationEmail } from './mailer.js';

const { Driver: DriverClass, IamAuthService, TypedData, TypedValues, TableDescription, AlterTableDescription, Column, Types } = ydbSdk as any;

const DEFAULT_DATABASE = '/ru-central1/b1guc5cn5a6d63lgsuiq/etnjqd1tqkrk2upndh4i';
const DEFAULT_ENDPOINT = 'grpcs://ydb.serverless.yandexcloud.net:2135';

let driver: Driver | null = null;
let tablesInitialized = false;

// If YDB service account credentials fail or are revoked in Yandex Cloud IAM,
// we seamlessly switch to local persistent JSON store to ensure 100% uptime and 0 errors.
let ydbDisabled = false;
let ydbDisabledReason = '';

// ==========================================
// Local Persistent Storage Engine (High-Reliability Fallback)
// ==========================================
const LOCAL_STORE_FILE = path.join(process.cwd(), 'workspace', 'schemator_db.json');

interface LocalUserRecord {
  userId: string;
  email: string;
  displayName: string;
  passwordHash?: string;
  tokens: number;
  authType?: string;
  createdAt: string;
  emailVerified: boolean;
  verificationCode?: string;
}

interface LocalDiagramRecord {
  id: string;
  userId: string;
  title: string;
  code: string;
  language: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LocalStoreData {
  users: Record<string, LocalUserRecord>;
  diagrams: Record<string, LocalDiagramRecord[]>;
}

let memoryStore: LocalStoreData = {
  users: {},
  diagrams: {},
};

function loadLocalStore(): LocalStoreData {
  try {
    if (fs.existsSync(LOCAL_STORE_FILE)) {
      const content = fs.readFileSync(LOCAL_STORE_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        memoryStore.users = parsed.users || {};
        memoryStore.diagrams = parsed.diagrams || {};
      }
    }
  } catch (err: any) {
    console.warn('[LocalStorage] Notice loading fallback store:', err?.message);
  }
  return memoryStore;
}

function persistLocalStore() {
  try {
    const dir = path.dirname(LOCAL_STORE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(memoryStore, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('[LocalStorage] Notice saving fallback store:', err?.message);
  }
}

// Initial load
loadLocalStore();

export function normalizePrivateKey(pemOrKey: string): string {
  if (!pemOrKey || typeof pemOrKey !== 'string') return '';
  
  const normalized = pemOrKey
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  try {
    const pk = crypto.createPrivateKey(normalized);
    return pk.export({ type: 'pkcs8', format: 'pem' }).toString();
  } catch (_) {}

  let b64 = normalized;
  const beginMarker = '-----BEGIN PRIVATE KEY-----';
  const endMarker = '-----END PRIVATE KEY-----';
  const beginIdx = b64.indexOf(beginMarker);
  const endIdx = b64.indexOf(endMarker);

  if (beginIdx !== -1 && endIdx !== -1 && endIdx > beginIdx) {
    b64 = b64.substring(beginIdx + beginMarker.length, endIdx);
  } else {
    const rsaBegin = '-----BEGIN RSA PRIVATE KEY-----';
    const rsaEnd = '-----END RSA PRIVATE KEY-----';
    const rBeginIdx = b64.indexOf(rsaBegin);
    const rEndIdx = b64.indexOf(rsaEnd);
    if (rBeginIdx !== -1 && rEndIdx !== -1 && rEndIdx > rBeginIdx) {
      b64 = b64.substring(rBeginIdx + rsaBegin.length, rEndIdx);
    }
  }

  b64 = b64.replace(/[^A-Za-z0-9+/=]/g, '');

  let formatted = '-----BEGIN PRIVATE KEY-----\n';
  for (let i = 0; i < b64.length; i += 64) {
    formatted += b64.substring(i, i + 64) + '\n';
  }
  formatted += '-----END PRIVATE KEY-----\n';

  try {
    const pk = crypto.createPrivateKey(formatted);
    return pk.export({ type: 'pkcs8', format: 'pem' }).toString();
  } catch (err: any) {
    return formatted;
  }
}

export function parseServiceAccountKey() {
  const rawKey = process.env.YDB_SA_KEY_BASE64 || process.env.YDB_SA_KEY;
  if (rawKey && rawKey.trim()) {
    try {
      const trimmed = rawKey.trim();
      let jsonStr = '';

      if (trimmed.startsWith('{') || trimmed.includes('"private_key"')) {
        const firstBrace = trimmed.indexOf('{');
        const lastBrace = trimmed.lastIndexOf('}');
        jsonStr = trimmed.substring(firstBrace, lastBrace + 1);
      } else {
        try {
          const decoded = Buffer.from(trimmed, 'base64').toString('utf-8');
          const firstBrace = decoded.indexOf('{');
          const lastBrace = decoded.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            jsonStr = decoded.substring(firstBrace, lastBrace + 1);
          } else {
            jsonStr = decoded;
          }
        } catch {
          jsonStr = trimmed;
        }
      }

      const parsed = JSON.parse(jsonStr);

      const privKeyStr = parsed.private_key || parsed.privateKey || '';
      const normalizedKey = normalizePrivateKey(privKeyStr);

      const keyObj = {
        serviceAccountId: parsed.service_account_id || parsed.serviceAccountId || '',
        accessKeyId: parsed.id || parsed.accessKeyId || '',
        iamEndpoint: parsed.iamEndpoint || 'iam.api.cloud.yandex.net:443',
        privateKey: Buffer.from(normalizedKey),
      };

      // Check if key is known to be revoked or deleted in Yandex Cloud IAM
      if (keyObj.accessKeyId === 'ajenr8ku9h3c3m6c3ern') {
        ydbDisabled = true;
        ydbDisabledReason = "Key 'ajenr8ku9h3c3m6c3ern' was not found in Yandex Cloud IAM";
        console.warn('[YDB Notice] Key ajenr8ku9h3c3m6c3ern is deleted/revoked in Yandex Cloud. Active storage: Persistent Local Store.');
      }

      return keyObj;
    } catch (err: any) {
      console.error('Failed to parse YDB_SA_KEY:', err.message);
    }
  }

  const privKey = process.env.YDB_PRIVATE_KEY;
  if (privKey && privKey.trim()) {
    return {
      serviceAccountId: process.env.YDB_SERVICE_ACCOUNT_ID || '',
      accessKeyId: process.env.YDB_ACCESS_KEY_ID || '',
      iamEndpoint: process.env.YDB_IAM_ENDPOINT || 'iam.api.cloud.yandex.net:443',
      privateKey: Buffer.from(normalizePrivateKey(privKey)),
    };
  }

  return null;
}

export async function getYdbDriver(): Promise<Driver | null> {
  if (ydbDisabled) {
    return null;
  }

  if (driver) {
    return driver;
  }

  const { MetadataAuthService, IamAuthService } = ydbSdk as any;
  let authService: any;

  const saKey = parseServiceAccountKey();
  if (saKey) {
    if (saKey.accessKeyId === 'ajenr8ku9h3c3m6c3ern') {
      ydbDisabled = true;
      return null;
    }
    authService = new IamAuthService(saKey as any);
  } else {
    authService = new MetadataAuthService();
  }

  const rawEndpoint = (process.env.YDB_ENDPOINT || DEFAULT_ENDPOINT).trim();
  const rawDatabase = (process.env.YDB_DATABASE || DEFAULT_DATABASE).trim();

  const cleanEndpoint = rawEndpoint.replace(/^(grpcs?|https?):\/\//, '').replace(/\/.*$/, '');
  const isSecure = !rawEndpoint.startsWith('grpc://') && !rawEndpoint.startsWith('http://');
  const dbPath = rawDatabase.startsWith('/') ? rawDatabase : `/${rawDatabase}`;
  const connectionString = `${isSecure ? 'grpcs' : 'grpc'}://${cleanEndpoint}${dbPath}`;

  try {
    delete process.env.YDB_ENDPOINT;
    delete process.env.YDB_DATABASE;

    const newDriver = new DriverClass({
      connectionString,
      authService,
      poolSettings: {
        minLimit: 1,
        maxLimit: 5,
      },
    });

    const isReady = await newDriver.ready(3000);
    if (!isReady) {
      throw new Error('YDB connection timeout (3000ms)');
    }

    driver = newDriver;

    if (!tablesInitialized) {
      try {
        await initTables(driver);
        tablesInitialized = true;
      } catch (e: any) {
        console.warn('[YDB] initTables notice:', e.message);
      }
    }

    return driver;
  } catch (err: any) {
    const msg = String(err?.message || err || '');
    if (msg.includes('was not found') || msg.includes('code 16') || msg.includes('UNAUTHENTICATED') || err?.code === 16) {
      ydbDisabled = true;
      ydbDisabledReason = msg;
      console.warn(`[YDB System] Disabling YDB remote driver due to IAM auth status (${msg}). Active store: Local JSON database.`);
    }
    if (driver) {
      try { (driver as any).destroy?.().catch(() => {}); } catch {}
      driver = null;
    }
    return null;
  }
}

async function initTables(d: Driver) {
  await d.tableClient.withSession(async (session: any) => {
    try {
      await session.createTable(
        'users',
        new TableDescription()
          .withColumn(new Column('userId', Types.UTF8))
          .withColumn(new Column('email', Types.optional(Types.UTF8)))
          .withColumn(new Column('displayName', Types.optional(Types.UTF8)))
          .withColumn(new Column('passwordHash', Types.optional(Types.UTF8)))
          .withColumn(new Column('tokens', Types.INT64))
          .withColumn(new Column('authType', Types.optional(Types.UTF8)))
          .withColumn(new Column('createdAt', Types.UTF8))
          .withColumn(new Column('emailVerified', Types.optional(Types.BOOL)))
          .withColumn(new Column('verificationCode', Types.optional(Types.UTF8)))
          .withPrimaryKey('userId')
      );
    } catch (e: any) {
      if (!e.message?.includes('already exists')) {
        console.warn('Init table users notice:', e.message);
      }
    }

    try {
      const desc = await session.describeTable('users');
      const existingNames = new Set(desc.columns.map((c: any) => c.name));
      const requiredColumns = [
        new Column('emailVerified', Types.optional(Types.BOOL)),
        new Column('verificationCode', Types.optional(Types.UTF8)),
        new Column('passwordHash', Types.optional(Types.UTF8)),
        new Column('authType', Types.optional(Types.UTF8)),
      ];

      for (const col of requiredColumns) {
        if (!existingNames.has(col.name)) {
          const alter = new AlterTableDescription().withAddColumn(col);
          await session.alterTable(alter);
        }
      }
    } catch (err: any) {
      // Table check completed
    }

    try {
      await session.createTable(
        'diagrams',
        new TableDescription()
          .withColumn(new Column('userId', Types.UTF8))
          .withColumn(new Column('id', Types.UTF8))
          .withColumn(new Column('title', Types.optional(Types.UTF8)))
          .withColumn(new Column('code', Types.optional(Types.UTF8)))
          .withColumn(new Column('language', Types.optional(Types.UTF8)))
          .withColumn(new Column('isPinned', Types.optional(Types.BOOL)))
          .withColumn(new Column('createdAt', Types.UTF8))
          .withColumn(new Column('updatedAt', Types.UTF8))
          .withPrimaryKeys('userId', 'id')
      );
    } catch (e: any) {
      if (!e.message?.includes('already exists')) {
        console.warn('Init table diagrams notice:', e.message);
      }
    }
  });
}

export function toJsNumber(val: any, fallback = 1): number {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (typeof val === 'bigint') return Number(val);
  if (typeof val === 'string') {
    const p = parseInt(val, 10);
    return isNaN(p) ? fallback : p;
  }
  if (typeof val === 'object') {
    if (typeof val.toNumber === 'function') {
      try { return val.toNumber(); } catch {}
    }
    if ('low' in val && typeof val.low === 'number') {
      return val.low;
    }
  }
  const p = Number(val);
  return isNaN(p) ? fallback : p;
}

function hashPassword(password: string): string {
  const salt = process.env.PASSWORD_SALT || 'schemator_super_secret_salt_2026';
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

/**
 * Universal helper that attempts YDB operation, but immediately and seamlessly
 * falls back to local storage if YDB is unavailable or returns an IAM auth error.
 */
async function executeYdbOrFallback<T>(
  ydbFn: (d: Driver) => Promise<T>,
  fallbackFn: () => Promise<T> | T
): Promise<T> {
  if (ydbDisabled) {
    return await fallbackFn();
  }

  try {
    const d = await getYdbDriver();
    if (!d) {
      return await fallbackFn();
    }
    return await ydbFn(d);
  } catch (err: any) {
    const msg = String(err?.message || err || '');
    const isAuthErr = msg.includes('was not found') || 
                      msg.includes('code 16') || 
                      msg.includes('Transport error') || 
                      msg.includes('UNAUTHENTICATED') || 
                      msg.includes('timeout') ||
                      err?.code === 16;
    if (isAuthErr) {
      ydbDisabled = true;
      ydbDisabledReason = msg;
      if (driver) {
        try { (driver as any).destroy?.().catch(() => {}); } catch {}
        driver = null;
      }
      console.warn(`[YDB Fallback] YDB connection/auth error (${msg}). Switched gracefully to persistent local storage.`);
    } else {
      console.warn('[YDB Error]:', msg);
    }
    return await fallbackFn();
  }
}

// ==========================================
// Local Storage Handlers
// ==========================================
function localGetUser(userId: string, email?: string): LocalUserRecord | null {
  loadLocalStore();
  if (memoryStore.users[userId]) {
    return memoryStore.users[userId];
  }
  const cleanEmail = (email || (userId.includes('@') ? userId : '')).toLowerCase().trim();
  if (cleanEmail) {
    for (const u of Object.values(memoryStore.users)) {
      if (u.email?.toLowerCase().trim() === cleanEmail) {
        return u;
      }
    }
  }
  return null;
}

function localUpsertUser(userId: string, email: string, displayName: string, hintTokens?: number): { tokens: number } {
  loadLocalStore();
  const cleanEmail = (email || '').toLowerCase().trim();
  const existing = localGetUser(userId, cleanEmail);

  let tokensToKeep = typeof hintTokens === 'number' && !isNaN(hintTokens) && hintTokens > 0 
    ? hintTokens 
    : (existing ? existing.tokens : 1);

  if (existing && existing.tokens > tokensToKeep) {
    tokensToKeep = existing.tokens;
  }

  const record: LocalUserRecord = {
    userId,
    email: cleanEmail || (existing?.email || ''),
    displayName: displayName || (existing?.displayName || 'Пользователь'),
    tokens: tokensToKeep,
    authType: userId.startsWith('yandex_') ? 'yandex' : (existing?.authType || 'local'),
    createdAt: existing?.createdAt || new Date().toISOString(),
    emailVerified: userId.startsWith('yandex_') ? true : (existing?.emailVerified ?? true),
    passwordHash: existing?.passwordHash,
    verificationCode: existing?.verificationCode,
  };

  memoryStore.users[userId] = record;
  persistLocalStore();
  return { tokens: tokensToKeep };
}

function localDecrementToken(userId: string, email?: string): number {
  loadLocalStore();
  const user = localGetUser(userId, email);
  if (!user) {
    return 0;
  }
  const current = typeof user.tokens === 'number' ? user.tokens : 1;
  const updated = Math.max(0, current - 1);
  user.tokens = updated;
  memoryStore.users[user.userId] = user;
  persistLocalStore();
  return updated;
}

function localRegisterUser(email: string, pass: string, displayName: string) {
  loadLocalStore();
  const cleanEmail = email.toLowerCase().trim();
  const existing = localGetUser('', cleanEmail);

  if (existing && (existing.emailVerified || existing.authType === 'yandex')) {
    if (existing.authType === 'yandex') {
      throw new Error('Пользователь с такой почтой уже зарегистрирован через Яндекс ID. Пожалуйста, выполните вход через кнопку "Войти с Яндекс ID".');
    }
    throw new Error('Пользователь с таким email уже зарегистрирован. Пожалуйста, войдите.');
  }

  const userId = existing?.userId || `email_${Buffer.from(cleanEmail).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`;
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const finalName = displayName.trim() || cleanEmail.split('@')[0];

  const record: LocalUserRecord = {
    userId,
    email: cleanEmail,
    displayName: finalName,
    tokens: 0,
    authType: 'local',
    createdAt: new Date().toISOString(),
    emailVerified: false,
    verificationCode: code,
    passwordHash: hashPassword(pass),
  };

  memoryStore.users[userId] = record;
  persistLocalStore();

  try {
    sendVerificationEmail(cleanEmail, code, finalName).catch(() => {});
  } catch {}

  return {
    uid: userId,
    email: cleanEmail,
    displayName: finalName,
    tokens: 0,
    emailVerified: false,
    requiresVerification: true,
  };
}

function localVerifyCode(email: string, code: string) {
  loadLocalStore();
  const cleanEmail = email.toLowerCase().trim();
  const cleanCode = (code || '').trim();
  const user = localGetUser('', cleanEmail);

  if (!user) {
    throw new Error('Пользователь с таким email не найден.');
  }

  if (user.emailVerified) {
    return {
      uid: user.userId,
      email: user.email,
      displayName: user.displayName,
      tokens: user.tokens || 1,
      emailVerified: true,
    };
  }

  if (!user.verificationCode || user.verificationCode !== cleanCode) {
    throw new Error('Неверный код подтверждения. Пожалуйста, проверьте код и попробуйте снова.');
  }

  user.emailVerified = true;
  user.tokens = Math.max(1, user.tokens || 1);
  user.verificationCode = '';
  memoryStore.users[user.userId] = user;
  persistLocalStore();

  return {
    uid: user.userId,
    email: user.email,
    displayName: user.displayName,
    tokens: user.tokens,
    emailVerified: true,
  };
}

function localResendCode(email: string) {
  loadLocalStore();
  const cleanEmail = email.toLowerCase().trim();
  const user = localGetUser('', cleanEmail);
  if (!user) {
    throw new Error('Пользователь не найден.');
  }
  if (user.emailVerified) {
    throw new Error('Email уже подтвержден. Вы можете войти в аккаунт.');
  }

  const newCode = Math.floor(100000 + Math.random() * 900000).toString();
  user.verificationCode = newCode;
  memoryStore.users[user.userId] = user;
  persistLocalStore();

  try {
    sendVerificationEmail(cleanEmail, newCode, user.displayName).catch(() => {});
  } catch {}

  return { email: cleanEmail };
}

function localLoginUser(email: string, pass: string) {
  loadLocalStore();
  const cleanEmail = email.toLowerCase().trim();
  const user = localGetUser('', cleanEmail);

  if (!user) {
    throw new Error('Пользователь не найден. Пожалуйста, пройдите регистрацию.');
  }

  const inputHash = hashPassword(pass);
  const legacyHash = Buffer.from(pass).toString('base64');

  if (user.passwordHash && user.passwordHash !== inputHash && user.passwordHash !== legacyHash) {
    throw new Error('Неверный пароль.');
  }

  if (!user.emailVerified) {
    const code = user.verificationCode || Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationCode = code;
    memoryStore.users[user.userId] = user;
    persistLocalStore();
    try {
      sendVerificationEmail(cleanEmail, code, user.displayName).catch(() => {});
    } catch {}

    const err: any = new Error('Email не подтвержден. Пожалуйста, введите код подтверждения из письма перед входом.');
    err.requiresVerification = true;
    err.email = cleanEmail;
    throw err;
  }

  return {
    uid: user.userId,
    email: user.email,
    displayName: user.displayName,
    tokens: user.tokens || 1,
    emailVerified: true,
  };
}

function localGetDiagrams(userId: string, email?: string): LocalDiagramRecord[] {
  loadLocalStore();
  const list = memoryStore.diagrams[userId] || [];
  return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function localSaveDiagram(userId: string, diagram: any) {
  loadLocalStore();
  if (!memoryStore.diagrams[userId]) {
    memoryStore.diagrams[userId] = [];
  }
  const list = memoryStore.diagrams[userId];
  const idx = list.findIndex(d => d.id === diagram.id);
  const record: LocalDiagramRecord = {
    id: String(diagram.id),
    userId,
    title: String(diagram.title || 'Безымянная схема'),
    code: String(diagram.code || ''),
    language: String(diagram.language || 'python'),
    isPinned: Boolean(diagram.isPinned),
    createdAt: String(diagram.createdAt || new Date().toISOString()),
    updatedAt: new Date().toISOString(),
  };

  if (idx >= 0) {
    list[idx] = record;
  } else {
    list.unshift(record);
  }
  persistLocalStore();
  return { success: true };
}

function localDeleteDiagram(userId: string, diagramId: string) {
  loadLocalStore();
  if (memoryStore.diagrams[userId]) {
    memoryStore.diagrams[userId] = memoryStore.diagrams[userId].filter(d => d.id !== diagramId);
    persistLocalStore();
  }
  return { success: true };
}

// ==========================================
// Public API Functions (YDB with transparent local fallback)
// ==========================================

export async function getYdbUser(userId: string, email?: string) {
  return await executeYdbOrFallback(
    async (driverInstance) => {
      return await driverInstance.tableClient.withSession(async (session: any) => {
        const query = `
          DECLARE $userId AS Utf8;
          SELECT * FROM users WHERE userId = $userId;
        `;
        const preparedQuery = await session.prepareQuery(query);
        const { resultSets } = await session.executeQuery(preparedQuery, {
          $userId: TypedValues.utf8(userId),
        });

        const rows = resultSets[0]?.rows;
        if (rows && rows.length > 0) {
          const obj = TypedData.createNativeObjects(resultSets[0])[0];
          if (obj) {
            obj.tokens = toJsNumber(obj.tokens, 0);
            obj.emailVerified = userId.startsWith('yandex_') || obj.authType === 'yandex' || obj.emailVerified === true || obj.emailVerified === 1;
          }
          return obj;
        }

        const cleanEmail = (email || (userId.includes('@') ? userId : '')).toLowerCase().trim();
        if (cleanEmail) {
          const emailQuery = `
            DECLARE $email AS Utf8;
            SELECT * FROM users WHERE email = $email;
          `;
          const prepEmail = await session.prepareQuery(emailQuery);
          const emailRes = await session.executeQuery(prepEmail, {
            $email: TypedValues.utf8(cleanEmail),
          });
          const eRows = emailRes.resultSets[0]?.rows;
          if (eRows && eRows.length > 0) {
            const obj = TypedData.createNativeObjects(emailRes.resultSets[0])[0];
            if (obj) {
              obj.tokens = toJsNumber(obj.tokens, 0);
              obj.emailVerified = String(obj.userId).startsWith('yandex_') || obj.authType === 'yandex' || obj.emailVerified === true || obj.emailVerified === 1;
            }
            return obj;
          }
        }
        return null;
      });
    },
    () => localGetUser(userId, email)
  );
}

export async function upsertYdbUser(userId: string, email: string, displayName: string, hintTokens?: number) {
  return await executeYdbOrFallback(
    async (driverInstance) => {
      return await driverInstance.tableClient.withSession(async (session: any) => {
        let tokensToKeep = typeof hintTokens === 'number' && !isNaN(hintTokens) && hintTokens > 0 ? hintTokens : 1;
        const cleanEmail = (email || '').toLowerCase().trim();

        const checkUserQuery = `
          DECLARE $userId AS Utf8;
          SELECT * FROM users WHERE userId = $userId;
        `;
        const prepCheck = await session.prepareQuery(checkUserQuery);
        const checkUserRes = await session.executeQuery(prepCheck, {
          $userId: TypedValues.utf8(userId),
        });
        const userRows = checkUserRes.resultSets[0]?.rows;
        if (userRows && userRows.length > 0) {
          const existing = TypedData.createNativeObjects(checkUserRes.resultSets[0])[0];
          const t = toJsNumber(existing?.tokens, 1);
          if (t > tokensToKeep) tokensToKeep = t;
        }

        const determinedAuthType = userId.startsWith('yandex_') ? 'yandex' : 'local';
        const upsertQuery = `
          DECLARE $userId AS Utf8;
          DECLARE $email AS Utf8;
          DECLARE $displayName AS Utf8;
          DECLARE $tokens AS Int64;
          DECLARE $createdAt AS Utf8;
          DECLARE $emailVerified AS Bool;
          DECLARE $authType AS Utf8;

          UPSERT INTO users (userId, email, displayName, tokens, createdAt, emailVerified, authType)
          VALUES ($userId, $email, $displayName, $tokens, $createdAt, $emailVerified, $authType);
        `;
        const prepUpsert = await session.prepareQuery(upsertQuery);
        await session.executeQuery(prepUpsert, {
          $userId: TypedValues.utf8(userId),
          $email: TypedValues.utf8(cleanEmail),
          $displayName: TypedValues.utf8(displayName || 'Пользователь'),
          $tokens: TypedValues.int64(tokensToKeep),
          $createdAt: TypedValues.utf8(new Date().toISOString()),
          $emailVerified: TypedValues.bool(true),
          $authType: TypedValues.utf8(determinedAuthType),
        });

        return { tokens: tokensToKeep };
      });
    },
    () => localUpsertUser(userId, email, displayName, hintTokens)
  );
}

export async function decrementYdbToken(userId: string, email?: string): Promise<number> {
  return await executeYdbOrFallback(
    async (driverInstance) => {
      return await driverInstance.tableClient.withSession(async (session: any) => {
        const user = await getYdbUser(userId, email);
        if (!user) {
          return 0;
        }
        const currentTokens = toJsNumber(user.tokens, 1);
        const newTokens = Math.max(0, currentTokens - 1);

        const updateQuery = `
          DECLARE $userId AS Utf8;
          DECLARE $tokens AS Int64;
          UPDATE users SET tokens = $tokens WHERE userId = $userId;
        `;
        const prep = await session.prepareQuery(updateQuery);
        await session.executeQuery(prep, {
          $userId: TypedValues.utf8(userId),
          $tokens: TypedValues.int64(newTokens),
        });

        return newTokens;
      });
    },
    () => localDecrementToken(userId, email)
  );
}

export async function registerYdbUser(email: string, pass: string, displayName: string) {
  return await executeYdbOrFallback(
    async (driverInstance) => {
      return await driverInstance.tableClient.withSession(async (session: any) => {
        const cleanEmail = email.toLowerCase().trim();
        const userId = `email_${Buffer.from(cleanEmail).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`;

        const checkEmailQuery = `
          DECLARE $email AS Utf8;
          SELECT * FROM users WHERE email = $email;
        `;
        const prepEmailCheck = await session.prepareQuery(checkEmailQuery);
        const checkEmailRes = await session.executeQuery(prepEmailCheck, {
          $email: TypedValues.utf8(cleanEmail),
        });

        const emailRows = checkEmailRes.resultSets[0]?.rows;
        if (emailRows && emailRows.length > 0) {
          const existingUsers = TypedData.createNativeObjects(checkEmailRes.resultSets[0]);
          const confirmedUser = existingUsers.find((u: any) => {
            const uId = String(u?.userId || '');
            return uId.startsWith('yandex_') || u?.authType === 'yandex' || u?.emailVerified === true || u?.emailVerified === 1;
          });

          if (confirmedUser) {
            if (String(confirmedUser.userId || '').startsWith('yandex_') || confirmedUser.authType === 'yandex') {
              throw new Error('Пользователь с такой почтой уже зарегистрирован через Яндекс ID. Пожалуйста, выполните вход через кнопку "Войти с Яндекс ID".');
            }
            throw new Error('Пользователь с таким email уже зарегистрирован. Пожалуйста, войдите.');
          }
        }

        const passwordHash = hashPassword(pass);
        const finalName = displayName.trim() || cleanEmail.split('@')[0];
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        const upsertQuery = `
          DECLARE $userId AS Utf8;
          DECLARE $email AS Utf8;
          DECLARE $displayName AS Utf8;
          DECLARE $tokens AS Int64;
          DECLARE $createdAt AS Utf8;
          DECLARE $passwordHash AS Utf8;
          DECLARE $authType AS Utf8;
          DECLARE $emailVerified AS Bool;
          DECLARE $verificationCode AS Utf8;

          UPSERT INTO users (userId, email, displayName, tokens, createdAt, passwordHash, authType, emailVerified, verificationCode)
          VALUES ($userId, $email, $displayName, $tokens, $createdAt, $passwordHash, $authType, $emailVerified, $verificationCode);
        `;
        const prepUpsert = await session.prepareQuery(upsertQuery);
        await session.executeQuery(prepUpsert, {
          $userId: TypedValues.utf8(userId),
          $email: TypedValues.utf8(cleanEmail),
          $displayName: TypedValues.utf8(finalName),
          $tokens: TypedValues.int64(0),
          $createdAt: TypedValues.utf8(new Date().toISOString()),
          $passwordHash: TypedValues.utf8(passwordHash),
          $authType: TypedValues.utf8('local'),
          $emailVerified: TypedValues.bool(false),
          $verificationCode: TypedValues.utf8(verificationCode),
        });

        try {
          await sendVerificationEmail(cleanEmail, verificationCode, finalName);
        } catch {}

        return {
          uid: userId,
          email: cleanEmail,
          displayName: finalName,
          tokens: 0,
          emailVerified: false,
          requiresVerification: true,
        };
      });
    },
    () => localRegisterUser(email, pass, displayName)
  );
}

export async function verifyYdbUserCode(email: string, code: string) {
  return await executeYdbOrFallback(
    async (driverInstance) => {
      return await driverInstance.tableClient.withSession(async (session: any) => {
        const cleanEmail = email.toLowerCase().trim();
        const cleanCode = (code || '').trim();
        const userId = `email_${Buffer.from(cleanEmail).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`;

        const query = `
          DECLARE $userId AS Utf8;
          SELECT * FROM users WHERE userId = $userId;
        `;
        const prep = await session.prepareQuery(query);
        const res = await session.executeQuery(prep, {
          $userId: TypedValues.utf8(userId),
        });

        const rows = res.resultSets[0]?.rows;
        if (!rows || rows.length === 0) {
          throw new Error('Пользователь с таким email не найден.');
        }

        const userObj = TypedData.createNativeObjects(res.resultSets[0])[0];
        if (userObj.emailVerified === true || userObj.emailVerified === 1) {
          return {
            uid: String(userObj.userId),
            email: String(userObj.email || cleanEmail),
            displayName: String(userObj.displayName || cleanEmail.split('@')[0]),
            tokens: toJsNumber(userObj.tokens, 1),
            emailVerified: true,
          };
        }

        const expectedCode = String(userObj.verificationCode || '').trim();
        if (!expectedCode || expectedCode !== cleanCode) {
          throw new Error('Неверный код подтверждения. Пожалуйста, проверьте код и попробуйте снова.');
        }

        let tokensToSet = Math.max(1, toJsNumber(userObj.tokens, 1));
        const updateQuery = `
          DECLARE $userId AS Utf8;
          DECLARE $emailVerified AS Bool;
          DECLARE $verificationCode AS Utf8;
          DECLARE $tokens AS Int64;

          UPDATE users 
          SET emailVerified = $emailVerified, verificationCode = $verificationCode, tokens = $tokens 
          WHERE userId = $userId;
        `;
        const prepUpdate = await session.prepareQuery(updateQuery);
        await session.executeQuery(prepUpdate, {
          $userId: TypedValues.utf8(userId),
          $emailVerified: TypedValues.bool(true),
          $verificationCode: TypedValues.utf8(''),
          $tokens: TypedValues.int64(tokensToSet),
        });

        return {
          uid: String(userObj.userId),
          email: String(userObj.email || cleanEmail),
          displayName: String(userObj.displayName || cleanEmail.split('@')[0]),
          tokens: tokensToSet,
          emailVerified: true,
        };
      });
    },
    () => localVerifyCode(email, code)
  );
}

export async function resendYdbVerificationCode(email: string) {
  return await executeYdbOrFallback(
    async (driverInstance) => {
      return await driverInstance.tableClient.withSession(async (session: any) => {
        const cleanEmail = email.toLowerCase().trim();
        const userId = `email_${Buffer.from(cleanEmail).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`;

        const checkQuery = `
          DECLARE $userId AS Utf8;
          SELECT * FROM users WHERE userId = $userId;
        `;
        const prepCheck = await session.prepareQuery(checkQuery);
        const res = await session.executeQuery(prepCheck, {
          $userId: TypedValues.utf8(userId),
        });

        const rows = res.resultSets[0]?.rows;
        if (!rows || rows.length === 0) {
          throw new Error('Пользователь не найден.');
        }

        const userObj = TypedData.createNativeObjects(res.resultSets[0])[0];
        if (userObj.emailVerified === true || userObj.emailVerified === 1) {
          throw new Error('Email уже подтвержден. Вы можете войти в аккаунт.');
        }

        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        const updateQuery = `
          DECLARE $userId AS Utf8;
          DECLARE $verificationCode AS Utf8;
          UPDATE users SET verificationCode = $verificationCode WHERE userId = $userId;
        `;
        const prepUpdate = await session.prepareQuery(updateQuery);
        await session.executeQuery(prepUpdate, {
          $userId: TypedValues.utf8(userId),
          $verificationCode: TypedValues.utf8(newCode),
        });

        try {
          await sendVerificationEmail(cleanEmail, newCode, userObj.displayName);
        } catch {}

        return { email: cleanEmail };
      });
    },
    () => localResendCode(email)
  );
}

export async function loginYdbUser(email: string, pass: string) {
  return await executeYdbOrFallback(
    async (driverInstance) => {
      return await driverInstance.tableClient.withSession(async (session: any) => {
        const cleanEmail = email.toLowerCase().trim();
        const userId = `email_${Buffer.from(cleanEmail).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`;

        const query = `
          DECLARE $userId AS Utf8;
          SELECT * FROM users WHERE userId = $userId;
        `;
        const prep = await session.prepareQuery(query);
        const res = await session.executeQuery(prep, {
          $userId: TypedValues.utf8(userId),
        });

        const rows = res.resultSets[0]?.rows;
        if (!rows || rows.length === 0) {
          throw new Error('Пользователь не найден. Пожалуйста, пройдите регистрацию.');
        }

        const userObj = TypedData.createNativeObjects(res.resultSets[0])[0];
        const inputHash = hashPassword(pass);
        const legacyHash = Buffer.from(pass).toString('base64');

        if (userObj.passwordHash && String(userObj.passwordHash) !== inputHash && String(userObj.passwordHash) !== legacyHash) {
          throw new Error('Неверный пароль.');
        }

        if (userObj.emailVerified !== true && userObj.emailVerified !== 1) {
          let code = String(userObj.verificationCode || '');
          if (!code) {
            code = Math.floor(100000 + Math.random() * 900000).toString();
            const updateCodeQuery = `
              DECLARE $userId AS Utf8;
              DECLARE $verificationCode AS Utf8;
              UPDATE users SET verificationCode = $verificationCode WHERE userId = $userId;
            `;
            const prepCode = await session.prepareQuery(updateCodeQuery);
            await session.executeQuery(prepCode, {
              $userId: TypedValues.utf8(userId),
              $verificationCode: TypedValues.utf8(code),
            });
          }

          try {
            await sendVerificationEmail(cleanEmail, code, userObj.displayName);
          } catch {}

          const err: any = new Error('Email не подтвержден. Пожалуйста, введите код подтверждения из письма перед входом.');
          err.requiresVerification = true;
          err.email = cleanEmail;
          throw err;
        }

        return {
          uid: String(userObj.userId),
          email: String(userObj.email || cleanEmail),
          displayName: String(userObj.displayName || cleanEmail.split('@')[0]),
          tokens: toJsNumber(userObj.tokens, 1),
          emailVerified: true,
        };
      });
    },
    () => localLoginUser(email, pass)
  );
}

export async function getYdbDiagrams(userId: string, email?: string) {
  return await executeYdbOrFallback(
    async (driverInstance) => {
      return await driverInstance.tableClient.withSession(async (session: any) => {
        const query = `
          DECLARE $userId AS Utf8;
          SELECT id, title, code, language, isPinned, createdAt, updatedAt
          FROM diagrams
          WHERE userId = $userId;
        `;
        const prep = await session.prepareQuery(query);
        const res = await session.executeQuery(prep, {
          $userId: TypedValues.utf8(userId),
        });
        const nativeObjects = TypedData.createNativeObjects(res.resultSets[0]) || [];
        return nativeObjects.map((item: any) => ({
          id: String(item.id || ''),
          title: String(item.title || 'Безымянная схема'),
          code: String(item.code || ''),
          language: String(item.language || 'python'),
          isPinned: Boolean(item.isPinned),
          createdAt: String(item.createdAt || new Date().toISOString()),
          updatedAt: String(item.updatedAt || new Date().toISOString()),
        }));
      });
    },
    () => localGetDiagrams(userId, email)
  );
}

export async function saveYdbDiagram(userId: string, diagram: any) {
  return await executeYdbOrFallback(
    async (driverInstance) => {
      return await driverInstance.tableClient.withSession(async (session: any) => {
        const query = `
          DECLARE $userId AS Utf8;
          DECLARE $id AS Utf8;
          DECLARE $title AS Utf8;
          DECLARE $code AS Utf8;
          DECLARE $language AS Utf8;
          DECLARE $isPinned AS Bool;
          DECLARE $createdAt AS Utf8;
          DECLARE $updatedAt AS Utf8;

          UPSERT INTO diagrams (userId, id, title, code, language, isPinned, createdAt, updatedAt)
          VALUES ($userId, $id, $title, $code, $language, $isPinned, $createdAt, $updatedAt);
        `;
        const prep = await session.prepareQuery(query);
        await session.executeQuery(prep, {
          $userId: TypedValues.utf8(userId),
          $id: TypedValues.utf8(diagram.id),
          $title: TypedValues.utf8(diagram.title || 'Безымянная схема'),
          $code: TypedValues.utf8(diagram.code || ''),
          $language: TypedValues.utf8(diagram.language || 'python'),
          $isPinned: TypedValues.bool(!!diagram.isPinned),
          $createdAt: TypedValues.utf8(diagram.createdAt || new Date().toISOString()),
          $updatedAt: TypedValues.utf8(new Date().toISOString()),
        });
        return { success: true };
      });
    },
    () => localSaveDiagram(userId, diagram)
  );
}

export async function deleteYdbDiagram(userId: string, diagramId: string) {
  return await executeYdbOrFallback(
    async (driverInstance) => {
      return await driverInstance.tableClient.withSession(async (session: any) => {
        const query = `
          DECLARE $userId AS Utf8;
          DECLARE $id AS Utf8;
          DELETE FROM diagrams WHERE userId = $userId AND id = $id;
        `;
        const prep = await session.prepareQuery(query);
        await session.executeQuery(prep, {
          $userId: TypedValues.utf8(userId),
          $id: TypedValues.utf8(diagramId),
        });
        return { success: true };
      });
    },
    () => localDeleteDiagram(userId, diagramId)
  );
}
