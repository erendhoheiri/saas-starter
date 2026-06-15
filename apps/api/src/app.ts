import { sql } from "drizzle-orm";
import { Hono } from "hono";

export const app = new Hono();

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
    return c.json(
      {
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      },
      503,
    );
  }
});
