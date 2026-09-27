import type { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

/**
 * Lightweight, zero-dependency sliding window rate limiter for Express.
 * Protects against SMTP exhaustion, password brute forcing, and API DDoS.
 */
export function createRateLimiter(options: RateLimitOptions) {
  const store = new Map<string, RateLimitRecord>();

  // Cleanup expired buckets every minute to keep memory low
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (record.resetAt <= now) {
        store.delete(key);
      }
    }
  }, 60 * 1000).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    let clientKey = '';

    if (options.keyGenerator) {
      clientKey = options.keyGenerator(req);
    } else {
      // Extract IP through proxies (like nginx or Cloudflare)
      const forwarded = req.headers['x-forwarded-for'];
      const ip = typeof forwarded === 'string' 
        ? forwarded.split(',')[0].trim() 
        : req.socket.remoteAddress || '127.0.0.1';
      clientKey = ip;
    }

    const record = store.get(clientKey);

    if (!record || record.resetAt <= now) {
      store.set(clientKey, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      return next();
    }

    if (record.count >= options.maxRequests) {
      const waitSeconds = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', waitSeconds);
      return res.status(429).json({
        success: false,
        error: options.message || `Слишком много запросов. Пожалуйста, подождите ${waitSeconds} сек.`,
        retryAfterSeconds: waitSeconds,
      });
    }

    record.count += 1;
    next();
  };
}
