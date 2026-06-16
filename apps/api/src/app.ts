import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { captureError } from "./lib/logger";
import { errorHandler } from "./middleware/error";
import { loggerMiddleware } from "./middleware/logger";
import { rateLimitMiddleware } from "./middleware/rateLimit";
import { requestIdMiddleware } from "./middleware/requestId";

export const app = new Hono();

// --- CORS ---
// Must come before all other middleware so preflight OPTIONS requests are
// handled and credentials (cookies) are allowed cross-origin in dev.
app.use(
  "*",
  cors({
    origin: process.env.APP_URL ?? "http://localhost:5173",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Set-Cookie"],
    credentials: true,
  }),
);

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

// --- Organization routes ---
// We use a lazy-proxy sub-app so that `@starter/auth` and `@starter/db` are
// not imported at module-load time. This keeps unit tests that mock those
// modules (e.g. healthReady.test.ts) safe: they can import app.ts without
// triggering a real DB/auth connection.
//
// The proxy caches the real router after the first request so subsequent
// requests pay no dynamic-import overhead.
{
  const orgsProxy = new Hono();
  let _router: Hono | null = null;
  orgsProxy.all("/*", async (c) => {
    if (!_router) {
      const { organizationsRouter } = await import(
        "./modules/organizations/routes"
      );
      _router = organizationsRouter;
    }
    const url = new URL(c.req.raw.url);
    url.pathname = c.req.path;
    return _router.fetch(new Request(url.toString(), c.req.raw), c.env);
  });
  app.route("/api/organizations", orgsProxy);
}

// --- Account routes ---
// Lazy-proxy sub-app identical to the organizations pattern.
{
  const accountProxy = new Hono();
  let _router: Hono | null = null;
  accountProxy.all("/*", async (c) => {
    if (!_router) {
      const { accountRouter } = await import("./modules/account/routes");
      _router = accountRouter;
    }
    const url = new URL(c.req.raw.url);
    url.pathname = c.req.path;
    return _router.fetch(new Request(url.toString(), c.req.raw), c.env);
  });
  app.route("/api/account", accountProxy);
}

// --- Admin routes ---
// Lazy-proxy sub-app identical to the organizations / account pattern.
{
  const adminProxy = new Hono();
  let _router: Hono | null = null;
  adminProxy.all("/*", async (c) => {
    if (!_router) {
      const { adminRouter } = await import("./modules/admin/routes");
      _router = adminRouter;
    }
    const url = new URL(c.req.raw.url);
    url.pathname = c.req.path;
    return _router.fetch(new Request(url.toString(), c.req.raw), c.env);
  });
  app.route("/api/admin", adminProxy);
}

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
