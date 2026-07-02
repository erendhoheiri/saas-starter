/**
 * Admin data access — every Drizzle query for the admin domain. DB/driver
 * imports are lazy to keep the module safe under mocked-DB test environments.
 */
import type { Database } from "@starter/db";

export interface ListParams {
  q?: string;
  limit: number;
  offset: number;
}

export async function listUsers(
  db: Database,
  { q, limit, offset }: ListParams,
) {
  const { schema } = await import("@starter/db");
  const { ilike, or } = await import("drizzle-orm");
  const where = q
    ? or(ilike(schema.user.email, `%${q}%`), ilike(schema.user.name, `%${q}%`))
    : undefined;
  return db
    .select({
      id: schema.user.id,
      email: schema.user.email,
      name: schema.user.name,
      role: schema.user.role,
      bannedAt: schema.user.bannedAt,
      createdAt: schema.user.createdAt,
    })
    .from(schema.user)
    .where(where)
    .orderBy(schema.user.createdAt)
    .limit(limit)
    .offset(offset);
}

export async function countUsers(db: Database, q?: string) {
  const { schema } = await import("@starter/db");
  const { ilike, or, sql } = await import("drizzle-orm");
  const where = q
    ? or(ilike(schema.user.email, `%${q}%`), ilike(schema.user.name, `%${q}%`))
    : undefined;
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.user)
    .where(where);
  return rows[0]?.count ?? 0;
}

export async function listOrgs(db: Database, { q, limit, offset }: ListParams) {
  const { schema } = await import("@starter/db");
  const { ilike, or } = await import("drizzle-orm");
  const where = q
    ? or(
        ilike(schema.organization.name, `%${q}%`),
        ilike(schema.organization.slug, `%${q}%`),
      )
    : undefined;
  return db
    .select({
      id: schema.organization.id,
      name: schema.organization.name,
      slug: schema.organization.slug,
      deletedAt: schema.organization.deletedAt,
      createdAt: schema.organization.createdAt,
    })
    .from(schema.organization)
    .where(where)
    .orderBy(schema.organization.createdAt)
    .limit(limit)
    .offset(offset);
}

export async function countOrgs(db: Database, q?: string) {
  const { schema } = await import("@starter/db");
  const { ilike, or, sql } = await import("drizzle-orm");
  const where = q
    ? or(
        ilike(schema.organization.name, `%${q}%`),
        ilike(schema.organization.slug, `%${q}%`),
      )
    : undefined;
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.organization)
    .where(where);
  return rows[0]?.count ?? 0;
}

export async function setUserBanned(
  db: Database,
  userId: string,
  bannedAt: Date | null,
) {
  const { schema } = await import("@starter/db");
  const { eq } = await import("drizzle-orm");
  const rows = await db
    .update(schema.user)
    .set({ bannedAt })
    .where(eq(schema.user.id, userId))
    .returning({ id: schema.user.id, bannedAt: schema.user.bannedAt });
  return rows[0];
}

export async function findUserById(db: Database, userId: string) {
  const { schema } = await import("@starter/db");
  const { eq } = await import("drizzle-orm");
  const rows = await db
    .select({
      id: schema.user.id,
      bannedAt: schema.user.bannedAt,
      role: schema.user.role,
    })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);
  return rows[0];
}

export async function createSession(
  db: Database,
  values: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    impersonatedBy: string;
  },
) {
  const { schema } = await import("@starter/db");
  await db.insert(schema.session).values(values);
}

export async function findSessionByToken(db: Database, token: string) {
  const { schema } = await import("@starter/db");
  const { eq } = await import("drizzle-orm");
  const rows = await db
    .select({
      id: schema.session.id,
      impersonatedBy: schema.session.impersonatedBy,
      token: schema.session.token,
    })
    .from(schema.session)
    .where(eq(schema.session.token, token))
    .limit(1);
  return rows[0];
}

export async function deleteSession(db: Database, sessionId: string) {
  const { schema } = await import("@starter/db");
  const { eq } = await import("drizzle-orm");
  await db.delete(schema.session).where(eq(schema.session.id, sessionId));
}

export async function findLatestRealSession(db: Database, userId: string) {
  const { schema } = await import("@starter/db");
  const { and, desc, eq, isNull } = await import("drizzle-orm");
  const rows = await db
    .select({
      token: schema.session.token,
      expiresAt: schema.session.expiresAt,
    })
    .from(schema.session)
    .where(
      and(
        eq(schema.session.userId, userId),
        isNull(schema.session.impersonatedBy),
      ),
    )
    .orderBy(desc(schema.session.createdAt))
    .limit(1);
  return rows[0];
}
