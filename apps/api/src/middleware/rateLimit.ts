import type { Context, MiddlewareHandler, Next } from "hono";

export interface RateLimitStore {
  /** Returns the current count after incrementing. */
  increment(key: string, windowMs: number): Promise<number>;
  /** Resets the counter for a key (useful in tests). */
  reset(key: string): Promise<void>;
}

interface RateLimitEntry {
  count: number;
  expiresAt: number;
}

export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly store = new Map<string, RateLimitEntry>();

  async increment(key: string, windowMs: number): Promise<number> {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.expiresAt) {
      // Start a new window
      this.store.set(key, { count: 1, expiresAt: now + windowMs });
      return 1;
    }

    entry.count += 1;
    return entry.count;
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }
}

export interface RateLimitOptions {
  /** Returns the rate-limit bucket key for a given request. */
  key: (c: Context) => string;
  /** Maximum number of requests allowed in the window. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
  /** Optional custom store. Defaults to a new InMemoryRateLimitStore. */
  store?: RateLimitStore;
}

export function rateLimitMiddleware(
  options: RateLimitOptions,
): MiddlewareHandler {
  const store: RateLimitStore = options.store ?? new InMemoryRateLimitStore();

  return async (c: Context, next: Next) => {
    const key = options.key(c);
    const count = await store.increment(key, options.windowMs);

    if (count > options.limit) {
      return c.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: `Too many requests. Limit is ${options.limit} per ${options.windowMs}ms.`,
          },
        },
        429,
      );
    }

    await next();
  };
}
