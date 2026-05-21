// In-memory rate limiter for development / pre-Upstash environments.
//
// To upgrade to distributed rate limiting:
//   1. npm install @upstash/ratelimit @upstash/redis
//   2. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env
//   3. Replace the body of `rateLimit` with:
//        import { Ratelimit } from '@upstash/ratelimit';
//        import { Redis } from '@upstash/redis';
//        const limiter = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(max, `${windowMs / 1000} s`) });
//        return limiter.limit(key);

export type RateLimitResult = {
  success: boolean;
  reset: number; // Unix timestamp (ms) when the window resets
};

type WindowEntry = {
  count: number;
  resetAt: number;
};

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX = 100;

const store = new Map<string, WindowEntry>();

export const rateLimit = (
  key: string,
  max = DEFAULT_MAX,
  windowMs = DEFAULT_WINDOW_MS
): RateLimitResult => {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { success: true, reset: resetAt };
  }

  entry.count += 1;
  store.set(key, entry);

  return { success: entry.count <= max, reset: entry.resetAt };
};

// Named limiters with pre-configured defaults for each use case.
const PUBLIC_MAX = 120;
const PUBLIC_WINDOW = 60_000;
const MUTATION_MAX = 20;
const MUTATION_WINDOW = 60_000;
const ALERTS_MAX = 5;
const ALERTS_WINDOW = 3_600_000; // 1 hour

export const publicRateLimit = (ip: string) =>
  rateLimit(`public:${ip}`, PUBLIC_MAX, PUBLIC_WINDOW);

export const mutationRateLimit = (ip: string) =>
  rateLimit(`mutation:${ip}`, MUTATION_MAX, MUTATION_WINDOW);

export const alertsRateLimit = (ip: string) =>
  rateLimit(`alerts:${ip}`, ALERTS_MAX, ALERTS_WINDOW);
