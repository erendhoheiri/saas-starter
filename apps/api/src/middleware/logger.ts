import type { Context, MiddlewareHandler, Next } from "hono";
import { logger } from "../lib/logger";

export function loggerMiddleware(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const start = performance.now();
    await next();
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    logger.info({
      requestId: (c.get("requestId") as string | undefined) ?? "",
      method: c.req.method,
      path: new URL(c.req.url).pathname,
      status: c.res.status,
      durationMs,
    });
  };
}
