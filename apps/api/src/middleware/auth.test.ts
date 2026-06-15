/**
 * Integration tests for auth + org middleware.
 *
 * These tests require a running Postgres at TEST_DATABASE_URL.
 * Run with: bun test apps/api/src/middleware/auth.test.ts
 *
 * Design note: @starter/db and @starter/auth imports are lazy (inside test
 * bodies) to avoid conflicts with Bun's global mock.module() used in other
 * test files (e.g. healthReady.test.ts). Top-level imports of mocked modules
 * fail because Bun's mock.module() affects the shared module registry across
 * all workers in a single test run.
 */
import { describe, expect, it } from "bun:test";
import { Hono } from "hono";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal test Hono app with auth + org middleware on probe routes. */
async function buildTestApp() {
  // All imports are lazy to avoid top-level dependency chains that hit
  // Bun's global mock.module() from other test files (e.g. healthReady.test.ts
  // mocks @starter/db which is transitively imported by @starter/auth).
  const { handler } = await import("@starter/auth");
  const { authMiddleware } = await import("./auth");
  const { orgMiddleware, requireRole } = await import("./org");

  const app = new Hono();

  // Mount the Better Auth handler at /api/auth/*
  app.all("/api/auth/*", (c) => handler(c.req.raw));

  // Protected probe route — requires auth only
  app.get("/probe/auth", authMiddleware(), (c) => {
    const user = c.get("user");
    return c.json({ userId: user.id, email: user.email });
  });

  // Protected probe route — requires auth + org
  app.get("/probe/org", authMiddleware(), orgMiddleware(), (c) => {
    const user = c.get("user");
    const org = c.get("org");
    const role = c.get("role");
    if (!org) return c.json({ userId: user.id, orgId: null, role: null });
    return c.json({ userId: user.id, orgId: org.id, role });
  });

  // Protected probe — requires owner or admin role
  app.get(
    "/probe/admin",
    authMiddleware(),
    orgMiddleware(),
    requireRole("owner", "admin"),
    (c) => {
      return c.json({ ok: true });
    },
  );

  return app;
}

/**
 * Sign up a user via the Better Auth HTTP handler and return the Set-Cookie
 * header so subsequent requests can include it.
 */
async function signUp(
  app: Hono,
  email: string,
  password: string,
  name = "Test User",
): Promise<string> {
  const res = await app.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sign-up failed (${res.status}): ${text}`);
  }
  const cookie = res.headers.get("set-cookie");
  if (!cookie) throw new Error("No Set-Cookie on sign-up response");
  return cookie;
}

/**
 * Sign in via the Better Auth HTTP handler and return the session cookie.
 */
async function signIn(
  app: Hono,
  email: string,
  password: string,
): Promise<string> {
  const res = await app.request("/api/auth/sign-in/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sign-in failed (${res.status}): ${text}`);
  }
  const cookie = res.headers.get("set-cookie");
  if (!cookie) throw new Error("No Set-Cookie on sign-in response");
  return cookie;
}

/**
 * Set the active organization for a session via the Better Auth HTTP endpoint.
 * Returns the updated Set-Cookie header if present (session gets refreshed).
 */
async function setActiveOrg(
  app: Hono,
  cookie: string,
  organizationId: string,
): Promise<string> {
  const res = await app.request("/api/auth/organization/set-active", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ organizationId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`setActiveOrg failed (${res.status}): ${text}`);
  }
  // Return updated cookie if the server rotated it, otherwise reuse existing
  return res.headers.get("set-cookie") ?? cookie;
}

// ---------------------------------------------------------------------------
// Auth middleware tests
// ---------------------------------------------------------------------------

describe("authMiddleware", () => {
  it(
    "returns 401 when no session cookie is present",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async () => {
        const app = await buildTestApp();
        const res = await app.request("/probe/auth");
        expect(res.status).toBe(401);
      });
    },
    30_000,
  );

  it(
    "returns 200 and populates c.get('user') when session cookie is valid",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async () => {
        const app = await buildTestApp();
        const email = `auth-ok-${Date.now()}@example.com`;
        const password = "Password1!";
        const cookie = await signUp(app, email, password);

        const res = await app.request("/probe/auth", {
          headers: { Cookie: cookie },
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { userId: string; email: string };
        expect(body.email).toBe(email);
        expect(typeof body.userId).toBe("string");
      });
    },
    30_000,
  );

  it(
    "returns 401 for a banned user",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async () => {
        const { createDb, schema } = await import("@starter/db");
        const { eq } = await import("drizzle-orm");
        const app = await buildTestApp();
        const email = `banned-${Date.now()}@example.com`;
        const password = "Password1!";
        const cookie = await signUp(app, email, password);

        // Use the test db connection to ban the user.
        const { db: testDb } = createDb(
          process.env.TEST_DATABASE_URL as string,
        );
        await testDb
          .update(schema.user)
          .set({ bannedAt: new Date() })
          .where(eq(schema.user.email, email));

        const res = await app.request("/probe/auth", {
          headers: { Cookie: cookie },
        });
        expect(res.status).toBe(401);
      });
    },
    30_000,
  );
});

// ---------------------------------------------------------------------------
// Org middleware tests
// ---------------------------------------------------------------------------

describe("orgMiddleware", () => {
  it(
    "passes through without org context when activeOrganizationId is not set",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async () => {
        const app = await buildTestApp();
        const email = `noorg-${Date.now()}@example.com`;
        const password = "Password1!";
        const cookie = await signUp(app, email, password);

        // No setActiveOrg call — session.activeOrganizationId is null.
        // The org middleware should skip resolution and pass through.
        const res = await app.request("/probe/org", {
          headers: { Cookie: cookie },
        });
        // Not 403 — the middleware should not block when there's no active org.
        expect(res.status).not.toBe(403);
        // The probe returns null org fields when no active org is set.
        expect(res.status).toBe(200);
        const body = (await res.json()) as { orgId: string | null };
        expect(body.orgId).toBeNull();
      });
    },
    30_000,
  );

  it(
    "populates org + role when activeOrganizationId is set and user is a member",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async () => {
        const { createDb, schema } = await import("@starter/db");
        const { eq } = await import("drizzle-orm");
        const app = await buildTestApp();
        const email = `org-member-${Date.now()}@example.com`;
        const password = "Password1!";
        await signUp(app, email, password);
        let cookie = await signIn(app, email, password);

        // After sign-up, the databaseHook creates a personal org owned by
        // this user. Fetch it from the test db.
        const { db: testDb } = createDb(
          process.env.TEST_DATABASE_URL as string,
        );
        const users = await testDb
          .select({ id: schema.user.id })
          .from(schema.user)
          .where(eq(schema.user.email, email));
        const userId = users[0]?.id;
        if (!userId) throw new Error("User not found");

        const memberships = await testDb
          .select({
            orgId: schema.member.organizationId,
            role: schema.member.role,
          })
          .from(schema.member)
          .where(eq(schema.member.userId, userId));
        const membership = memberships[0];
        if (!membership) throw new Error("No membership found for user");

        // Set the org as active on the session
        cookie = await setActiveOrg(app, cookie, membership.orgId);

        const res = await app.request("/probe/org", {
          headers: { Cookie: cookie },
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as {
          userId: string;
          orgId: string;
          role: string;
        };
        expect(body.orgId).toBe(membership.orgId);
        expect(body.role).toBe(membership.role);
      });
    },
    30_000,
  );

  it(
    "returns 403 when user is not a member of the active org (org-scoping)",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async () => {
        const { createDb, schema } = await import("@starter/db");
        const { eq } = await import("drizzle-orm");
        const app = await buildTestApp();
        const password = "Password1!";

        // Create user A and their org
        const emailA = `orga-${Date.now()}@example.com`;
        await signUp(app, emailA, password);
        await signIn(app, emailA, password);

        // Create user B
        const emailB = `orgb-${Date.now()}@example.com`;
        await signUp(app, emailB, password);
        const cookieB = await signIn(app, emailB, password);

        // Find user A's org id
        const { db: testDb } = createDb(
          process.env.TEST_DATABASE_URL as string,
        );
        const usersA = await testDb
          .select({ id: schema.user.id })
          .from(schema.user)
          .where(eq(schema.user.email, emailA));
        const userAId = usersA[0]?.id;
        if (!userAId) throw new Error("User A not found");

        const membershipsA = await testDb
          .select({ orgId: schema.member.organizationId })
          .from(schema.member)
          .where(eq(schema.member.userId, userAId));
        const orgAId = membershipsA[0]?.orgId;
        if (!orgAId) throw new Error("Org A not found");

        // Find user B's id
        const usersB = await testDb
          .select({ id: schema.user.id })
          .from(schema.user)
          .where(eq(schema.user.email, emailB));
        const userBId = usersB[0]?.id;
        if (!userBId) throw new Error("User B not found");

        // Forcefully set user B's session's activeOrganizationId to org A's id
        // by directly updating the session row (bypassing Better Auth's
        // membership check in setActiveOrg).
        await testDb
          .update(schema.session)
          .set({ activeOrganizationId: orgAId })
          .where(eq(schema.session.userId, userBId));

        // User B now has org A as active but is not a member → 403
        const res = await app.request("/probe/org", {
          headers: { Cookie: cookieB },
        });
        expect(res.status).toBe(403);
      });
    },
    30_000,
  );
});

// ---------------------------------------------------------------------------
// requireRole tests
// ---------------------------------------------------------------------------

describe("requireRole", () => {
  it(
    "returns 403 when role is not in the allowed list",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async () => {
        const { createDb, schema } = await import("@starter/db");
        const { eq } = await import("drizzle-orm");
        const app = await buildTestApp();
        const email = `role-test-${Date.now()}@example.com`;
        const password = "Password1!";
        await signUp(app, email, password);
        let cookie = await signIn(app, email, password);

        const { db: testDb } = createDb(
          process.env.TEST_DATABASE_URL as string,
        );
        const users = await testDb
          .select({ id: schema.user.id })
          .from(schema.user)
          .where(eq(schema.user.email, email));
        const userId = users[0]?.id;
        if (!userId) throw new Error("User not found");

        const memberships = await testDb
          .select({
            id: schema.member.id,
            orgId: schema.member.organizationId,
          })
          .from(schema.member)
          .where(eq(schema.member.userId, userId));
        const membership = memberships[0];
        if (!membership) throw new Error("No membership found");

        // Downgrade role to 'member' so requireRole('owner','admin') rejects
        await testDb
          .update(schema.member)
          .set({ role: "member" })
          .where(eq(schema.member.id, membership.id));

        cookie = await setActiveOrg(app, cookie, membership.orgId);

        const res = await app.request("/probe/admin", {
          headers: { Cookie: cookie },
        });
        expect(res.status).toBe(403);
      });
    },
    30_000,
  );

  it(
    "passes through when role is in the allowed list",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async () => {
        const { createDb, schema } = await import("@starter/db");
        const { eq } = await import("drizzle-orm");
        const app = await buildTestApp();
        const email = `role-ok-${Date.now()}@example.com`;
        const password = "Password1!";
        await signUp(app, email, password);
        let cookie = await signIn(app, email, password);

        const { db: testDb } = createDb(
          process.env.TEST_DATABASE_URL as string,
        );
        const users = await testDb
          .select({ id: schema.user.id })
          .from(schema.user)
          .where(eq(schema.user.email, email));
        const userId = users[0]?.id;
        if (!userId) throw new Error("User not found");

        const memberships = await testDb
          .select({
            id: schema.member.id,
            orgId: schema.member.organizationId,
          })
          .from(schema.member)
          .where(eq(schema.member.userId, userId));
        const membership = memberships[0];
        if (!membership) throw new Error("No membership found");

        // The user is already owner (creatorRole = 'owner')
        cookie = await setActiveOrg(app, cookie, membership.orgId);

        const res = await app.request("/probe/admin", {
          headers: { Cookie: cookie },
        });
        expect(res.status).toBe(200);
      });
    },
    30_000,
  );
});
