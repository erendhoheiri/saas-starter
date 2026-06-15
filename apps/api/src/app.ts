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
app.use(
  rateLimitMiddleware({
    key: (c) => c.req.header("x-forwarded-for") ?? "unknown",
    limit: 100,
    windowMs: 60_000,
  }),
);

// --- Global error handler ---
app.onError(errorHandler());

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
