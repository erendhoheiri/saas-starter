/**
 * Admin application service — moderation + impersonation domain logic.
 *
 * Cookie IO is an HTTP concern and stays in the route layer; this service owns
 * the rules (self/admin/banned checks, session lifecycle) and returns plain
 * decisions the route acts on.
 */
import { createId } from "@paralleldrive/cuid2";
import type { AdminOrg, AdminUser, Paginated } from "@starter/shared";
import { HTTPException } from "hono/http-exception";
import * as repo from "./repository";

const IMPERSONATION_TTL_MS = 60 * 60 * 1000; // 1 hour

function paginate(page?: number, limit?: number) {
  const p = Math.max(1, page ?? 1);
  const l = Math.min(100, Math.max(1, limit ?? 20));
  return { page: p, limit: l, offset: (p - 1) * l };
}

export async function listUsers(query: {
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Paginated<AdminUser>> {
  const { db } = await import("@starter/db");
  const { page, limit, offset } = paginate(query.page, query.limit);
  const [data, total] = await Promise.all([
    repo.listUsers(db, { q: query.q, limit, offset }),
    repo.countUsers(db, query.q),
  ]);
  return { data: data as AdminUser[], total, page, limit };
}

export async function listOrgs(query: {
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Paginated<AdminOrg>> {
  const { db } = await import("@starter/db");
  const { page, limit, offset } = paginate(query.page, query.limit);
  const [data, total] = await Promise.all([
    repo.listOrgs(db, { q: query.q, limit, offset }),
    repo.countOrgs(db, query.q),
  ]);
  return { data: data as AdminOrg[], total, page, limit };
}

export async function suspendUser(actingUserId: string, targetUserId: string) {
  if (targetUserId === actingUserId) {
    throw new HTTPException(400, { message: "Cannot suspend yourself" });
  }
  const { db } = await import("@starter/db");
  const updated = await repo.setUserBanned(db, targetUserId, new Date());
  if (!updated) throw new HTTPException(404, { message: "User not found" });
  return { userId: targetUserId, bannedAt: updated.bannedAt };
}

export async function unsuspendUser(targetUserId: string) {
  const { db } = await import("@starter/db");
  const updated = await repo.setUserBanned(db, targetUserId, null);
  if (!updated) throw new HTTPException(404, { message: "User not found" });
  return { userId: targetUserId, bannedAt: null };
}

/**
 * Validate impersonation eligibility and create a short-lived impersonation
 * session. Returns the new session token + expiry; the route sets the cookies.
 */
export async function startImpersonation(
  actingAdminId: string,
  targetUserId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const { db } = await import("@starter/db");
  const target = await repo.findUserById(db, targetUserId);
  if (!target) {
    throw new HTTPException(404, { message: "Target user not found" });
  }
  if (targetUserId === actingAdminId) {
    throw new HTTPException(400, { message: "Cannot impersonate yourself" });
  }
  if (target.role === "admin") {
    throw new HTTPException(400, {
      message: "Cannot impersonate another admin",
    });
  }
  if (target.bannedAt) {
    throw new HTTPException(400, {
      message: "Cannot impersonate a suspended user",
    });
  }

  const token = createId();
  const expiresAt = new Date(Date.now() + IMPERSONATION_TTL_MS);
  await repo.createSession(db, {
    id: createId(),
    userId: targetUserId,
    token,
    expiresAt,
    impersonatedBy: actingAdminId,
  });
  return { token, expiresAt };
}

/**
 * Validate the current session is an impersonation, delete it, and return the
 * admin user id so the route can restore the admin's session.
 */
export async function endImpersonation(
  currentToken: string,
): Promise<{ adminUserId: string }> {
  const { db } = await import("@starter/db");
  const session = await repo.findSessionByToken(db, currentToken);
  if (!session?.impersonatedBy) {
    throw new HTTPException(400, {
      message: "Not in an impersonation session",
    });
  }
  await repo.deleteSession(db, session.id);
  return { adminUserId: session.impersonatedBy };
}

/**
 * Find the admin's most recent real (non-impersonation) session to restore,
 * returning its token + remaining lifetime in seconds, or null if none valid.
 */
export async function findRestorableSession(
  adminUserId: string,
): Promise<{ token: string; maxAge: number } | null> {
  const { db } = await import("@starter/db");
  const session = await repo.findLatestRealSession(db, adminUserId);
  if (!session || session.expiresAt <= new Date()) return null;
  const maxAge = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);
  return { token: session.token, maxAge };
}
