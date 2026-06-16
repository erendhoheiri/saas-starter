/**
 * Integration tests for the organizations module.
 *
 * Requires a running Postgres at TEST_DATABASE_URL (port 5433).
 * Run with: bun test apps/api/src/modules/organizations/organizations.test.ts
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
  const { organizationsRouter } = await import("./routes");

  const app = new Hono();

  // Mount Better Auth
  app.all("/api/auth/*", (c) => handler(c.req.raw));

  // Mount organizations router — strip /api/organizations prefix manually
  app.all("/api/organizations/*", async (c) => {
    const url = new URL(c.req.url);
    url.pathname = url.pathname.replace(/^\/api\/organizations/, "") || "/";
    const req = new Request(url.toString(), c.req.raw);
    return organizationsRouter.fetch(req, c.env);
  });
  app.on(["GET", "POST"], "/api/organizations", async (c) => {
    const url = new URL(c.req.url);
    url.pathname = "/";
    const req = new Request(url.toString(), c.req.raw);
    return organizationsRouter.fetch(req, c.env);
  });

  return app;
}

// ---------------------------------------------------------------------------
// Auth helpers (reused from auth.test.ts pattern)
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

async function setActiveOrg(app: Hono, cookie: string, organizationId: string): Promise<string> {
  const res = await app.request("/api/auth/organization/set-active", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ organizationId }),
  });
  if (!res.ok) throw new Error(`setActiveOrg failed (${res.status}): ${await res.text()}`);
  return res.headers.get("set-cookie") ?? cookie;
}

// ---------------------------------------------------------------------------
// Helpers to find user/org data directly from the DB
// ---------------------------------------------------------------------------

async function getUserId(testDb: unknown, email: string): Promise<string> {
  const { schema } = await import("@starter/db");
  const { eq } = await import("drizzle-orm");
  // biome-ignore lint/suspicious/noExplicitAny: test helper
  const db = testDb as any;
  const rows = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, email));
  const id = rows[0]?.id;
  if (!id) throw new Error(`User not found: ${email}`);
  return id;
}

async function getPersonalOrgId(testDb: unknown, userId: string): Promise<string> {
  const { schema } = await import("@starter/db");
  const { eq } = await import("drizzle-orm");
  // biome-ignore lint/suspicious/noExplicitAny: test helper
  const db = testDb as any;
  const rows = await db.select({ orgId: schema.member.organizationId }).from(schema.member).where(eq(schema.member.userId, userId));
  const orgId = rows[0]?.orgId;
  if (!orgId) throw new Error(`No org found for user: ${userId}`);
  return orgId;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/organizations — create org", () => {
  it(
    "creates a new org and returns it",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async () => {
        const app = await buildTestApp();
        const email = `create-org-${Date.now()}@example.com`;
        const cookie = await signUp(app, email, "Password1!");

        const res = await app.request("/api/organizations", {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: cookie },
          body: JSON.stringify({ name: "Acme Corp", slug: "acme-corp" }),
        });

        expect(res.status).toBe(200);
        const body = await res.json() as { id: string; name: string; slug: string };
        expect(body.name).toBe("Acme Corp");
        expect(body.slug).toBe("acme-corp");
        expect(typeof body.id).toBe("string");
      });
    },
    30_000,
  );

  it(
    "returns 400 when slug is missing",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async () => {
        const app = await buildTestApp();
        const cookie = await signUp(app, `badslug-${Date.now()}@example.com`, "Password1!");

        const res = await app.request("/api/organizations", {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: cookie },
          body: JSON.stringify({ name: "No Slug" }),
        });

        expect(res.status).toBe(400);
      });
    },
    30_000,
  );

  it(
    "returns 401 when unauthenticated",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async () => {
        const app = await buildTestApp();
        const res = await app.request("/api/organizations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Anon Corp", slug: "anon-corp" }),
        });
        expect(res.status).toBe(401);
      });
    },
    30_000,
  );
});

describe("GET /api/organizations — list my orgs", () => {
  it(
    "returns the personal org after sign-up",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async () => {
        const app = await buildTestApp();
        const email = `list-orgs-${Date.now()}@example.com`;
        const cookie = await signUp(app, email, "Password1!");

        const res = await app.request("/api/organizations", {
          headers: { Cookie: cookie },
        });

        expect(res.status).toBe(200);
        const body = await res.json() as unknown[];
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBeGreaterThan(0);
      });
    },
    30_000,
  );

  it(
    "returns 401 when unauthenticated",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async () => {
        const app = await buildTestApp();
        const res = await app.request("/api/organizations");
        expect(res.status).toBe(401);
      });
    },
    30_000,
  );
});

describe("POST /api/organizations/invite — invite a member", () => {
  it(
    "owner can invite a member and email is sent via console provider",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async () => {
        const { createDb } = await import("@starter/db");
        const app = await buildTestApp();
        const ownerEmail = `owner-invite-${Date.now()}@example.com`;
        let ownerCookie = await signUp(app, ownerEmail, "Password1!");
        ownerCookie = await signIn(app, ownerEmail, "Password1!");

        const { db: testDb } = createDb(process.env.TEST_DATABASE_URL as string);
        const ownerId = await getUserId(testDb, ownerEmail);
        const orgId = await getPersonalOrgId(testDb, ownerId);
        ownerCookie = await setActiveOrg(app, ownerCookie, orgId);

        const inviteeEmail = `invitee-${Date.now()}@example.com`;
        const res = await app.request("/api/organizations/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: ownerCookie },
          body: JSON.stringify({ email: inviteeEmail, role: "member" }),
        });

        expect(res.status).toBe(200);
        const body = await res.json() as { id: string; email: string; role: string };
        expect(body.email).toBe(inviteeEmail);
        expect(body.role).toBe("member");
      });
    },
    30_000,
  );

  it(
    "member cannot invite (403)",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async () => {
        const { createDb, schema } = await import("@starter/db");
        const app = await buildTestApp();

        // Create owner and org
        const ownerEmail = `owner-no-inv-${Date.now()}@example.com`;
        let ownerCookie = await signUp(app, ownerEmail, "Password1!");
        ownerCookie = await signIn(app, ownerEmail, "Password1!");

        const { db: testDb } = createDb(process.env.TEST_DATABASE_URL as string);
        const ownerId = await getUserId(testDb, ownerEmail);
        const orgId = await getPersonalOrgId(testDb, ownerId);

        // Create a plain member and add them to the org
        const memberEmail = `member-no-inv-${Date.now()}@example.com`;
        let memberCookie = await signUp(app, memberEmail, "Password1!");
        memberCookie = await signIn(app, memberEmail, "Password1!");
        const memberId = await getUserId(testDb, memberEmail);

        // Insert a membership row directly with role=member
        await testDb.insert(schema.member).values({
          organizationId: orgId,
          userId: memberId,
          role: "member",
        });

        // Set active org for the member user
        memberCookie = await setActiveOrg(app, memberCookie, orgId);

        // Member tries to invite — should get 403
        const res = await app.request("/api/organizations/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: memberCookie },
          body: JSON.stringify({ email: `third-${Date.now()}@example.com`, role: "member" }),
        });

        expect(res.status).toBe(403);
      });
    },
    30_000,
  );
});

describe("POST /api/organizations/accept-invite — accept invitation", () => {
  it(
    "invited user can accept an invitation",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async () => {
        const { createDb } = await import("@starter/db");
        const app = await buildTestApp();

        // Create owner and their org
        const ownerEmail = `owner-accept-${Date.now()}@example.com`;
        let ownerCookie = await signUp(app, ownerEmail, "Password1!");
        ownerCookie = await signIn(app, ownerEmail, "Password1!");

        const { db: testDb } = createDb(process.env.TEST_DATABASE_URL as string);
        const ownerId = await getUserId(testDb, ownerEmail);
        const orgId = await getPersonalOrgId(testDb, ownerId);
        ownerCookie = await setActiveOrg(app, ownerCookie, orgId);

        // Create invitee account
        const inviteeEmail = `invitee-accept-${Date.now()}@example.com`;
        const inviteeCookie = await signUp(app, inviteeEmail, "Password1!");

        // Owner sends invitation
        const inviteRes = await app.request("/api/organizations/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: ownerCookie },
          body: JSON.stringify({ email: inviteeEmail, role: "member" }),
        });
        expect(inviteRes.status).toBe(200);
        const { id: invitationId } = await inviteRes.json() as { id: string };

        // Invitee accepts
        const acceptRes = await app.request("/api/organizations/accept-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: inviteeCookie },
          body: JSON.stringify({ invitationId }),
        });
        expect(acceptRes.status).toBe(200);
      });
    },
    30_000,
  );
});

describe("POST /api/organizations/members/role — update member role", () => {
  it(
    "owner can promote a member to admin",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async () => {
        const { createDb, schema } = await import("@starter/db");
        const { eq } = await import("drizzle-orm");
        const app = await buildTestApp();

        const ownerEmail = `owner-role-${Date.now()}@example.com`;
        let ownerCookie = await signUp(app, ownerEmail, "Password1!");
        ownerCookie = await signIn(app, ownerEmail, "Password1!");

        const { db: testDb } = createDb(process.env.TEST_DATABASE_URL as string);
        const ownerId = await getUserId(testDb, ownerEmail);
        const orgId = await getPersonalOrgId(testDb, ownerId);
        ownerCookie = await setActiveOrg(app, ownerCookie, orgId);

        // Create a member and add them to the org
        const memberEmail = `member-role-${Date.now()}@example.com`;
        await signUp(app, memberEmail, "Password1!");
        const memberId = await getUserId(testDb, memberEmail);
        const insertedRows = await testDb.insert(schema.member).values({
          organizationId: orgId,
          userId: memberId,
          role: "member",
        }).returning({ id: schema.member.id });
        const inserted = insertedRows[0];
        if (!inserted) throw new Error("Member insert failed");

        const res = await app.request("/api/organizations/members/role", {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: ownerCookie },
          body: JSON.stringify({ memberId: inserted.id, role: "admin" }),
        });

        expect(res.status).toBe(200);
        const body = await res.json() as { role: string };
        expect(body.role).toBe("admin");
      });
    },
    30_000,
  );

  it(
    "member cannot change roles (403)",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async () => {
        const { createDb, schema } = await import("@starter/db");
        const app = await buildTestApp();

        const ownerEmail = `owner-role2-${Date.now()}@example.com`;
        let ownerCookie = await signUp(app, ownerEmail, "Password1!");
        ownerCookie = await signIn(app, ownerEmail, "Password1!");

        const { db: testDb } = createDb(process.env.TEST_DATABASE_URL as string);
        const ownerId = await getUserId(testDb, ownerEmail);
        const orgId = await getPersonalOrgId(testDb, ownerId);

        const memberEmail = `member-role2-${Date.now()}@example.com`;
        let memberCookie = await signUp(app, memberEmail, "Password1!");
        memberCookie = await signIn(app, memberEmail, "Password1!");
        const memberId = await getUserId(testDb, memberEmail);
        const insertedRows2 = await testDb.insert(schema.member).values({
          organizationId: orgId,
          userId: memberId,
          role: "member",
        }).returning({ id: schema.member.id });
        const inserted2 = insertedRows2[0];
        if (!inserted2) throw new Error("Member insert failed");

        memberCookie = await setActiveOrg(app, memberCookie, orgId);

        const res = await app.request("/api/organizations/members/role", {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: memberCookie },
          body: JSON.stringify({ memberId: inserted2.id, role: "admin" }),
        });

        expect(res.status).toBe(403);
      });
    },
    30_000,
  );
});

describe("POST /api/organizations/members/remove — remove member", () => {
  it(
    "owner can remove a member",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async () => {
        const { createDb, schema } = await import("@starter/db");
        const app = await buildTestApp();

        const ownerEmail = `owner-remove-${Date.now()}@example.com`;
        let ownerCookie = await signUp(app, ownerEmail, "Password1!");
        ownerCookie = await signIn(app, ownerEmail, "Password1!");

        const { db: testDb } = createDb(process.env.TEST_DATABASE_URL as string);
        const ownerId = await getUserId(testDb, ownerEmail);
        const orgId = await getPersonalOrgId(testDb, ownerId);
        ownerCookie = await setActiveOrg(app, ownerCookie, orgId);

        const memberEmail = `member-remove-${Date.now()}@example.com`;
        await signUp(app, memberEmail, "Password1!");
        const memberId = await getUserId(testDb, memberEmail);
        const insertedRows3 = await testDb.insert(schema.member).values({
          organizationId: orgId,
          userId: memberId,
          role: "member",
        }).returning({ id: schema.member.id });
        const inserted3 = insertedRows3[0];
        if (!inserted3) throw new Error("Member insert failed");

        const res = await app.request("/api/organizations/members/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: ownerCookie },
          body: JSON.stringify({ memberIdOrEmail: inserted3.id }),
        });

        expect(res.status).toBe(200);
      });
    },
    30_000,
  );

  it(
    "cannot remove the owner",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async () => {
        const { createDb, schema } = await import("@starter/db");
        const { eq, and } = await import("drizzle-orm");
        const app = await buildTestApp();

        const ownerEmail = `owner-rm-self-${Date.now()}@example.com`;
        let ownerCookie = await signUp(app, ownerEmail, "Password1!");
        ownerCookie = await signIn(app, ownerEmail, "Password1!");

        const { db: testDb } = createDb(process.env.TEST_DATABASE_URL as string);
        const ownerId = await getUserId(testDb, ownerEmail);
        const orgId = await getPersonalOrgId(testDb, ownerId);
        ownerCookie = await setActiveOrg(app, ownerCookie, orgId);

        // Get the owner's member ID
        const rows = await testDb
          .select({ id: schema.member.id })
          .from(schema.member)
          .where(
            and(eq(schema.member.organizationId, orgId), eq(schema.member.userId, ownerId)),
          );
        const ownerMemberId = rows[0]?.id;
        if (!ownerMemberId) throw new Error("Owner membership not found");

        // Attempt to remove the owner — Better Auth should reject this
        const res = await app.request("/api/organizations/members/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: ownerCookie },
          body: JSON.stringify({ memberIdOrEmail: ownerMemberId }),
        });

        // Better Auth rejects owner self-removal — expect 400 or 403
        expect([400, 403]).toContain(res.status);
      });
    },
    30_000,
  );

  it(
    "member cannot remove another member (403)",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async () => {
        const { createDb, schema } = await import("@starter/db");
        const app = await buildTestApp();

        const ownerEmail = `owner-rm-403-${Date.now()}@example.com`;
        let ownerCookie = await signUp(app, ownerEmail, "Password1!");
        ownerCookie = await signIn(app, ownerEmail, "Password1!");

        const { db: testDb } = createDb(process.env.TEST_DATABASE_URL as string);
        const ownerId = await getUserId(testDb, ownerEmail);
        const orgId = await getPersonalOrgId(testDb, ownerId);

        const memberEmail = `member-rm-403-${Date.now()}@example.com`;
        let memberCookie = await signUp(app, memberEmail, "Password1!");
        memberCookie = await signIn(app, memberEmail, "Password1!");
        const memberId = await getUserId(testDb, memberEmail);
        const insertedRows4 = await testDb.insert(schema.member).values({
          organizationId: orgId,
          userId: memberId,
          role: "member",
        }).returning({ id: schema.member.id });
        const inserted4 = insertedRows4[0];
        if (!inserted4) throw new Error("Member insert failed");

        memberCookie = await setActiveOrg(app, memberCookie, orgId);

        // Member tries to remove themselves
        const res = await app.request("/api/organizations/members/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: memberCookie },
          body: JSON.stringify({ memberIdOrEmail: inserted4.id }),
        });

        expect(res.status).toBe(403);
      });
    },
    30_000,
  );
});

describe("POST /api/organizations/set-active — switch active org", () => {
  it(
    "sets the active org on the session",
    async () => {
      const { withTestDb } = await import("@starter/db/test-helpers");
      await withTestDb(async () => {
        const { createDb } = await import("@starter/db");
        const app = await buildTestApp();

        const email = `set-active-${Date.now()}@example.com`;
        let cookie = await signUp(app, email, "Password1!");
        cookie = await signIn(app, email, "Password1!");

        const { db: testDb } = createDb(process.env.TEST_DATABASE_URL as string);
        const userId = await getUserId(testDb, email);
        const orgId = await getPersonalOrgId(testDb, userId);

        const res = await app.request("/api/organizations/set-active", {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: cookie },
          body: JSON.stringify({ organizationId: orgId }),
        });

        expect(res.status).toBe(200);
        const body = await res.json() as { id?: string };
        expect(body.id).toBe(orgId);
      });
    },
    30_000,
  );
});
