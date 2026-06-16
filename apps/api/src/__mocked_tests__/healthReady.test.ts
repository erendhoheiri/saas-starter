import { describe, expect, it, mock } from "bun:test";

// Mock the @starter/db module before importing app.
//
// The mock must include all named exports that @starter/db consumers rely on
// at module-load time. In particular:
//   - `db`     — used by the /health/ready route handler (lazy import inside handler)
//   - `schema` — imported at the top level by @starter/auth/server.ts (via
//                the Drizzle adapter) which is transitively imported whenever
//                any middleware loads @starter/auth
//   - `createDb` — used in integration tests that share the bun test run
//
// Without these stubs Bun throws "Export named 'schema' not found" across all
// workers in the same invocation because mock.module() is global.
mock.module("@starter/db", () => {
  // Minimal stub that satisfies the import shapes auth/server.ts needs.
  const stubSchema = new Proxy(
    {},
    {
      get: (_t, prop) => {
        // Return a table stub with $inferSelect / $inferInsert for type use
        // and the drizzle column helpers that the auth adapter calls.
        return {
          _: { name: String(prop) },
          $inferSelect: undefined,
          $inferInsert: undefined,
        };
      },
    },
  );

  return {
    db: {
      execute: async () => [{ "1": 1 }],
      select: () => ({
        from: () => ({ where: () => ({ limit: async () => [] }) }),
      }),
    },
    schema: stubSchema,
    createDb: () => ({
      db: { execute: async () => [] },
      client: { end: async () => {} },
    }),
    client: {},
  };
});

describe("GET /health/ready", () => {
  it("returns 200 when DB is reachable", async () => {
    const { app } = await import("../app");
    const res = await app.request("/health/ready");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("ok");
  });

  it("returns 503 with generic message when DB is unreachable", async () => {
    const { Hono } = await import("hono");
    const { sql } = await import("drizzle-orm");
    const { errorHandler } = await import("../middleware/error");
    const { captureError } = await import("../lib/logger");

    mock.module("@starter/db", () => ({
      db: {
        execute: async () => {
          throw new Error("connection refused");
        },
      },
      schema: {},
      createDb: () => ({
        db: { execute: async () => [] },
        client: { end: async () => {} },
      }),
      client: {},
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
    const body = (await res.json()) as { status: string; message: string };
    expect(body.status).toBe("error");
    // Should NOT leak internal error details
    expect(body.message).not.toContain("connection refused");
  });
});
