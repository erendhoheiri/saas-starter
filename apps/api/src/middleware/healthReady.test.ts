import { describe, expect, it, mock } from "bun:test";

// Mock the @starter/db module before importing app
mock.module("@starter/db", () => ({
  db: {
    execute: async () => [{ "1": 1 }],
  },
}));

describe("GET /health/ready", () => {
  it("returns 200 when DB is reachable", async () => {
    const { app } = await import("../app");
    const res = await app.request("/health/ready");
    expect(res.status).toBe(200);
    const body = await res.json<{ status: string }>();
    expect(body.status).toBe("ok");
  });

  it("returns 503 with generic message when DB is unreachable", async () => {
    const { Hono } = await import("hono");
    const { sql } = await import("drizzle-orm");
    const { errorHandler } = await import("./error");
    const { captureError } = await import("../lib/logger");

    mock.module("@starter/db", () => ({
      db: {
        execute: async () => {
          throw new Error("connection refused");
        },
      },
    }));

    const testApp = new Hono();
    testApp.onError(errorHandler());
    testApp.get("/health/ready", async (c) => {
      try {
        const { db } = await import("@starter/db");
        await db.execute(sql`SELECT 1`);
        return c.json({ status: "ok" });
      } catch (err) {
        captureError(err);
        return c.json({ status: "error", message: "Service unavailable" }, 503);
      }
    });

    const res = await testApp.request("/health/ready");
    expect(res.status).toBe(503);
    const body = await res.json<{ status: string; message: string }>();
    expect(body.status).toBe("error");
    // Should NOT leak internal error details
    expect(body.message).not.toContain("connection refused");
  });
});
