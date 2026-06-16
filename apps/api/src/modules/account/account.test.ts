/**
 * Integration tests for the account module.
 *
 * Requires a running Postgres at TEST_DATABASE_URL (port 5433).
 * Run with: bun test apps/api/src/modules/account/account.test.ts
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
  const { accountRouter } = await import("./routes");

  const app = new Hono();

  // Mount Better Auth
  app.all("/api/auth/*", (c) => handler(c.req.raw));

  // Mount account router
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
  if (!res.ok)
    throw new Error(`Sign-up failed (${res.status}): ${await res.text()}`);
  const cookie = res.headers.get("set-cookie");
  if (!cookie) throw new Error("No Set-Cookie on sign-up");
  return cookie;
}

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
  if (!res.ok)
    throw new Error(`Sign-in failed (${res.status}): ${await res.text()}`);
  const cookie = res.headers.get("set-cookie");
  if (!cookie) throw new Error("No Set-Cookie on sign-in");
  return cookie;
}

// ---------------------------------------------------------------------------
// GET /me
// ---------------------------------------------------------------------------

describe("GET /api/account/me — get profile", () => {
  it("returns the current user profile", async () => {
    const { withTestDb } = await import("@starter/db/test-helpers");
    await withTestDb(async () => {
      const app = await buildTestApp();
      const email = `profile-get-${Date.now()}@example.com`;
      const cookie = await signUp(app, email, "Password1!", "Alice");

      const res = await app.request("/api/account/me", {
        headers: { Cookie: cookie },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        id: string;
        email: string;
        name: string;
      };
      expect(body.email).toBe(email);
      expect(body.name).toBe("Alice");
      expect(typeof body.id).toBe("string");
    });
  }, 30_000);

  it("returns 401 when unauthenticated", async () => {
    const { withTestDb } = await import("@starter/db/test-helpers");
    await withTestDb(async () => {
      const app = await buildTestApp();
      const res = await app.request("/api/account/me");
      expect(res.status).toBe(401);
    });
  }, 30_000);
});

// ---------------------------------------------------------------------------
// PATCH /me
// ---------------------------------------------------------------------------

describe("PATCH /api/account/me — update profile", () => {
  it("updates name and returns the updated user", async () => {
    const { withTestDb } = await import("@starter/db/test-helpers");
    await withTestDb(async () => {
      const app = await buildTestApp();
      const email = `profile-patch-${Date.now()}@example.com`;
      const cookie = await signUp(app, email, "Password1!", "OldName");

      const res = await app.request("/api/account/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ name: "NewName" }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as { name: string };
      expect(body.name).toBe("NewName");
    });
  }, 30_000);

  it("returns 400 when name is empty string", async () => {
    const { withTestDb } = await import("@starter/db/test-helpers");
    await withTestDb(async () => {
      const app = await buildTestApp();
      const email = `profile-patch-bad-${Date.now()}@example.com`;
      const cookie = await signUp(app, email, "Password1!");

      const res = await app.request("/api/account/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ name: "" }),
      });

      expect(res.status).toBe(400);
    });
  }, 30_000);

  it("returns 401 when unauthenticated", async () => {
    const { withTestDb } = await import("@starter/db/test-helpers");
    await withTestDb(async () => {
      const app = await buildTestApp();
      const res = await app.request("/api/account/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Ghost" }),
      });
      expect(res.status).toBe(401);
    });
  }, 30_000);
});

// ---------------------------------------------------------------------------
// GET /export
// ---------------------------------------------------------------------------

describe("GET /api/account/export — data export", () => {
  it("returns a JSON bundle containing the user and their orgs", async () => {
    const { withTestDb } = await import("@starter/db/test-helpers");
    await withTestDb(async () => {
      const app = await buildTestApp();
      const email = `export-${Date.now()}@example.com`;
      const cookie = await signUp(app, email, "Password1!", "Exporter");

      const res = await app.request("/api/account/export", {
        headers: { Cookie: cookie },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        exportedAt: string;
        user: { email: string };
        orgs: unknown[];
      };
      expect(typeof body.exportedAt).toBe("string");
      expect(body.user.email).toBe(email);
      expect(Array.isArray(body.orgs)).toBe(true);
      // Better Auth creates a personal org on sign-up
      expect(body.orgs.length).toBeGreaterThan(0);
    });
  }, 30_000);

  it("each org entry contains org, role, and members", async () => {
    const { withTestDb } = await import("@starter/db/test-helpers");
    await withTestDb(async () => {
      const app = await buildTestApp();
      const email = `export-orgs-${Date.now()}@example.com`;
      const cookie = await signUp(app, email, "Password1!");

      const res = await app.request("/api/account/export", {
        headers: { Cookie: cookie },
      });

      const body = (await res.json()) as {
        orgs: Array<{
          org: { id: string };
          role: string;
          members: unknown[];
        }>;
      };
      const firstOrg = body.orgs[0];
      expect(firstOrg).toBeDefined();
      expect(typeof firstOrg?.org.id).toBe("string");
      expect(typeof firstOrg?.role).toBe("string");
      expect(Array.isArray(firstOrg?.members)).toBe(true);
    });
  }, 30_000);

  it("returns 401 when unauthenticated", async () => {
    const { withTestDb } = await import("@starter/db/test-helpers");
    await withTestDb(async () => {
      const app = await buildTestApp();
      const res = await app.request("/api/account/export");
      expect(res.status).toBe(401);
    });
  }, 30_000);
});

// ---------------------------------------------------------------------------
// DELETE /me — account deletion
// ---------------------------------------------------------------------------

describe("DELETE /api/account/me — delete account", () => {
  it("deletes a solo user (no org members) — soft-deletes their org and removes the user", async () => {
    const { withTestDb } = await import("@starter/db/test-helpers");
    await withTestDb(async () => {
      const { createDb, schema } = await import("@starter/db");
      const { eq } = await import("drizzle-orm");
      const app = await buildTestApp();
      const email = `delete-solo-${Date.now()}@example.com`;
      const cookie = await signUp(app, email, "Password1!");

      const { db: testDb } = createDb(process.env.TEST_DATABASE_URL as string);
      const userRows = await testDb
        .select({ id: schema.user.id })
        .from(schema.user)
        .where(eq(schema.user.email, email));
      const userId = userRows[0]?.id;
      if (!userId) throw new Error("User not found");

      const orgRows = await testDb
        .select({ id: schema.member.organizationId })
        .from(schema.member)
        .where(eq(schema.member.userId, userId));
      const orgId = orgRows[0]?.id;
      if (!orgId) throw new Error("Org not found");

      const res = await app.request("/api/account/me", {
        method: "DELETE",
        headers: { Cookie: cookie },
      });

      expect(res.status).toBe(200);

      // User should be gone
      const remaining = await testDb
        .select({ id: schema.user.id })
        .from(schema.user)
        .where(eq(schema.user.id, userId));
      expect(remaining.length).toBe(0);

      // Org should be soft-deleted (deletedAt set)
      const orgRecord = await testDb
        .select({ deletedAt: schema.organization.deletedAt })
        .from(schema.organization)
        .where(eq(schema.organization.id, orgId));
      expect(orgRecord[0]?.deletedAt).not.toBeNull();
    });
  }, 30_000);

  it("when user is sole owner with other members, reassigns ownership to next eligible member", async () => {
    const { withTestDb } = await import("@starter/db/test-helpers");
    await withTestDb(async () => {
      const { createDb, schema } = await import("@starter/db");
      const { eq, and } = await import("drizzle-orm");
      const app = await buildTestApp();

      // Sign up owner
      const ownerEmail = `delete-reassign-owner-${Date.now()}@example.com`;
      let ownerCookie = await signUp(app, ownerEmail, "Password1!");
      ownerCookie = await signIn(app, ownerEmail, "Password1!");

      const { db: testDb } = createDb(process.env.TEST_DATABASE_URL as string);

      const ownerRows = await testDb
        .select({ id: schema.user.id })
        .from(schema.user)
        .where(eq(schema.user.email, ownerEmail));
      const ownerId = ownerRows[0]?.id;
      if (!ownerId) throw new Error("Owner not found");

      const orgRows = await testDb
        .select({ id: schema.member.organizationId })
        .from(schema.member)
        .where(eq(schema.member.userId, ownerId));
      const orgId = orgRows[0]?.id;
      if (!orgId) throw new Error("Org not found");

      // Add another member (admin)
      const adminEmail = `delete-reassign-admin-${Date.now()}@example.com`;
      await signUp(app, adminEmail, "Password1!");
      const adminRows = await testDb
        .select({ id: schema.user.id })
        .from(schema.user)
        .where(eq(schema.user.email, adminEmail));
      const adminId = adminRows[0]?.id;
      if (!adminId) throw new Error("Admin not found");

      await testDb.insert(schema.member).values({
        organizationId: orgId,
        userId: adminId,
        role: "admin",
      });

      // Delete the owner's account
      const res = await app.request("/api/account/me", {
        method: "DELETE",
        headers: { Cookie: ownerCookie },
      });

      expect(res.status).toBe(200);

      // Owner should be gone
      const remaining = await testDb
        .select({ id: schema.user.id })
        .from(schema.user)
        .where(eq(schema.user.id, ownerId));
      expect(remaining.length).toBe(0);

      // Org should NOT be soft-deleted (it still has members)
      const orgRecord = await testDb
        .select({ deletedAt: schema.organization.deletedAt })
        .from(schema.organization)
        .where(eq(schema.organization.id, orgId));
      expect(orgRecord[0]?.deletedAt).toBeNull();

      // The admin should now be the owner
      const newOwner = await testDb
        .select({ role: schema.member.role })
        .from(schema.member)
        .where(
          and(
            eq(schema.member.organizationId, orgId),
            eq(schema.member.userId, adminId),
          ),
        );
      expect(newOwner[0]?.role).toBe("owner");
    });
  }, 30_000);

  it("user who is only a member (not owner) is removed from org without deleting it", async () => {
    const { withTestDb } = await import("@starter/db/test-helpers");
    await withTestDb(async () => {
      const { createDb, schema } = await import("@starter/db");
      const { eq } = await import("drizzle-orm");
      const app = await buildTestApp();

      // Sign up owner
      const ownerEmail = `delete-member-owner-${Date.now()}@example.com`;
      await signUp(app, ownerEmail, "Password1!");

      const { db: testDb } = createDb(process.env.TEST_DATABASE_URL as string);

      const ownerRows = await testDb
        .select({ id: schema.user.id })
        .from(schema.user)
        .where(eq(schema.user.email, ownerEmail));
      const ownerId = ownerRows[0]?.id;
      if (!ownerId) throw new Error("Owner not found");

      const orgRows = await testDb
        .select({ id: schema.member.organizationId })
        .from(schema.member)
        .where(eq(schema.member.userId, ownerId));
      const orgId = orgRows[0]?.id;
      if (!orgId) throw new Error("Org not found");

      // Sign up the member user and add them to the owner's org
      const memberEmail = `delete-member-user-${Date.now()}@example.com`;
      const memberCookie = await signUp(app, memberEmail, "Password1!");

      const memberRows = await testDb
        .select({ id: schema.user.id })
        .from(schema.user)
        .where(eq(schema.user.email, memberEmail));
      const memberId = memberRows[0]?.id;
      if (!memberId) throw new Error("Member not found");

      await testDb.insert(schema.member).values({
        organizationId: orgId,
        userId: memberId,
        role: "member",
      });

      // Delete the member's account
      const res = await app.request("/api/account/me", {
        method: "DELETE",
        headers: { Cookie: memberCookie },
      });

      expect(res.status).toBe(200);

      // Member user should be gone
      const remaining = await testDb
        .select({ id: schema.user.id })
        .from(schema.user)
        .where(eq(schema.user.id, memberId));
      expect(remaining.length).toBe(0);

      // Org should still be active (owner still there)
      const orgRecord = await testDb
        .select({ deletedAt: schema.organization.deletedAt })
        .from(schema.organization)
        .where(eq(schema.organization.id, orgId));
      expect(orgRecord[0]?.deletedAt).toBeNull();
    });
  }, 30_000);

  it("returns 401 when unauthenticated", async () => {
    const { withTestDb } = await import("@starter/db/test-helpers");
    await withTestDb(async () => {
      const app = await buildTestApp();
      const res = await app.request("/api/account/me", {
        method: "DELETE",
      });
      expect(res.status).toBe(401);
    });
  }, 30_000);
});

// ---------------------------------------------------------------------------
// DELETE /orgs/:orgId — org deletion
// ---------------------------------------------------------------------------

describe("DELETE /api/account/orgs/:orgId — delete org", () => {
  it("owner can soft-delete their org", async () => {
    const { withTestDb } = await import("@starter/db/test-helpers");
    await withTestDb(async () => {
      const { createDb, schema } = await import("@starter/db");
      const { eq } = await import("drizzle-orm");
      const app = await buildTestApp();

      const ownerEmail = `org-delete-owner-${Date.now()}@example.com`;
      let ownerCookie = await signUp(app, ownerEmail, "Password1!");
      ownerCookie = await signIn(app, ownerEmail, "Password1!");

      const { db: testDb } = createDb(process.env.TEST_DATABASE_URL as string);

      const ownerRows = await testDb
        .select({ id: schema.user.id })
        .from(schema.user)
        .where(eq(schema.user.email, ownerEmail));
      const ownerId = ownerRows[0]?.id;
      if (!ownerId) throw new Error("Owner not found");

      const orgRows = await testDb
        .select({ id: schema.member.organizationId })
        .from(schema.member)
        .where(eq(schema.member.userId, ownerId));
      const orgId = orgRows[0]?.id;
      if (!orgId) throw new Error("Org not found");

      const res = await app.request(`/api/account/orgs/${orgId}`, {
        method: "DELETE",
        headers: { Cookie: ownerCookie },
      });

      expect(res.status).toBe(200);

      // Org should be soft-deleted
      const orgRecord = await testDb
        .select({ deletedAt: schema.organization.deletedAt })
        .from(schema.organization)
        .where(eq(schema.organization.id, orgId));
      expect(orgRecord[0]?.deletedAt).not.toBeNull();
    });
  }, 30_000);

  it("non-owner member cannot delete the org (403)", async () => {
    const { withTestDb } = await import("@starter/db/test-helpers");
    await withTestDb(async () => {
      const { createDb, schema } = await import("@starter/db");
      const { eq } = await import("drizzle-orm");
      const app = await buildTestApp();

      const ownerEmail = `org-del-403-owner-${Date.now()}@example.com`;
      await signUp(app, ownerEmail, "Password1!");

      const { db: testDb } = createDb(process.env.TEST_DATABASE_URL as string);

      const ownerRows = await testDb
        .select({ id: schema.user.id })
        .from(schema.user)
        .where(eq(schema.user.email, ownerEmail));
      const ownerId = ownerRows[0]?.id;
      if (!ownerId) throw new Error("Owner not found");

      const orgRows = await testDb
        .select({ id: schema.member.organizationId })
        .from(schema.member)
        .where(eq(schema.member.userId, ownerId));
      const orgId = orgRows[0]?.id;
      if (!orgId) throw new Error("Org not found");

      // Add a plain member
      const memberEmail = `org-del-403-member-${Date.now()}@example.com`;
      let memberCookie = await signUp(app, memberEmail, "Password1!");
      memberCookie = await signIn(app, memberEmail, "Password1!");

      const memberRows = await testDb
        .select({ id: schema.user.id })
        .from(schema.user)
        .where(eq(schema.user.email, memberEmail));
      const memberId = memberRows[0]?.id;
      if (!memberId) throw new Error("Member not found");

      await testDb.insert(schema.member).values({
        organizationId: orgId,
        userId: memberId,
        role: "member",
      });

      const res = await app.request(`/api/account/orgs/${orgId}`, {
        method: "DELETE",
        headers: { Cookie: memberCookie },
      });

      expect(res.status).toBe(403);
    });
  }, 30_000);

  it("returns 403 when trying to delete an org the user is not a member of", async () => {
    const { withTestDb } = await import("@starter/db/test-helpers");
    await withTestDb(async () => {
      const { createDb, schema } = await import("@starter/db");
      const { eq } = await import("drizzle-orm");
      const app = await buildTestApp();

      const ownerEmail = `org-del-notmember-owner-${Date.now()}@example.com`;
      await signUp(app, ownerEmail, "Password1!");

      const { db: testDb } = createDb(process.env.TEST_DATABASE_URL as string);

      const ownerRows = await testDb
        .select({ id: schema.user.id })
        .from(schema.user)
        .where(eq(schema.user.email, ownerEmail));
      const ownerId = ownerRows[0]?.id;
      if (!ownerId) throw new Error("Owner not found");

      const orgRows = await testDb
        .select({ id: schema.member.organizationId })
        .from(schema.member)
        .where(eq(schema.member.userId, ownerId));
      const orgId = orgRows[0]?.id;
      if (!orgId) throw new Error("Org not found");

      // Different user tries to delete the org
      const otherEmail = `org-del-notmember-other-${Date.now()}@example.com`;
      const otherCookie = await signUp(app, otherEmail, "Password1!");

      const res = await app.request(`/api/account/orgs/${orgId}`, {
        method: "DELETE",
        headers: { Cookie: otherCookie },
      });

      expect(res.status).toBe(403);
    });
  }, 30_000);

  it("returns 401 when unauthenticated", async () => {
    const { withTestDb } = await import("@starter/db/test-helpers");
    await withTestDb(async () => {
      const app = await buildTestApp();
      const res = await app.request("/api/account/orgs/some-org-id", {
        method: "DELETE",
      });
      expect(res.status).toBe(401);
    });
  }, 30_000);
});
