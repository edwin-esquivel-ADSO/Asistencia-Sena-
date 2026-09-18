/**
 * In-Memory Rate Limiter for Next.js Route Handlers
 * Limits requests per key (e.g., IP address or document) within a time window.
 */

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const tracker = new Map<string, RateLimitStore>();

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of tracker.entries()) {
    if (now > record.resetTime) {
      tracker.delete(key);
    }
  }
}, 60000);

export function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000
): { success: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = tracker.get(identifier);

  if (!record || now > record.resetTime) {
    const newRecord: RateLimitStore = {
      count: 1,
      resetTime: now + windowMs,
    };
    tracker.set(identifier, newRecord);
    return { success: true, remaining: limit - 1, resetTime: newRecord.resetTime };
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count += 1;
  return { success: true, remaining: limit - record.count, resetTime: record.resetTime };
}
