/**
 * Admin operator panel handlers.
 *
 * All handlers require the admin middleware to have run first (which verifies
 * user.role === 'admin' and sets c.get('user')), except exitImpersonationHandler
 * which only requires authMiddleware.
 *
 * Impersonation is implemented manually (Better Auth admin plugin is not
 * configured). We create a new session row for the target user with an
 * `impersonatedBy` field pointing to the acting admin's user id, then return
 * the session token as a signed cookie (using the same Hono HMAC-SHA256 scheme
 * that Better Auth uses, keyed on AUTH_SECRET).
 *
 * All DB imports are lazy to keep this module safe in test environments.
 */

import { createId } from "@paralleldrive/cuid2";
import type { Context } from "hono";
import { setSignedCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";

// ---------------------------------------------------------------------------
// GET /users — list / search users (paginated)
// ---------------------------------------------------------------------------

export async function listUsersHandler(c: Context) {
  const { db, schema } = await import("@starter/db");
  const { ilike, or, sql } = await import("drizzle-orm");

  const page = Math.max(1, Number(c.req.query("page") ?? "1") || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number(c.req.query("limit") ?? "20") || 20),
  );
  const q = c.req.query("q");
  const offset = (page - 1) * limit;

  const whereClause = q
    ? or(ilike(schema.user.email, `%${q}%`), ilike(schema.user.name, `%${q}%`))
    : undefined;

  const [data, countResult] = await Promise.all([
    db
      .select({
        id: schema.user.id,
        email: schema.user.email,
        name: schema.user.name,
        role: schema.user.role,
        bannedAt: schema.user.bannedAt,
        createdAt: schema.user.createdAt,
      })
      .from(schema.user)
      .where(whereClause)
      .orderBy(schema.user.createdAt)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.user)
      .where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;

  return c.json({ data, total, page, limit });
}

// ---------------------------------------------------------------------------
// GET /orgs — list / search orgs (paginated)
// ---------------------------------------------------------------------------

export async function listOrgsHandler(c: Context) {
  const { db, schema } = await import("@starter/db");
  const { ilike, or, sql } = await import("drizzle-orm");

  const page = Math.max(1, Number(c.req.query("page") ?? "1") || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number(c.req.query("limit") ?? "20") || 20),
  );
  const q = c.req.query("q");
  const offset = (page - 1) * limit;

  const whereClause = q
    ? or(
        ilike(schema.organization.name, `%${q}%`),
        ilike(schema.organization.slug, `%${q}%`),
      )
    : undefined;

  const [data, countResult] = await Promise.all([
    db
      .select({
        id: schema.organization.id,
        name: schema.organization.name,
        slug: schema.organization.slug,
        deletedAt: schema.organization.deletedAt,
        createdAt: schema.organization.createdAt,
      })
      .from(schema.organization)
      .where(whereClause)
      .orderBy(schema.organization.createdAt)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.organization)
      .where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;

  return c.json({ data, total, page, limit });
}

// ---------------------------------------------------------------------------
// POST /users/:userId/suspend — set bannedAt = now()
// ---------------------------------------------------------------------------

export async function suspendUserHandler(c: Context) {
  const userId = c.req.param("userId");

  if (userId === c.get("user").id) {
    throw new HTTPException(400, { message: "Cannot suspend yourself" });
  }

  const { db, schema } = await import("@starter/db");
  const { eq } = await import("drizzle-orm");

  const updated = await db
    .update(schema.user)
    .set({ bannedAt: new Date() })
    .where(eq(schema.user.id, userId))
    .returning({ id: schema.user.id, bannedAt: schema.user.bannedAt });

  if (!updated[0]) {
    throw new HTTPException(404, { message: "User not found" });
  }

  return c.json({ success: true, userId, bannedAt: updated[0].bannedAt });
}

// ---------------------------------------------------------------------------
// POST /users/:userId/unsuspend — clear bannedAt = null
// ---------------------------------------------------------------------------

export async function unsuspendUserHandler(c: Context) {
  const userId = c.req.param("userId");
  const { db, schema } = await import("@starter/db");
  const { eq } = await import("drizzle-orm");

  const updated = await db
    .update(schema.user)
    .set({ bannedAt: null })
    .where(eq(schema.user.id, userId))
    .returning({ id: schema.user.id });

  if (!updated[0]) {
    throw new HTTPException(404, { message: "User not found" });
  }

  return c.json({ success: true, userId, bannedAt: null });
}

// ---------------------------------------------------------------------------
// Helpers for signed cookies
// ---------------------------------------------------------------------------

/**
 * Cookie name that Better Auth uses for session tokens.
 * Must match the prefix configured in server.ts (default: "better-auth").
 */
const SESSION_COOKIE_NAME = "better-auth.session_token";

/**
 * Set the Better Auth session token cookie as a Hono signed cookie.
 *
 * Hono's signed cookie format: `encodedValue.base64(HMAC-SHA256(rawValue, secret))`
 * This matches the format Better Auth reads via `ctx.getSignedCookie()`.
 */
async function setSessionTokenCookie(
  c: Context,
  token: string,
  maxAgeSeconds: number,
  authSecret?: string,
) {
  const secret =
    authSecret ??
    (await import("@starter/shared").then(
      ({ parseEnv }) => parseEnv().AUTH_SECRET,
    )) ??
    "";
  await setSignedCookie(c, SESSION_COOKIE_NAME, token, secret, {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    maxAge: maxAgeSeconds,
    secure: c.req.header("x-forwarded-proto") === "https",
  });
}

// ---------------------------------------------------------------------------
// POST /users/:userId/impersonate
// ---------------------------------------------------------------------------

/**
 * Create an impersonation session for the target user.
 *
 * We create a new session row directly in the DB with:
 *  - userId = target user id
 *  - impersonatedBy = acting admin's user id
 *  - token = a fresh cuid2
 *  - expiresAt = 1 hour from now (short-lived by design)
 *
 * The session token is returned as a signed cookie (Hono HMAC-SHA256 signed)
 * using the Better Auth cookie name so subsequent requests go through the
 * normal auth.api.getSession() flow.
 *
 * We also save the admin's current session token in an `admin_session` cookie
 * (signed) so the exit handler can restore it.
 */
export async function impersonateUserHandler(c: Context) {
  const actingAdmin = c.get("user");
  const actingAdminSession = c.get("session");
  const targetUserId = c.req.param("userId");

  const { parseEnv } = await import("@starter/shared");
  const { AUTH_SECRET } = parseEnv();

  const { db, schema } = await import("@starter/db");
  const { eq } = await import("drizzle-orm");

  // Verify target user exists
  const targetRows = await db
    .select({
      id: schema.user.id,
      bannedAt: schema.user.bannedAt,
      role: schema.user.role,
    })
    .from(schema.user)
    .where(eq(schema.user.id, targetUserId))
    .limit(1);

  const target = targetRows[0];
  if (!target) {
    throw new HTTPException(404, { message: "Target user not found" });
  }

  if (targetUserId === actingAdmin.id) {
    throw new HTTPException(400, { message: "Cannot impersonate yourself" });
  }

  if (target.role === "admin") {
    throw new HTTPException(400, {
      message: "Cannot impersonate another admin",
    });
  }

  // Prevent impersonating a banned user
  if (target.bannedAt) {
    throw new HTTPException(400, {
      message: "Cannot impersonate a suspended user",
    });
  }

  const token = createId();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.insert(schema.session).values({
    id: createId(),
    userId: targetUserId,
    token,
    expiresAt,
    impersonatedBy: actingAdmin.id,
  });

  // Set the impersonation session cookie first (signed, readable by Better Auth).
  // Setting it first ensures it is the first Set-Cookie header — tests and clients
  // that only read the first Set-Cookie value (e.g. Headers.get("set-cookie"))
  // will correctly receive the impersonation session token.
  await setSessionTokenCookie(c, token, 60 * 60, AUTH_SECRET);

  // Store the admin's current session token so exit can restore it.
  await setSignedCookie(
    c,
    "better-auth.admin_session",
    actingAdminSession.token,
    AUTH_SECRET,
    {
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      maxAge: 60 * 60, // 1 hour
      secure: c.req.header("x-forwarded-proto") === "https",
    },
  );

  return c.json({ userId: targetUserId, impersonatedBy: actingAdmin.id });
}

// ---------------------------------------------------------------------------
// POST /impersonate/exit
// ---------------------------------------------------------------------------

/**
 * Exit an impersonation session.
 *
 * Reads the current session (must have `impersonatedBy` set). We:
 * 1. Delete the impersonation session
 * 2. Try to restore the admin's session from the `admin_session` cookie
 *    (set by impersonateUserHandler). If that cookie is absent (e.g. the
 *    client only forwarded one cookie), fall back to a DB lookup: find the
 *    admin's most recent non-impersonation session.
 *
 * Returns the admin's user id in the response body.
 */
export async function exitImpersonationHandler(c: Context) {
  const currentSession = c.get("session");
  const { db, schema } = await import("@starter/db");
  const { eq, and, isNull, desc } = await import("drizzle-orm");

  // The session row needs to have impersonatedBy set.
  const sessionRows = await db
    .select({
      id: schema.session.id,
      impersonatedBy: schema.session.impersonatedBy,
      token: schema.session.token,
    })
    .from(schema.session)
    .where(eq(schema.session.token, currentSession.token))
    .limit(1);

  const sessionRow = sessionRows[0];

  if (!sessionRow || !sessionRow.impersonatedBy) {
    throw new HTTPException(400, {
      message: "Not in an impersonation session",
    });
  }

  const adminUserId = sessionRow.impersonatedBy;

  // Delete the impersonation session
  await db.delete(schema.session).where(eq(schema.session.id, sessionRow.id));

  // Try admin_session cookie first (set during impersonation)
  const { getSignedCookie, setCookie } = await import("hono/cookie");
  const { parseEnv } = await import("@starter/shared");
  const { AUTH_SECRET } = parseEnv();

  const adminSessionToken = await getSignedCookie(
    c,
    AUTH_SECRET,
    "better-auth.admin_session",
  );

  if (adminSessionToken) {
    // Restore the admin's session cookie
    await setSessionTokenCookie(
      c,
      adminSessionToken,
      7 * 24 * 60 * 60,
      AUTH_SECRET,
    );
    // Clear the admin_session cookie
    await setSignedCookie(c, "better-auth.admin_session", "", AUTH_SECRET, {
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      maxAge: 0,
      secure: c.req.header("x-forwarded-proto") === "https",
    });
  } else {
    // Cookie not available — fall back to DB lookup of admin's most recent session
    const adminSessions = await db
      .select({
        token: schema.session.token,
        expiresAt: schema.session.expiresAt,
      })
      .from(schema.session)
      .where(
        and(
          eq(schema.session.userId, adminUserId),
          isNull(schema.session.impersonatedBy),
        ),
      )
      .orderBy(desc(schema.session.createdAt))
      .limit(1);

    const adminSession = adminSessions[0];

    if (adminSession && adminSession.expiresAt > new Date()) {
      const maxAge = Math.floor(
        (adminSession.expiresAt.getTime() - Date.now()) / 1000,
      );
      await setSessionTokenCookie(c, adminSession.token, maxAge, AUTH_SECRET);
    } else {
      // No valid admin session found — clear the cookie
      setCookie(c, SESSION_COOKIE_NAME, "", {
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
        maxAge: 0,
      });
    }
  }

  return c.json({ success: true, userId: adminUserId });
}
