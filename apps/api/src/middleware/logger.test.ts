import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { Hono } from "hono";
import { requestIdMiddleware } from "./requestId";
import { loggerMiddleware } from "./logger";

describe("logger middleware", () => {
  let logs: string[] = [];
  let writeSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    logs = [];
    writeSpy = spyOn(process.stdout, "write").mockImplementation(
      (chunk: string | Buffer) => {
        logs.push(typeof chunk === "string" ? chunk : chunk.toString());
        return true;
      },
    );
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  it("logs a JSON line on each response", async () => {
    const app = new Hono();
    app.use(requestIdMiddleware());
    app.use(loggerMiddleware());
    app.get("/", (c) => c.json({ ok: true }));

    await app.request("/");
    expect(logs.length).toBeGreaterThan(0);
    const parsed = JSON.parse(logs[0]!);
    expect(parsed).toHaveProperty("requestId");
    expect(parsed).toHaveProperty("method", "GET");
    expect(parsed).toHaveProperty("path", "/");
    expect(parsed).toHaveProperty("status", 200);
    expect(parsed).toHaveProperty("durationMs");
    expect(typeof parsed.durationMs).toBe("number");
  });

  it("logs the correct status code", async () => {
    const app = new Hono();
    app.use(requestIdMiddleware());
    app.use(loggerMiddleware());
    app.get("/not-found", (c) => c.json({ error: "nope" }, 404));

    await app.request("/not-found");
    const parsed = JSON.parse(logs[0]!);
    expect(parsed.status).toBe(404);
  });

  it("durationMs is a non-negative number", async () => {
    const app = new Hono();
    app.use(requestIdMiddleware());
    app.use(loggerMiddleware());
    app.get("/", (c) => c.json({ ok: true }));

    await app.request("/");
    const parsed = JSON.parse(logs[0]!);
    expect(parsed.durationMs).toBeGreaterThanOrEqual(0);
  });
});
