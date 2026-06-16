/**
 * Integration tests for the admin operator panel module.
 *
 * Requires a running Postgres at TEST_DATABASE_URL (port 5433).
 * Run with: bun test apps/api/src/modules/admin/admin.test.ts
 *
 * Design note: all @starter/db and @starter/auth imports are lazy (inside test
 * bodies) to avoid conflicts with Bun's global mock.module() in other test
 * files (e.g. healthReady.test.ts).
 */
import { describe, expect, it } from "bun:test";
import { Hono } from "hono";

// ---------------------------------------------------------------------------
// Test app factory
// ---------------------------------------------------------------------------

async function buildTestApp() {
  const { handler } = await import("@starter/auth");
  const { adminRouter } = await import("./routes");
  const { accountRouter } = await import("../account/routes");

  const app = new Hono();

  // Mount Better Auth
  app.all("/api/auth/*", (c) => handler(c.req.raw));

  // Mount admin router — strip /api/admin prefix
  app.all("/api/admin/*", async (c) => {
    const url = new URL(c.req.url);
    url.pathname = url.pathname.replace(/^\/api\/admin/, "") || "/";
    const req = new Request(url.toString(), c.req.raw);
    return adminRouter.fetch(req, c.env);
  });
  app.on(["GET", "POST"], "/api/admin", async (c) => {
    const url = new URL(c.req.url);
    url.pathname = "/";
    const req = new Request(url.toString(), c.req.raw);
    return adminRouter.fetch(req, c.env);
  });

  // Mount account router for /me endpoint (to verify impersonation + ban)
  app.all("/api/account/*", async (c) => {
    const url = new URL(c.req.url);
    url.pathname = url.pathname.replace(/^\/api\/account/, "") || "/";
    const req = new Request(url.toString(), c.req.raw);
    return accountRouter.fetch(req, c.env);
  });

  return app;
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

async function signUp(app: Hono, email: string, password: string, name = "Test User"): Promise<string> {
  const res = await app.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  if (!res.ok) throw new Error(`Sign-up failed (${res.status}): ${await res.text()}`);
  const cookie = res.headers.get("set-cookie");
  if (!cookie) throw new Error("No Set-Cookie on sign-up");
  return cookie;
}

async function signIn(app: Hono, email: string, password: string): Promise<string> {
  const res = await app.request("/api/auth/sign-in/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Sign-in failed (${res.status}): ${await res.text()}`);
  const cookie = res.headers.get("set-cookie");
  if (!cookie) throw new Error("No Set-Cookie on sign-in");
  return cookie;
}

/** Sign up + make platform admin via direct DB write */
async function signUpAdmin(
  app: Hono,
  testDb: unknown,
  email: string,
  password: string,
): Promise<string> {
  const cookie = await signUp(app, email, password, "Admin User");
  const { schema } = await import("@starter/db");
  const { eq } = await import("drizzle-orm");
  // biome-ignore lint/suspicious/noExplicitAny: test helper
  const db = testDb as any;
  await db.update(schema.user).set({ role: "admin" }).where(eq(schema.user.email, email));
  // Re-sign-in to get a fresh session that reflects the updated role
  return signIn(app, email, password);
}

// ---------------------------------------------------------------------------
// Non-admin gets 403
// ---------------------------------------------------------------------------

describe("Admin routes — non-admin gets 403", () => {
  it(
    "non-admin user gets 403 on GET /api/admin/users",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async () => {
        const app = await buildTestApp();
        const cookie = await signUp(app, `nonadmin-users-${Date.now()}@example.com`, "Password1!");

        const res = await app.request("/api/admin/users", {
          headers: { Cookie: cookie },
        });

        expect(res.status).toBe(403);
      });
    },
    30_000,
  );

  it(
    "non-admin user gets 403 on GET /api/admin/orgs",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async () => {
        const app = await buildTestApp();
        const cookie = await signUp(app, `nonadmin-orgs-${Date.now()}@example.com`, "Password1!");

        const res = await app.request("/api/admin/orgs", {
          headers: { Cookie: cookie },
        });

        expect(res.status).toBe(403);
      });
    },
    30_000,
  );

  it(
    "unauthenticated request gets 401 on GET /api/admin/users",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async () => {
        const app = await buildTestApp();

        const res = await app.request("/api/admin/users");
        expect(res.status).toBe(401);
      });
    },
    30_000,
  );
});

// ---------------------------------------------------------------------------
// Admin can list users
// ---------------------------------------------------------------------------

describe("GET /api/admin/users — list users", () => {
  it(
    "admin can list users and get paginated result",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async (testDb) => {
        const app = await buildTestApp();
        const adminEmail = `admin-list-users-${Date.now()}@example.com`;
        const adminCookie = await signUpAdmin(app, testDb, adminEmail, "Password1!");

        // Create a regular user too
        await signUp(app, `regular-list-${Date.now()}@example.com`, "Password1!");

        const res = await app.request("/api/admin/users", {
          headers: { Cookie: adminCookie },
        });

        expect(res.status).toBe(200);
        const body = await res.json() as { data: Array<{ id: string; email: string; name: string; role: string; bannedAt: unknown; createdAt: string }>; total: number; page: number; limit: number };
        expect(Array.isArray(body.data)).toBe(true);
        expect(body.data.length).toBeGreaterThan(0);
        expect(typeof body.total).toBe("number");
        // Verify shape of first user
        const firstUser = body.data[0];
        expect(firstUser).toHaveProperty("id");
        expect(firstUser).toHaveProperty("email");
        expect(firstUser).toHaveProperty("name");
        expect(firstUser).toHaveProperty("role");
        expect(firstUser).toHaveProperty("bannedAt");
        expect(firstUser).toHaveProperty("createdAt");
      });
    },
    30_000,
  );

  it(
    "admin can search users by email with q param",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async (testDb) => {
        const app = await buildTestApp();
        const uniqueTag = `unique-search-${Date.now()}`;
        const adminEmail = `admin-search-${Date.now()}@example.com`;
        const adminCookie = await signUpAdmin(app, testDb, adminEmail, "Password1!");

        // Create a user with a distinctive email
        await signUp(app, `${uniqueTag}@example.com`, "Password1!");

        const res = await app.request(`/api/admin/users?q=${uniqueTag}`, {
          headers: { Cookie: adminCookie },
        });

        expect(res.status).toBe(200);
        const body = await res.json() as { data: Array<{ email: string }> };
        expect(body.data.length).toBeGreaterThan(0);
        expect(body.data[0]?.email).toContain(uniqueTag);
      });
    },
    30_000,
  );

  it(
    "respects page and limit params",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async (testDb) => {
        const app = await buildTestApp();
        const adminEmail = `admin-page-${Date.now()}@example.com`;
        const adminCookie = await signUpAdmin(app, testDb, adminEmail, "Password1!");

        const res = await app.request("/api/admin/users?page=1&limit=1", {
          headers: { Cookie: adminCookie },
        });

        expect(res.status).toBe(200);
        const body = await res.json() as { data: unknown[]; limit: number; page: number };
        expect(body.data.length).toBeLessThanOrEqual(1);
        expect(body.page).toBe(1);
        expect(body.limit).toBe(1);
      });
    },
    30_000,
  );
});

// ---------------------------------------------------------------------------
// Admin can list orgs
// ---------------------------------------------------------------------------

describe("GET /api/admin/orgs — list orgs", () => {
  it(
    "admin can list orgs and get paginated result",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async (testDb) => {
        const app = await buildTestApp();
        const adminEmail = `admin-list-orgs-${Date.now()}@example.com`;
        const adminCookie = await signUpAdmin(app, testDb, adminEmail, "Password1!");

        const res = await app.request("/api/admin/orgs", {
          headers: { Cookie: adminCookie },
        });

        expect(res.status).toBe(200);
        const body = await res.json() as { data: Array<{ id: string; name: string; slug: string; deletedAt: unknown; createdAt: string }>; total: number; page: number; limit: number };
        expect(Array.isArray(body.data)).toBe(true);
        expect(body.data.length).toBeGreaterThan(0);
        const firstOrg = body.data[0];
        expect(firstOrg).toHaveProperty("id");
        expect(firstOrg).toHaveProperty("name");
        expect(firstOrg).toHaveProperty("slug");
        expect(firstOrg).toHaveProperty("deletedAt");
        expect(firstOrg).toHaveProperty("createdAt");
      });
    },
    30_000,
  );

  it(
    "admin can search orgs by name with q param",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async (testDb) => {
        const app = await buildTestApp();
        const uniqueOrgName = `UniqueOrg-${Date.now()}`;
        const adminEmail = `admin-org-search-${Date.now()}@example.com`;
        const adminCookie = await signUpAdmin(app, testDb, adminEmail, "Password1!");

        // Create an org via Better Auth
        const { schema } = await import("@starter/db");
        // biome-ignore lint/suspicious/noExplicitAny: test helper
        const db = testDb as any;
        await db.insert(schema.organization).values({
          name: uniqueOrgName,
          slug: `unique-org-${Date.now()}`,
        });

        const res = await app.request(`/api/admin/orgs?q=${encodeURIComponent(uniqueOrgName)}`, {
          headers: { Cookie: adminCookie },
        });

        expect(res.status).toBe(200);
        const body = await res.json() as { data: Array<{ name: string }> };
        expect(body.data.length).toBeGreaterThan(0);
        expect(body.data[0]?.name).toContain(uniqueOrgName);
      });
    },
    30_000,
  );
});

// ---------------------------------------------------------------------------
// Suspend / unsuspend
// ---------------------------------------------------------------------------

describe("POST /api/admin/users/:userId/suspend + unsuspend", () => {
  it(
    "admin can suspend a user — sets bannedAt",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async (testDb) => {
        const { schema } = await import("@starter/db");
        const { eq } = await import("drizzle-orm");
        // biome-ignore lint/suspicious/noExplicitAny: test helper
        const db = testDb as any;
        const app = await buildTestApp();
        const adminEmail = `admin-suspend-${Date.now()}@example.com`;
        const adminCookie = await signUpAdmin(app, testDb, adminEmail, "Password1!");

        const targetEmail = `target-suspend-${Date.now()}@example.com`;
        await signUp(app, targetEmail, "Password1!");

        // Get target user id from DB
        const targetRows = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, targetEmail));
        const targetId = targetRows[0]?.id;
        expect(targetId).toBeDefined();

        const res = await app.request(`/api/admin/users/${targetId}/suspend`, {
          method: "POST",
          headers: { Cookie: adminCookie },
        });

        expect(res.status).toBe(200);

        // Verify bannedAt is now set in DB
        const updatedRows = await db.select({ bannedAt: schema.user.bannedAt }).from(schema.user).where(eq(schema.user.id, targetId));
        expect(updatedRows[0]?.bannedAt).not.toBeNull();
      });
    },
    30_000,
  );

  it(
    "suspended user's auth requests return 401",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async (testDb) => {
        const { schema } = await import("@starter/db");
        const { eq } = await import("drizzle-orm");
        // biome-ignore lint/suspicious/noExplicitAny: test helper
        const db = testDb as any;
        const app = await buildTestApp();
        const adminEmail = `admin-ban-401-${Date.now()}@example.com`;
        const adminCookie = await signUpAdmin(app, testDb, adminEmail, "Password1!");

        const targetEmail = `target-ban-401-${Date.now()}@example.com`;
        const targetCookie = await signUp(app, targetEmail, "Password1!");

        // Get target user id
        const targetRows = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, targetEmail));
        const targetId = targetRows[0]?.id;

        // Suspend the target
        const suspendRes = await app.request(`/api/admin/users/${targetId}/suspend`, {
          method: "POST",
          headers: { Cookie: adminCookie },
        });
        expect(suspendRes.status).toBe(200);

        // Target's existing session cookie should now be rejected
        const meRes = await app.request("/api/account/me", {
          headers: { Cookie: targetCookie },
        });
        expect(meRes.status).toBe(401);
      });
    },
    30_000,
  );

  it(
    "admin cannot suspend themselves — 400",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async (testDb) => {
        const { schema } = await import("@starter/db");
        const { eq } = await import("drizzle-orm");
        // biome-ignore lint/suspicious/noExplicitAny: test helper
        const db = testDb as any;
        const app = await buildTestApp();
        const adminEmail = `admin-self-suspend-${Date.now()}@example.com`;
        const adminCookie = await signUpAdmin(app, testDb, adminEmail, "Password1!");

        const adminRows = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, adminEmail));
        const adminId = adminRows[0]?.id;
        expect(adminId).toBeDefined();

        const res = await app.request(`/api/admin/users/${adminId}/suspend`, {
          method: "POST",
          headers: { Cookie: adminCookie },
        });

        expect(res.status).toBe(400);
      });
    },
    30_000,
  );

  it(
    "admin can unsuspend a user — clears bannedAt",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async (testDb) => {
        const { schema } = await import("@starter/db");
        const { eq } = await import("drizzle-orm");
        // biome-ignore lint/suspicious/noExplicitAny: test helper
        const db = testDb as any;
        const app = await buildTestApp();
        const adminEmail = `admin-unsuspend-${Date.now()}@example.com`;
        const adminCookie = await signUpAdmin(app, testDb, adminEmail, "Password1!");

        const targetEmail = `target-unsuspend-${Date.now()}@example.com`;
        await signUp(app, targetEmail, "Password1!");
        const targetRows = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, targetEmail));
        const targetId = targetRows[0]?.id;

        // First suspend
        await app.request(`/api/admin/users/${targetId}/suspend`, {
          method: "POST",
          headers: { Cookie: adminCookie },
        });

        // Then unsuspend
        const res = await app.request(`/api/admin/users/${targetId}/unsuspend`, {
          method: "POST",
          headers: { Cookie: adminCookie },
        });
        expect(res.status).toBe(200);

        // Verify bannedAt is null in DB
        const updatedRows = await db.select({ bannedAt: schema.user.bannedAt }).from(schema.user).where(eq(schema.user.id, targetId));
        expect(updatedRows[0]?.bannedAt).toBeNull();
      });
    },
    30_000,
  );
});

// ---------------------------------------------------------------------------
// Impersonation
// ---------------------------------------------------------------------------

describe("POST /api/admin/users/:userId/impersonate", () => {
  it(
    "admin can impersonate a user — response includes session cookie for target user",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async (testDb) => {
        const { schema } = await import("@starter/db");
        const { eq } = await import("drizzle-orm");
        // biome-ignore lint/suspicious/noExplicitAny: test helper
        const db = testDb as any;
        const app = await buildTestApp();
        const adminEmail = `admin-impersonate-${Date.now()}@example.com`;
        const adminCookie = await signUpAdmin(app, testDb, adminEmail, "Password1!");

        const targetEmail = `target-imp-${Date.now()}@example.com`;
        await signUp(app, targetEmail, "Password1!");
        const targetRows = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, targetEmail));
        const targetId = targetRows[0]?.id;
        expect(targetId).toBeDefined();

        const res = await app.request(`/api/admin/users/${targetId}/impersonate`, {
          method: "POST",
          headers: { Cookie: adminCookie },
        });

        expect(res.status).toBe(200);
        const cookie = res.headers.get("set-cookie");
        expect(cookie).toBeTruthy();

        const body = await res.json() as { userId: string; impersonatedBy: string };
        expect(body.userId).toBe(targetId);
        expect(typeof body.impersonatedBy).toBe("string");
      });
    },
    30_000,
  );

  it(
    "admin cannot impersonate themselves — 400",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async (testDb) => {
        const { schema } = await import("@starter/db");
        const { eq } = await import("drizzle-orm");
        // biome-ignore lint/suspicious/noExplicitAny: test helper
        const db = testDb as any;
        const app = await buildTestApp();
        const adminEmail = `admin-self-imp-${Date.now()}@example.com`;
        const adminCookie = await signUpAdmin(app, testDb, adminEmail, "Password1!");

        const adminRows = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, adminEmail));
        const adminId = adminRows[0]?.id;
        expect(adminId).toBeDefined();

        const res = await app.request(`/api/admin/users/${adminId}/impersonate`, {
          method: "POST",
          headers: { Cookie: adminCookie },
        });

        expect(res.status).toBe(400);
      });
    },
    30_000,
  );

  it(
    "admin cannot impersonate another admin — 400",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async (testDb) => {
        const { schema } = await import("@starter/db");
        const { eq } = await import("drizzle-orm");
        // biome-ignore lint/suspicious/noExplicitAny: test helper
        const db = testDb as any;
        const app = await buildTestApp();
        const adminEmail = `admin-imp-admin-${Date.now()}@example.com`;
        const adminCookie = await signUpAdmin(app, testDb, adminEmail, "Password1!");

        // Create a second admin
        const secondAdminEmail = `admin2-imp-admin-${Date.now()}@example.com`;
        await signUpAdmin(app, testDb, secondAdminEmail, "Password1!");
        const secondAdminRows = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, secondAdminEmail));
        const secondAdminId = secondAdminRows[0]?.id;
        expect(secondAdminId).toBeDefined();

        const res = await app.request(`/api/admin/users/${secondAdminId}/impersonate`, {
          method: "POST",
          headers: { Cookie: adminCookie },
        });

        expect(res.status).toBe(400);
      });
    },
    30_000,
  );

  it(
    "admin cannot impersonate a suspended user — 400",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async (testDb) => {
        const { schema } = await import("@starter/db");
        const { eq } = await import("drizzle-orm");
        // biome-ignore lint/suspicious/noExplicitAny: test helper
        const db = testDb as any;
        const app = await buildTestApp();
        const adminEmail = `admin-imp-suspended-${Date.now()}@example.com`;
        const adminCookie = await signUpAdmin(app, testDb, adminEmail, "Password1!");

        const targetEmail = `target-suspended-${Date.now()}@example.com`;
        await signUp(app, targetEmail, "Password1!");
        const targetRows = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, targetEmail));
        const targetId = targetRows[0]?.id;
        expect(targetId).toBeDefined();

        // Suspend target first
        const suspendRes = await app.request(`/api/admin/users/${targetId}/suspend`, {
          method: "POST",
          headers: { Cookie: adminCookie },
        });
        expect(suspendRes.status).toBe(200);

        // Now try to impersonate the suspended user
        const res = await app.request(`/api/admin/users/${targetId}/impersonate`, {
          method: "POST",
          headers: { Cookie: adminCookie },
        });

        expect(res.status).toBe(400);
      });
    },
    30_000,
  );

  it(
    "impersonation session cookie returns target user data",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async (testDb) => {
        const { schema } = await import("@starter/db");
        const { eq } = await import("drizzle-orm");
        // biome-ignore lint/suspicious/noExplicitAny: test helper
        const db = testDb as any;
        const app = await buildTestApp();
        const adminEmail = `admin-imp-me-${Date.now()}@example.com`;
        const adminCookie = await signUpAdmin(app, testDb, adminEmail, "Password1!");

        const targetEmail = `target-imp-me-${Date.now()}@example.com`;
        await signUp(app, targetEmail, "Password1!");
        const targetRows = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, targetEmail));
        const targetId = targetRows[0]?.id;

        // Impersonate
        const impRes = await app.request(`/api/admin/users/${targetId}/impersonate`, {
          method: "POST",
          headers: { Cookie: adminCookie },
        });
        expect(impRes.status).toBe(200);
        const impCookie = impRes.headers.get("set-cookie");
        expect(impCookie).toBeTruthy();

        // Use impersonation cookie to access /me — should see target user
        const meRes = await app.request("/api/account/me", {
          headers: { Cookie: impCookie as string },
        });
        expect(meRes.status).toBe(200);
        const meBody = await meRes.json() as { id: string; email: string };
        expect(meBody.id).toBe(targetId);
        expect(meBody.email).toBe(targetEmail);
      });
    },
    30_000,
  );
});

// ---------------------------------------------------------------------------
// Un-impersonate
// ---------------------------------------------------------------------------

describe("POST /api/admin/impersonate/exit", () => {
  it(
    "exit impersonation returns 400 when not in an impersonation session",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async (testDb) => {
        const app = await buildTestApp();
        const adminEmail = `admin-exit-${Date.now()}@example.com`;
        const adminCookie = await signUpAdmin(app, testDb, adminEmail, "Password1!");

        const res = await app.request("/api/admin/impersonate/exit", {
          method: "POST",
          headers: { Cookie: adminCookie },
        });

        expect(res.status).toBe(400);
      });
    },
    30_000,
  );

  it(
    "exit impersonation restores original admin session",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async (testDb) => {
        const { schema } = await import("@starter/db");
        const { eq } = await import("drizzle-orm");
        // biome-ignore lint/suspicious/noExplicitAny: test helper
        const db = testDb as any;
        const app = await buildTestApp();
        const adminEmail = `admin-exit2-${Date.now()}@example.com`;
        const adminCookie = await signUpAdmin(app, testDb, adminEmail, "Password1!");

        const targetEmail = `target-exit-${Date.now()}@example.com`;
        await signUp(app, targetEmail, "Password1!");
        const targetRows = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, targetEmail));
        const targetId = targetRows[0]?.id;

        // Get admin user id
        const adminRows = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, adminEmail));
        const adminId = adminRows[0]?.id;

        // Impersonate target
        const impRes = await app.request(`/api/admin/users/${targetId}/impersonate`, {
          method: "POST",
          headers: { Cookie: adminCookie },
        });
        expect(impRes.status).toBe(200);
        const impCookie = impRes.headers.get("set-cookie") as string;

        // Exit impersonation
        const exitRes = await app.request("/api/admin/impersonate/exit", {
          method: "POST",
          headers: { Cookie: impCookie },
        });
        expect(exitRes.status).toBe(200);
        const exitBody = await exitRes.json() as { userId: string };
        expect(exitBody.userId).toBe(adminId);
      });
    },
    30_000,
  );
});
