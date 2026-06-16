/**
 * Data collection helpers for the account module.
 *
 * These are documented extension points: replace / augment to add more
 * application data to exports or deletion cascades as the product grows.
 *
 * All functions accept a Drizzle Database instance so they can be called
 * from both the production app (global `db`) and integration tests (test DB).
 */
import type { Database } from "@starter/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OrgEntry {
  org: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    metadata: string | null;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  role: string;
  members: Array<{
    id: string;
    userId: string;
    role: string;
    createdAt: Date;
  }>;
}

export interface UserExport {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  };
  orgs: OrgEntry[];
}

// ---------------------------------------------------------------------------
// collectUserData
// ---------------------------------------------------------------------------

/**
 * Collect all data associated with a user.
 *
 * Extension point: add additional tables/resources here as the product grows
 * (e.g. notes, comments, files) so data exports remain comprehensive.
 */
export async function collectUserData(
  userId: string,
  db: Database,
): Promise<UserExport> {
  const { schema } = await import("@starter/db");
  const { eq } = await import("drizzle-orm");

  // Fetch user record
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

  // Fetch all memberships for this user
  const memberships = await db
    .select({
      organizationId: schema.member.organizationId,
      role: schema.member.role,
    })
    .from(schema.member)
    .where(eq(schema.member.userId, userId));

  // Fetch org data + all org members in parallel
  const orgEntries = await Promise.all(
    memberships.map(async (m) => {
      const entry = await collectOrgData(m.organizationId, db);
      return { ...entry, role: m.role } as OrgEntry;
    }),
  );

  return { user, orgs: orgEntries };
}

// ---------------------------------------------------------------------------
// collectOrgData
// ---------------------------------------------------------------------------

/**
 * Collect all data for a single organization.
 *
 * Extension point: add additional org-scoped tables here (e.g. notes, files,
 * billing info) so org exports remain comprehensive.
 */
export async function collectOrgData(
  orgId: string,
  db: Database,
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
