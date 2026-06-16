import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { InMemoryRateLimitStore, rateLimitMiddleware } from "./rateLimit";

describe("rateLimit middleware", () => {
  it("allows requests under the limit", async () => {
    const store = new InMemoryRateLimitStore();
    const app = new Hono();
    app.use(
      rateLimitMiddleware({
        key: () => "test-key",
        limit: 3,
        windowMs: 60_000,
        store,
      }),
    );
    app.get("/", (c) => c.json({ ok: true }));

    for (let i = 0; i < 3; i++) {
      const res = await app.request("/");
      expect(res.status).toBe(200);
    }
  });

  it("returns 429 when limit is exceeded", async () => {
    const store = new InMemoryRateLimitStore();
    const app = new Hono();
    app.use(
      rateLimitMiddleware({
        key: () => "test-key-exceed",
        limit: 2,
        windowMs: 60_000,
        store,
      }),
    );
    app.get("/", (c) => c.json({ ok: true }));

    await app.request("/");
    await app.request("/");
    const res = await app.request("/");
    expect(res.status).toBe(429);
  });

  it("returns structured JSON error on 429", async () => {
    const store = new InMemoryRateLimitStore();
    const app = new Hono();
    app.use(
      rateLimitMiddleware({
        key: () => "test-key-body",
        limit: 1,
        windowMs: 60_000,
        store,
      }),
    );
    app.get("/", (c) => c.json({ ok: true }));

    await app.request("/");
    const res = await app.request("/");
    const body = (await res.json()) as {
      error: { code: string; message: string };
    };
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(typeof body.error.message).toBe("string");
  });

  it("isolates different keys", async () => {
    const store = new InMemoryRateLimitStore();
    let keyValue = "key-a";
    const app = new Hono();
    app.use(
      rateLimitMiddleware({
        key: () => keyValue,
        limit: 1,
        windowMs: 60_000,
        store,
      }),
    );
    app.get("/", (c) => c.json({ ok: true }));

    // exhaust key-a
    await app.request("/");
    const resA = await app.request("/");
    expect(resA.status).toBe(429);

    // key-b should still be allowed
    keyValue = "key-b";
    const resB = await app.request("/");
    expect(resB.status).toBe(200);
  });

  it("uses key function with context", async () => {
    const store = new InMemoryRateLimitStore();
    const app = new Hono();
    app.use(
      rateLimitMiddleware({
        key: (c) => c.req.header("X-Forwarded-For") ?? "default",
        limit: 1,
        windowMs: 60_000,
        store,
      }),
    );
    app.get("/", (c) => c.json({ ok: true }));

    await app.request("/", { headers: { "X-Forwarded-For": "1.2.3.4" } });
    const res = await app.request("/", {
      headers: { "X-Forwarded-For": "1.2.3.4" },
    });
    expect(res.status).toBe(429);

    // different IP should be fine
    const res2 = await app.request("/", {
      headers: { "X-Forwarded-For": "5.6.7.8" },
    });
    expect(res2.status).toBe(200);
  });
});
