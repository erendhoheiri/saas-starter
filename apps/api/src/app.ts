import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { captureError } from "./lib/logger";
import { errorHandler } from "./middleware/error";
import { loggerMiddleware } from "./middleware/logger";
import { rateLimitMiddleware } from "./middleware/rateLimit";
import { requestIdMiddleware } from "./middleware/requestId";

export const app = new Hono();

// --- Global middleware ---
app.use(requestIdMiddleware());
app.use(loggerMiddleware());

// --- Global error handler ---
app.onError(errorHandler());

// Rate limiter is scoped to exclude health routes so infrastructure probes
// (load balancers, Kubernetes liveness/readiness) are never rate-limited.
// Assumes a trusted reverse proxy sets X-Forwarded-For. In untrusted
// environments, clients can spoof this header — replace with socket-level
// IP for production hardening.
const rateLimiter = rateLimitMiddleware({
  key: (c) => c.req.header("x-forwarded-for") ?? "unknown",
  limit: 100,
  windowMs: 60_000,
});
app.use(async (c, next) => {
  if (c.req.path === "/health" || c.req.path === "/health/ready") {
    return next();
  }
  return rateLimiter(c, next);
});

// --- Auth routes (Better Auth handles all /api/auth/* paths) ---
// The import is lazy (inside the handler) for the same reason as the DB import
// below: it avoids requiring AUTH_SECRET/DATABASE_URL at module load time,
// which lets unit tests that mock @starter/db import app.ts safely.
app.all("/api/auth/*", async (c) => {
  const { handler } = await import("@starter/auth");
  return handler(c.req.raw);
});

// --- Routes ---
app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

app.get("/health/ready", async (c) => {
  try {
    // Lazy import to avoid requiring DATABASE_URL in tests that don't need it
    const { db } = await import("@starter/db");
    await db.execute(sql`SELECT 1`);
    return c.json({ status: "ok" });
  } catch (err) {
    captureError(err);
    return c.json(
      {
        status: "error",
        message: "Service unavailable",
      },
      503,
    );
  }
});
