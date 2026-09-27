import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.SESSION_SECRET || process.env.PASSWORD_SALT || 'schemator_secure_session_secret_2026_go_live';
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface SessionPayload {
  uid: string;
  email: string;
  displayName?: string;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: SessionPayload;
}

/**
 * Creates a cryptographically signed HMAC-SHA256 session token.
 * Format: base64(payload).base64(hmac_signature)
 */
export function generateSessionToken(user: { uid: string; email: string; displayName?: string }): string {
  const payload: SessionPayload = {
    uid: user.uid,
    email: (user.email || '').toLowerCase().trim(),
    displayName: user.displayName || '',
    exp: Date.now() + TOKEN_TTL_MS,
  };

  const payloadStr = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadStr, 'utf-8').toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

/**
 * Verifies the HMAC-SHA256 session token. Returns null if invalid or expired.
 */
export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;
  try {
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(payloadB64).digest('base64url');
    // Timing-safe comparison to prevent timing attacks
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const jsonStr = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const payload = JSON.parse(jsonStr) as SessionPayload;

    if (!payload.uid || !payload.exp || payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Express Middleware: Requires valid authentication token.
 * Accepts header "Authorization: Bearer <token>" or "x-session-token: <token>".
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || (req.headers['x-session-token'] as string);
  let token = '';

  if (typeof authHeader === 'string') {
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else {
      token = authHeader.trim();
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Требуется авторизация (отсутствует токен сессии)' });
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    return res.status(401).json({ success: false, error: 'Сессия истекла или недействительна. Пожалуйста, войдите снова.' });
  }

  req.user = payload;
  next();
}

/**
 * Express Middleware: Optional authentication token (attaches user if valid, continues if not).
 */
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || (req.headers['x-session-token'] as string);
  let token = '';

  if (typeof authHeader === 'string') {
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else {
      token = authHeader.trim();
    }
  }

  if (token) {
    const payload = verifySessionToken(token);
    if (payload) {
      req.user = payload;
    }
  }

  next();
}
