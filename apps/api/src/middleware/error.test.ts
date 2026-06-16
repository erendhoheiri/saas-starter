import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { errorHandler } from "./error";

describe("error middleware (onError handler)", () => {
  it("catches a thrown Error and returns 500 JSON", async () => {
    const app = new Hono();
    app.onError(errorHandler());
    app.get("/", () => {
      throw new Error("something went wrong");
    });

    const res = await app.request("/");
    expect(res.status).toBe(500);
    const body = (await res.json()) as {
      error: { code: string; message: string };
    };
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(typeof body.error.message).toBe("string");
  });

  it("catches HTTPException and returns correct status + JSON", async () => {
    const app = new Hono();
    app.onError(errorHandler());
    app.get("/", () => {
      throw new HTTPException(403, { message: "Forbidden" });
    });

    const res = await app.request("/");
    expect(res.status).toBe(403);
    const body = (await res.json()) as {
      error: { code: string; message: string };
    };
    expect(body.error.code).toBe("FORBIDDEN");
    expect(body.error.message).toBe("Forbidden");
  });

  it("does not leak stack traces in production", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      const app = new Hono();
      app.onError(errorHandler());
      app.get("/", () => {
        throw new Error("secret internal detail");
      });

      const res = await app.request("/");
      const body = (await res.json()) as {
        error: { code: string; message: string; stack?: string };
      };
      expect(body.error.stack).toBeUndefined();
      expect(body.error.message).not.toContain("secret internal detail");
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it("returns error details in non-production", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";

    try {
      const app = new Hono();
      app.onError(errorHandler());
      app.get("/", () => {
        throw new Error("detailed error");
      });

      const res = await app.request("/");
      const body = (await res.json()) as {
        error: { code: string; message: string };
      };
      expect(body.error.message).toBe("detailed error");
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it("returns structured JSON with Content-Type application/json", async () => {
    const app = new Hono();
    app.onError(errorHandler());
    app.get("/", () => {
      throw new Error("boom");
    });

    const res = await app.request("/");
    expect(res.headers.get("content-type")).toContain("application/json");
  });

  it("maps 401 HTTPException to UNAUTHORIZED code", async () => {
    const app = new Hono();
    app.onError(errorHandler());
    app.get("/", () => {
      throw new HTTPException(401, { message: "Unauthorized" });
    });

    const res = await app.request("/");
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("maps 404 HTTPException to NOT_FOUND code", async () => {
    const app = new Hono();
    app.onError(errorHandler());
    app.get("/", () => {
      throw new HTTPException(404, { message: "Not Found" });
    });

    const res = await app.request("/");
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
