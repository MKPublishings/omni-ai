/**
 * @module Rate Limit Middleware
 * @spec: ion-router-v2
 * 
 * KV-based sliding window rate limiter.
 * Tracks requests per session/IP and enforces configured limits.
 */

export interface RateLimitConfig {
  path: string;
  maxRequests: number;
  windowSeconds: number;
}

const DEFAULT_LIMITS: RateLimitConfig[] = [
  // Memory API
  { path: '/api/memory', maxRequests: 30, windowSeconds: 60 },
  { path: '/api/memory/:id', maxRequests: 60, windowSeconds: 60 },
  // Tools API
  { path: '/api/tools/execute', maxRequests: 20, windowSeconds: 60 },
  { path: '/api/tools', maxRequests: 60, windowSeconds: 60 },
  // Specs API
  { path: '/api/specs', maxRequests: 60, windowSeconds: 60 },
  { path: '/api/specs/search', maxRequests: 30, windowSeconds: 60 },
  // Simulation API
  { path: '/api/simulation/init', maxRequests: 5, windowSeconds: 60 },
  { path: '/api/simulation/step', maxRequests: 60, windowSeconds: 60 },
  // System API
  { path: '/api/system/health', maxRequests: 120, windowSeconds: 60 },
  { path: '/api/system/status', maxRequests: 30, windowSeconds: 60 },
  // Image API
  { path: '/api/image', maxRequests: 10, windowSeconds: 60 },
  // Premium retrieval/search
  { path: '/api/premium/retrieval/query', maxRequests: 30, windowSeconds: 60 },
  { path: '/api/premium/retrieval/recover', maxRequests: 18, windowSeconds: 60 },
  { path: '/api/premium/search/super', maxRequests: 24, windowSeconds: 60 },
  { path: '/api/premium/sweep/targeted', maxRequests: 12, windowSeconds: 60 },
  { path: '/api/premium/connectivity/probe', maxRequests: 20, windowSeconds: 60 },
  { path: '/api/premium/sovereignty/assess', maxRequests: 18, windowSeconds: 60 },
  // Billing hooks
  { path: '/api/billing/checkout', maxRequests: 6, windowSeconds: 60 },
  { path: '/api/billing/subscription', maxRequests: 20, windowSeconds: 60 },
  { path: '/api/billing/webhooks/stripe', maxRequests: 60, windowSeconds: 60 },
];

export class RateLimiter {
  private cache: KVNamespace;
  private limits: Map<string, RateLimitConfig>;

  constructor(cache: KVNamespace, customLimits?: RateLimitConfig[]) {
    this.cache = cache;
    this.limits = new Map();

    const allLimits = customLimits ? [...DEFAULT_LIMITS, ...customLimits] : DEFAULT_LIMITS;
    allLimits.forEach((limit) => {
      this.limits.set(limit.path, limit);
    });
  }

  /**
   * Check if request should be rate limited.
   * Returns { allowed: true/false, remaining: number, resetAt: ISO string }
   */
  async check(
    sessionId: string,
    path: string
  ): Promise<{ allowed: boolean; remaining: number; resetAt: string }> {
    const limit = this.limits.get(path);
    if (!limit) {
      // No limit configured
      return { allowed: true, remaining: -1, resetAt: '' };
    }

    const key = `ratelimit:${sessionId}:${path}`;
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - limit.windowSeconds;

    // Get current request count
    const dataStr = await this.cache.get(key);
    let data: { timestamps: number[] } = { timestamps: [] };

    if (dataStr) {
      try {
        data = JSON.parse(dataStr);
      } catch {
        // Invalid data, reset
        data = { timestamps: [] };
      }
    }

    // Filter out old timestamps
    const recentTimestamps = data.timestamps.filter((t) => t > windowStart);
    const remaining = Math.max(0, limit.maxRequests - recentTimestamps.length);

    if (remaining <= 0) {
      const oldestTimestamp = Math.min(...recentTimestamps);
      const resetAt = new Date((oldestTimestamp + limit.windowSeconds) * 1000).toISOString();
      return { allowed: false, remaining: 0, resetAt };
    }

    // Add current request
    recentTimestamps.push(now);

    // Store back to KV
    await this.cache.put(key, JSON.stringify({ timestamps: recentTimestamps }), {
      expirationTtl: limit.windowSeconds + 60,
    });

    const resetAt = new Date((now + limit.windowSeconds) * 1000).toISOString();
    return { allowed: true, remaining: remaining - 1, resetAt };
  }
}

export async function checkRateLimit(
  request: Request,
  sessionId: string,
  cache: KVNamespace
): Promise<Response | null> {
  const limiter = new RateLimiter(cache);
  const { allowed, remaining, resetAt } = await limiter.check(
    sessionId,
    new URL(request.url).pathname
  );

  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded', resetAt }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Reset': resetAt,
      },
    });
  }

  return null;
}
