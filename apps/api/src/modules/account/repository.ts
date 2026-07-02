/**
 * Account data access — every Drizzle query for the account domain lives here.
 * Functions accept a `Database` (which may be a transaction) so the service can
 * compose them inside a single transaction. DB/driver imports are lazy to keep
 * the module safe in environments that mock @starter/db before load.
 */
import type { Database, Transaction } from "@starter/db";
import type { OrgEntry, UserExport } from "@starter/shared";

/** Either the shared db handle or an open transaction. */
type Db = Database | Transaction;

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function updateUserProfile(
  db: Db,
  userId: string,
  updates: { name?: string; image?: string | null },
): Promise<SafeUser | undefined> {
  const { schema } = await import("@starter/db");
  const { eq } = await import("drizzle-orm");
  const rows = await db
    .update(schema.user)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(schema.user.id, userId))
    .returning({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      image: schema.user.image,
      role: schema.user.role,
      emailVerified: schema.user.emailVerified,
      createdAt: schema.user.createdAt,
      updatedAt: schema.user.updatedAt,
    });
  return rows[0];
}

export async function listMemberships(db: Db, userId: string) {
  const { schema } = await import("@starter/db");
  const { eq } = await import("drizzle-orm");
  return db
    .select({
      id: schema.member.id,
      organizationId: schema.member.organizationId,
      role: schema.member.role,
    })
    .from(schema.member)
    .where(eq(schema.member.userId, userId));
}

export async function listOtherOwners(
  db: Db,
  orgId: string,
  excludeUserId: string,
) {
  const { schema } = await import("@starter/db");
  const { and, eq, ne } = await import("drizzle-orm");
  return db
    .select({ id: schema.member.id, userId: schema.member.userId })
    .from(schema.member)
    .where(
      and(
        eq(schema.member.organizationId, orgId),
        eq(schema.member.role, "owner"),
        ne(schema.member.userId, excludeUserId),
      ),
    );
}

export async function listOtherMembers(
  db: Db,
  orgId: string,
  excludeUserId: string,
) {
  const { schema } = await import("@starter/db");
  const { and, eq, ne } = await import("drizzle-orm");
  return db
    .select({
      id: schema.member.id,
      userId: schema.member.userId,
      role: schema.member.role,
    })
    .from(schema.member)
    .where(
      and(
        eq(schema.member.organizationId, orgId),
        ne(schema.member.userId, excludeUserId),
      ),
    )
    .orderBy(schema.member.createdAt);
}

export async function softDeleteOrg(db: Db, orgId: string) {
  const { schema } = await import("@starter/db");
  const { eq } = await import("drizzle-orm");
  await db
    .update(schema.organization)
    .set({ deletedAt: new Date() })
    .where(eq(schema.organization.id, orgId));
}

export async function promoteMemberToOwner(db: Db, memberId: string) {
  const { schema } = await import("@starter/db");
  const { eq } = await import("drizzle-orm");
  await db
    .update(schema.member)
    .set({ role: "owner" })
    .where(eq(schema.member.id, memberId));
}

export async function deleteUser(db: Db, userId: string) {
  const { schema } = await import("@starter/db");
  const { eq } = await import("drizzle-orm");
  await db.delete(schema.user).where(eq(schema.user.id, userId));
}

export async function findMembership(db: Db, orgId: string, userId: string) {
  const { schema } = await import("@starter/db");
  const { and, eq } = await import("drizzle-orm");
  const rows = await db
    .select({ id: schema.member.id, role: schema.member.role })
    .from(schema.member)
    .where(
      and(
        eq(schema.member.organizationId, orgId),
        eq(schema.member.userId, userId),
      ),
    )
    .limit(1);
  return rows[0];
}

export async function findOrg(db: Db, orgId: string) {
  const { schema } = await import("@starter/db");
  const { eq } = await import("drizzle-orm");
  const rows = await db
    .select({
      id: schema.organization.id,
      deletedAt: schema.organization.deletedAt,
    })
    .from(schema.organization)
    .where(eq(schema.organization.id, orgId))
    .limit(1);
  return rows[0];
}

// ---------------------------------------------------------------------------
// Data-export collection (extension points as the product grows)
// ---------------------------------------------------------------------------

export async function collectUserData(
  db: Db,
  userId: string,
): Promise<UserExport> {
  const { schema } = await import("@starter/db");
  const { eq } = await import("drizzle-orm");

  const userRows = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      image: schema.user.image,
      role: schema.user.role,
      createdAt: schema.user.createdAt,
      updatedAt: schema.user.updatedAt,
    })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);

  const user = userRows[0];
  if (!user) throw new Error(`User not found: ${userId}`);

  const memberships = await db
    .select({
      organizationId: schema.member.organizationId,
      role: schema.member.role,
    })
    .from(schema.member)
    .where(eq(schema.member.userId, userId));

  const orgs = await Promise.all(
    memberships.map(async (m) => {
      const entry = await collectOrgData(db, m.organizationId);
      return { ...entry, role: m.role } as OrgEntry;
    }),
  );

  return { user, orgs };
}

export async function collectOrgData(
  db: Db,
  orgId: string,
): Promise<Omit<OrgEntry, "role">> {
  const { schema } = await import("@starter/db");
  const { eq } = await import("drizzle-orm");

  const orgRows = await db
    .select({
      id: schema.organization.id,
      name: schema.organization.name,
      slug: schema.organization.slug,
      logo: schema.organization.logo,
      metadata: schema.organization.metadata,
      deletedAt: schema.organization.deletedAt,
      createdAt: schema.organization.createdAt,
      updatedAt: schema.organization.updatedAt,
    })
    .from(schema.organization)
    .where(eq(schema.organization.id, orgId))
    .limit(1);

  const org = orgRows[0];
  if (!org) throw new Error(`Organization not found: ${orgId}`);

  const members = await db
    .select({
      id: schema.member.id,
      userId: schema.member.userId,
      role: schema.member.role,
      createdAt: schema.member.createdAt,
    })
    .from(schema.member)
    .where(eq(schema.member.organizationId, orgId));

  return { org, members };
}
