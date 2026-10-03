import crypto from 'crypto';
import type { Request, Response } from 'express';
import { addYdbUserTokens, getYdbUser } from './ydb.js';

// Robokassa Tariffs Configuration
export const ROBOKASSA_PACKAGES: Record<string, { price: number; tokens: number; description: string }> = {
  '5_coins': {
    price: 149,
    tokens: 5,
    description: '5 схем — Тариф «Сдать лабу» в Схематор',
  },
  '35_coins': {
    price: 399,
    tokens: 35,
    description: '35 схем — Тариф «Семестр» в Схематор',
  },
  '50_coins': {
    price: 549,
    tokens: 50,
    description: '50 схем — Тариф «Курсач / Диплом» в Схематор',
  },
  // Backward compatibility alias keys:
  '10_coins': {
    price: 149,
    tokens: 5,
    description: '5 схем — Тариф «Сдать лабу» в Схематор',
  },
  '30_coins': {
    price: 399,
    tokens: 35,
    description: '35 схем — Тариф «Семестр» в Схематор',
  },
};

// Processed invoices cache for strict idempotency (prevents double crediting)
const processedInvoices = new Set<string>();

/**
 * Generates cryptographic signature for Robokassa protocol.
 * Default is sha256 (matches the modern Robokassa dashboard configuration).
 */
function getRobokassaHashAlgo(): string {
  const algo = (process.env.ROBOKASSA_HASH_ALGO || 'sha256').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (algo === 'md5') return 'md5';
  if (algo === 'sha1') return 'sha1';
  return 'sha256';
}

function generateRobokassaSignature(str: string, algo: string = getRobokassaHashAlgo()): string {
  return crypto.createHash(algo).update(str, 'utf-8').digest('hex');
}

/**
 * Initiates payment session with Robokassa.
 * Returns payment URL with cryptographic signature.
 */
export async function handleRobokassaInit(req: Request, res: Response) {
  const { uid, packageId, email } = req.body;

  if (!uid || !packageId) {
    return res.status(400).json({ success: false, error: 'Параметры uid и packageId обязательны' });
  }

  const pkg = ROBOKASSA_PACKAGES[packageId];
  if (!pkg) {
    return res.status(400).json({ success: false, error: 'Выбран неизвестный тариф' });
  }

  const merchantLogin = (process.env.ROBOKASSA_MERCHANT_LOGIN || '').trim();
  // Live mode when ROBOKASSA_IS_TEST is "0" or ROBOKASSA_LIVE is "1". Otherwise test mode.
  const isLive = process.env.ROBOKASSA_IS_TEST === '0' || process.env.ROBOKASSA_LIVE === '1';
  const isTest = !isLive;

  // In test mode, prefer test password #1 if provided, otherwise fallback to password 1
  const password1 = (
    isTest
      ? (process.env.ROBOKASSA_TEST_PASSWORD_1 || process.env.ROBOKASSA_PASSWORD_1 || '')
      : (process.env.ROBOKASSA_PASSWORD_1 || '')
  ).trim();

  // If merchant credentials are not yet configured in production:
  if (!merchantLogin || !password1) {
    return res.json({
      success: false,
      notConfigured: true,
      message: 'Прием платежей через Робокассу находится на этапе проверки Роскомнадзором. Оплата будет доступна сразу после одобрения.',
      package: pkg,
    });
  }

  // Generate numeric Invoice ID (Robokassa expects integer up to 2147483647)
  const invId = Math.floor(Date.now() / 1000) % 2000000000;
  const outSum = pkg.price.toFixed(2);
  const shpTokens = String(pkg.tokens);
  const shpUid = String(uid);

  // Canonical lowercase shp_ parameters according to Robokassa docs (ordered alphabetically)
  const signatureRaw = `${merchantLogin}:${outSum}:${invId}:${password1}:shp_tokens=${shpTokens}:shp_uid=${shpUid}`;
  const signature = generateRobokassaSignature(signatureRaw);

  const params = new URLSearchParams({
    MerchantLogin: merchantLogin,
    OutSum: outSum,
    InvId: String(invId),
    Description: pkg.description,
    SignatureValue: signature,
    shp_tokens: shpTokens,
    shp_uid: shpUid,
    Culture: 'ru',
    Encoding: 'utf-8',
  });

  if (email) {
    params.set('Email', email);
  }

  if (isTest) {
    params.set('IsTest', '1');
  }

  const paymentUrl = `https://auth.robokassa.ru/Merchant/Index.aspx?${params.toString()}`;

  console.log(`[Robokassa Init] MerchantLogin="${merchantLogin}", InvId=${invId}, OutSum=${outSum}, isTest=${isTest}`);

  return res.json({
    success: true,
    paymentUrl,
    invId,
    amount: pkg.price,
    tokens: pkg.tokens,
  });
}

/**
 * ResultURL Webhook from Robokassa.
 * Validates digital signature using Password #2 and safely credits tokens to user.
 */
export async function handleRobokassaResult(req: Request, res: Response) {
  try {
    const data = { ...req.query, ...req.body };
    const outSum = String(data.OutSum || '');
    const invId = String(data.InvId || '');
    const signatureValue = String(data.SignatureValue || '').toLowerCase();
    const shpUid = String(data.shp_uid || data.Shp_uid || '');
    const shpTokens = parseInt(String(data.shp_tokens || data.Shp_tokens || '0'), 10);

    const testPassword2 = (process.env.ROBOKASSA_TEST_PASSWORD_2 || '').trim();
    const livePassword2 = (process.env.ROBOKASSA_PASSWORD_2 || '').trim();
    const password2 = testPassword2 || livePassword2;

    if (!password2) {
      console.error('[Robokassa Webhook] ERROR: ROBOKASSA_PASSWORD_2 or ROBOKASSA_TEST_PASSWORD_2 is not set in environment!');
      return res.status(500).send('ERROR: Robokassa password #2 not set');
    }

    if (!outSum || !invId || !signatureValue || !shpUid || !shpTokens) {
      console.warn('[Robokassa Webhook] Invalid request parameters:', data);
      return res.status(400).send('ERROR: Missing required fields');
    }

    // Verify digital signature: OutSum:InvId:Password2:shp_tokens=...:shp_uid=...
    // Check with both lowercase shp_ and capitalized Shp_, and test sha256 + fallback algorithms
    const checkSig = (pass: string, isUpper: boolean, algo: string) => {
      const prefix = isUpper ? 'Shp_' : 'shp_';
      const raw = `${outSum}:${invId}:${pass}:${prefix}tokens=${shpTokens}:${prefix}uid=${shpUid}`;
      return generateRobokassaSignature(raw, algo).toLowerCase();
    };

    const candidatePasswords = Array.from(new Set([password2, livePassword2, testPassword2])).filter(Boolean);
    const candidateAlgos = ['sha256', 'md5', 'sha1'];

    const isSigValid = candidatePasswords.some((pass) =>
      candidateAlgos.some((algo) =>
        checkSig(pass, false, algo) === signatureValue ||
        checkSig(pass, true, algo) === signatureValue
      )
    );

    if (!isSigValid) {
      console.error(`[Robokassa Webhook] Invalid signature! Received: ${signatureValue}`);
      return res.status(400).send('ERROR: Invalid signature');
    }

    // Idempotency check: prevent duplicate credit if Robokassa retries webhook
    const idempotencyKey = `inv_${invId}`;
    if (processedInvoices.has(idempotencyKey)) {
      console.log(`[Robokassa Webhook] Invoice ${invId} already processed. Responding OK.`);
      return res.send(`OK${invId}`);
    }

    // Credit tokens in YDB / persistent storage
    const newTokens = await addYdbUserTokens(shpUid, shpTokens);
    processedInvoices.add(idempotencyKey);

    console.log(`[Robokassa Webhook] SUCCESS! Added ${shpTokens} tokens to user ${shpUid}. New balance: ${newTokens}`);

    // Robokassa strictly requires "OK<InvId>" response upon successful processing
    return res.send(`OK${invId}`);
  } catch (err: any) {
    console.error('[Robokassa Webhook Exception]:', err);
    return res.status(500).send('ERROR: Internal server error');
  }
}
