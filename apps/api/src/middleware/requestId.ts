import type { Context, MiddlewareHandler, Next } from "hono";

export function requestIdMiddleware(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const existing = c.req.header("X-Request-Id");
    const id = existing ?? crypto.randomUUID();
    // Store on context so downstream handlers can read it
    c.set("requestId", id);
    await next();
    // Always set the header on the response
    c.header("X-Request-Id", id);
  };
}
