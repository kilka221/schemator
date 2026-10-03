import crypto from 'crypto';
import type { Request, Response } from 'express';
import { addYdbUserTokens, getYdbUser } from './ydb.js';

// Robokassa Tariffs Configuration
export const ROBOKASSA_PACKAGES: Record<string, { price: number; tokens: number; description: string }> = {
  '5_coins': {
    price: 149,
    tokens: 5,
    description: '5 Coins — Тариф «Сдать лабу» в Схематор',
  },
  '35_coins': {
    price: 399,
    tokens: 35,
    description: '35 Coins — Тариф «Семестр» в Схематор',
  },
  '50_coins': {
    price: 549,
    tokens: 50,
    description: '50 Coins — Тариф «Курсач / Диплом» в Схематор',
  },
  // Backward compatibility alias keys:
  '10_coins': {
    price: 149,
    tokens: 5,
    description: '5 Coins — Тариф «Сдать лабу» в Схематор',
  },
  '30_coins': {
    price: 399,
    tokens: 35,
    description: '35 Coins — Тариф «Семестр» в Схематор',
  },
};

// Processed invoices cache for strict idempotency (prevents double crediting)
const processedInvoices = new Set<string>();

/**
 * Generates MD5 signature for Robokassa protocol
 */
function generateRobokassaSignature(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex');
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

  const merchantLogin = process.env.ROBOKASSA_MERCHANT_LOGIN || '';
  const password1 = process.env.ROBOKASSA_PASSWORD_1 || '';
  const isTest = process.env.ROBOKASSA_IS_TEST === '1';

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

  // Robokassa signature string format for Payment Link:
  // MerchantLogin:OutSum:InvId:Password1:Shp_tokens=...:Shp_uid=... (custom params ordered alphabetically)
  const signatureRaw = `${merchantLogin}:${outSum}:${invId}:${password1}:Shp_tokens=${shpTokens}:Shp_uid=${shpUid}`;
  const signature = generateRobokassaSignature(signatureRaw);

  const params = new URLSearchParams({
    MerchantLogin: merchantLogin,
    OutSum: outSum,
    InvId: String(invId),
    Description: pkg.description,
    SignatureValue: signature,
    Shp_tokens: shpTokens,
    Shp_uid: shpUid,
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
    const shpUid = String(data.Shp_uid || '');
    const shpTokens = parseInt(String(data.Shp_tokens || '0'), 10);

    const password2 = process.env.ROBOKASSA_PASSWORD_2 || '';

    if (!password2) {
      console.error('[Robokassa Webhook] ERROR: ROBOKASSA_PASSWORD_2 is not set in environment!');
      return res.status(500).send('ERROR: Robokassa password #2 not set');
    }

    if (!outSum || !invId || !signatureValue || !shpUid || !shpTokens) {
      console.warn('[Robokassa Webhook] Invalid request parameters:', data);
      return res.status(400).send('ERROR: Missing required fields');
    }

    // Verify digital signature: OutSum:InvId:Password2:Shp_tokens=...:Shp_uid=...
    const expectedRaw = `${outSum}:${invId}:${password2}:Shp_tokens=${shpTokens}:Shp_uid=${shpUid}`;
    const expectedSig = generateRobokassaSignature(expectedRaw).toLowerCase();

    if (signatureValue !== expectedSig) {
      console.error(`[Robokassa Webhook] Invalid signature! Received: ${signatureValue}, Expected: ${expectedSig}`);
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
