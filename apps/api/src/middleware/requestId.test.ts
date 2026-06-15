import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { requestIdMiddleware } from "./requestId";

describe("requestId middleware", () => {
  it("adds X-Request-Id response header", async () => {
    const app = new Hono();
    app.use(requestIdMiddleware());
    app.get("/", (c) => c.json({ ok: true }));

    const res = await app.request("/");
    expect(res.headers.get("X-Request-Id")).toBeTruthy();
  });

  it("X-Request-Id is a valid UUID", async () => {
    const app = new Hono();
    app.use(requestIdMiddleware());
    app.get("/", (c) => c.json({ ok: true }));

    const res = await app.request("/");
    const id = res.headers.get("X-Request-Id");
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("sets requestId on Hono context", async () => {
    const app = new Hono<{ Variables: { requestId: string } }>();
    app.use(requestIdMiddleware());
    app.get("/", (c) => c.json({ requestId: c.get("requestId") }));

    const res = await app.request("/");
    const body = await res.json<{ requestId: string }>();
    expect(body.requestId).toBeTruthy();
    expect(body.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("each request gets a unique requestId", async () => {
    const app = new Hono();
    app.use(requestIdMiddleware());
    app.get("/", (c) => c.json({ ok: true }));

    const res1 = await app.request("/");
    const res2 = await app.request("/");
    const id1 = res1.headers.get("X-Request-Id");
    const id2 = res2.headers.get("X-Request-Id");
    expect(id1).not.toBe(id2);
  });

  it("uses existing X-Request-Id header if provided", async () => {
    const app = new Hono();
    app.use(requestIdMiddleware());
    app.get("/", (c) => c.json({ ok: true }));

    const res = await app.request("/", {
      headers: { "X-Request-Id": "my-custom-id" },
    });
    expect(res.headers.get("X-Request-Id")).toBe("my-custom-id");
  });
});
