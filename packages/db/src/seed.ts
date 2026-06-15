import { parseEnv } from "@starter/shared";
import { eq } from "drizzle-orm";
import { createDb } from "./client";
import { loadEnv } from "./load-env";
import { invitation, member, organization, user } from "./schema";

/**
 * Idempotent demo seed.
 *
 * Creates a platform-admin user, a regular member user, one organization,
 * their memberships (owner + member), and one pending invitation. Safe to run
 * repeatedly: it upserts by the natural keys (user.email, organization.slug,
 * member (userId, organizationId)) so reruns are no-ops.
 */
export async function seed(databaseUrl: string): Promise<void> {
  const { db, client } = createDb(databaseUrl);
  try {
    // Platform admin user (upsert by email).
    const [admin] = await db
      .insert(user)
      .values({
        name: "Demo Admin",
        email: "admin@example.com",
        emailVerified: true,
        role: "admin",
      })
      .onConflictDoUpdate({
        target: user.email,
        set: { name: "Demo Admin", role: "admin", emailVerified: true },
      })
      .returning();

    // Regular member user (upsert by email).
    const [memberUser] = await db
      .insert(user)
      .values({
        name: "Demo Member",
        email: "member@example.com",
        emailVerified: true,
        role: "user",
      })
      .onConflictDoUpdate({
        target: user.email,
        set: { name: "Demo Member", role: "user", emailVerified: true },
      })
      .returning();

    if (!admin || !memberUser) throw new Error("failed to seed users");

    // Organization (upsert by slug).
    const [org] = await db
      .insert(organization)
      .values({ name: "Demo Org", slug: "demo-org" })
      .onConflictDoUpdate({
        target: organization.slug,
        set: { name: "Demo Org" },
      })
      .returning();

    if (!org) throw new Error("failed to seed organization");

    // Memberships (upsert by the UNIQUE (userId, organizationId)).
    await db
      .insert(member)
      .values({ userId: admin.id, organizationId: org.id, role: "owner" })
      .onConflictDoUpdate({
        target: [member.userId, member.organizationId],
        set: { role: "owner" },
      });

    await db
      .insert(member)
      .values({ userId: memberUser.id, organizationId: org.id, role: "member" })
      .onConflictDoUpdate({
        target: [member.userId, member.organizationId],
        set: { role: "member" },
      });

    // Pending invitation. `invitation` has no natural unique key, so guard on a
    // manual existence check to keep the seed idempotent.
    const invitedEmail = "invitee@example.com";
    const existingInvite = await db
      .select({ id: invitation.id })
      .from(invitation)
      .where(eq(invitation.email, invitedEmail))
      .limit(1);

    if (existingInvite.length === 0) {
      await db.insert(invitation).values({
        organizationId: org.id,
        email: invitedEmail,
        role: "member",
        status: "pending",
        inviterId: admin.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    }

    console.log(
      `Seed complete: org "${org.slug}", users admin@example.com (admin) + member@example.com, 1 pending invitation.`,
    );
  } finally {
    await client.end({ timeout: 5 });
  }
}

// Run when invoked directly (`bun run db:seed`).
if (import.meta.main) {
  loadEnv();
  const env = parseEnv();
  await seed(env.DATABASE_URL);
}
