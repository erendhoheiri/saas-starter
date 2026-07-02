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
// app.mount() strips the path prefix before forwarding so the sub-router sees
// /list instead of /api/organizations/list. The lazy import is cached after
// the first request — subsequent calls pay no dynamic-import overhead.
// app.route() was intentionally NOT used here: route() copies routes at mount
// time and does not strip the prefix at request time, so the sub-router would
// receive the full /api/organizations/... path and return 404.
{
  let _orgsRouter: Hono | null = null;
  app.mount("/api/organizations", async (req, env) => {
    if (!_orgsRouter) {
      const { organizationsRouter } = await import(
        "./modules/organization/routes"
      );
      _orgsRouter = organizationsRouter;
    }
    return _orgsRouter.fetch(req, env);
  });
}

// --- Account routes ---
// Same lazy-mount pattern as organizations.
{
  let _accountRouter: Hono | null = null;
  app.mount("/api/account", async (req, env) => {
    if (!_accountRouter) {
      const { accountRouter } = await import("./modules/account/routes");
      _accountRouter = accountRouter;
    }
    return _accountRouter.fetch(req, env);
  });
}

// --- Admin routes ---
// Same lazy-mount pattern as organizations.
{
  let _adminRouter: Hono | null = null;
  app.mount("/api/admin", async (req, env) => {
    if (!_adminRouter) {
      const { adminRouter } = await import("./modules/admin/routes");
      _adminRouter = adminRouter;
    }
    return _adminRouter.fetch(req, env);
  });
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
