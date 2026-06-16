/**
 * Account route handlers.
 *
 * Implements:
 *  - GET  /me          — return current user profile
 *  - PATCH /me         — update profile (name, image)
 *  - GET  /export      — return data export bundle
 *  - DELETE /me        — delete account (with cascade)
 *  - DELETE /orgs/:id  — soft-delete an org (owner only)
 *
 * All DB imports are lazy to keep this module safe in test environments that
 * mock @starter/db before app initialization.
 */
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { UpdateProfileInput } from "@starter/shared";
import { collectOrgData, collectUserData } from "./collect";

// ---------------------------------------------------------------------------
// Typed accessor for validated JSON body
// ---------------------------------------------------------------------------

function validatedJson<T>(c: Context): T {
  return c.req.valid("json" as never) as T;
}

// ---------------------------------------------------------------------------
// GET /me
// ---------------------------------------------------------------------------

export async function getMeHandler(c: Context) {
  const user = c.get("user");
  // Return a safe subset (no bannedAt, no sensitive internals)
  return c.json({
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image ?? null,
    role: user.role,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
}

// ---------------------------------------------------------------------------
// PATCH /me
// ---------------------------------------------------------------------------

export async function updateMeHandler(c: Context) {
  const user = c.get("user");
  const body = validatedJson<UpdateProfileInput>(c);

  const { db, schema } = await import("@starter/db");
  const { eq } = await import("drizzle-orm");

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.image !== undefined) updates.image = body.image;

  const updated = await db
    .update(schema.user)
    .set(updates)
    .where(eq(schema.user.id, user.id))
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

  const result = updated[0];
  if (!result) {
    throw new HTTPException(404, { message: "User not found" });
  }

  return c.json(result);
}

// ---------------------------------------------------------------------------
// GET /export
// ---------------------------------------------------------------------------

export async function exportHandler(c: Context) {
  const user = c.get("user");
  const { db } = await import("@starter/db");

  const data = await collectUserData(user.id, db);

  return c.json({
    exportedAt: new Date().toISOString(),
    ...data,
  });
}

// ---------------------------------------------------------------------------
// DELETE /me — account deletion cascade
// ---------------------------------------------------------------------------

/**
 * Deletion contract:
 * 1. For each org where user is a member:
 *    a. If NOT the sole owner → just remove the membership (cascade handles
 *       the member row when the user is deleted, but we need to check role
 *       first before deletion).
 *    b. If IS the sole owner with NO other members → soft-delete org + schedule
 *       hard-delete job.
 *    c. If IS the sole owner WITH other members → promote next eligible
 *       (admin > member) then remove user from org.
 * 2. Delete all user sessions (cascade on user delete handles this, but we
 *    do it explicitly to invalidate sessions immediately).
 * 3. Delete the user record (DB cascades remove sessions, accounts, memberships).
 */
export async function deleteAccountHandler(c: Context) {
  const user = c.get("user");
  const { db, schema } = await import("@starter/db");
  const { eq, and, ne } = await import("drizzle-orm");
  const { createJobQueue } = await import("../../lib/jobs");

  const jobs = createJobQueue();

  // Fetch all memberships for this user
  const memberships = await db
    .select({
      id: schema.member.id,
      organizationId: schema.member.organizationId,
      role: schema.member.role,
    })
    .from(schema.member)
    .where(eq(schema.member.userId, user.id));

  for (const membership of memberships) {
    const orgId = membership.organizationId;

    if (membership.role !== "owner") {
      // Not an owner — membership row will be removed by cascade when user is
      // deleted. No special action needed for the org.
      continue;
    }

    // User is owner of this org. Check if there are other owners.
    const otherOwners = await db
      .select({ id: schema.member.id, userId: schema.member.userId })
      .from(schema.member)
      .where(
        and(
          eq(schema.member.organizationId, orgId),
          eq(schema.member.role, "owner"),
          ne(schema.member.userId, user.id),
        ),
      );

    if (otherOwners.length > 0) {
      // Another owner exists — nothing special needed for this org.
      continue;
    }

    // Sole owner. Check for other members.
    const otherMembers = await db
      .select({
        id: schema.member.id,
        userId: schema.member.userId,
        role: schema.member.role,
      })
      .from(schema.member)
      .where(
        and(
          eq(schema.member.organizationId, orgId),
          ne(schema.member.userId, user.id),
        ),
      )
      .orderBy(schema.member.createdAt);

    if (otherMembers.length === 0) {
      // No other members → soft-delete org + schedule hard-delete
      await db
        .update(schema.organization)
        .set({ deletedAt: new Date() })
        .where(eq(schema.organization.id, orgId));

      jobs.schedule(
        "org.hardDelete",
        { orgId },
        30 * 24 * 60 * 60 * 1000, // 30 days
      );
    } else {
      // Has other members → promote next eligible member to owner
      // Priority: admin > member (take first by createdAt within each tier)
      const nextOwner =
        otherMembers.find((m) => m.role === "admin") ??
        otherMembers.find((m) => m.role === "member") ??
        otherMembers[0]!;

      await db
        .update(schema.member)
        .set({ role: "owner" })
        .where(eq(schema.member.id, nextOwner.id));

      // The user's own member row will be deleted by cascade when the user
      // record is deleted below.
    }
  }

  // Delete user record — DB cascades handle:
  //   session (onDelete: cascade)
  //   account (onDelete: cascade)
  //   member  (onDelete: cascade)
  await db.delete(schema.user).where(eq(schema.user.id, user.id));

  return c.json({ success: true });
}

// ---------------------------------------------------------------------------
// DELETE /orgs/:orgId — org deletion (owner only)
// ---------------------------------------------------------------------------

export async function deleteOrgHandler(c: Context) {
  const user = c.get("user");
  const orgId = c.req.param("orgId");

  const { db, schema } = await import("@starter/db");
  const { eq, and } = await import("drizzle-orm");
  const { createJobQueue } = await import("../../lib/jobs");

  // Verify the user is a member of this org and check their role
  const memberRows = await db
    .select({ id: schema.member.id, role: schema.member.role })
    .from(schema.member)
    .where(
      and(
        eq(schema.member.organizationId, orgId),
        eq(schema.member.userId, user.id),
      ),
    )
    .limit(1);

  const membership = memberRows[0];
  if (!membership) {
    throw new HTTPException(403, {
      message: "Forbidden: not a member of this organization",
    });
  }

  if (membership.role !== "owner") {
    throw new HTTPException(403, {
      message: "Forbidden: only owners can delete an organization",
    });
  }

  // Verify org exists and is not already deleted
  const orgRows = await db
    .select({ id: schema.organization.id, deletedAt: schema.organization.deletedAt })
    .from(schema.organization)
    .where(eq(schema.organization.id, orgId))
    .limit(1);

  const org = orgRows[0];
  if (!org) {
    throw new HTTPException(404, { message: "Organization not found" });
  }

  if (org.deletedAt) {
    throw new HTTPException(409, {
      message: "Organization is already scheduled for deletion",
    });
  }

  // Soft-delete
  await db
    .update(schema.organization)
    .set({ deletedAt: new Date() })
    .where(eq(schema.organization.id, orgId));

  // Schedule hard-delete job
  const jobs = createJobQueue();
  jobs.schedule(
    "org.hardDelete",
    { orgId },
    30 * 24 * 60 * 60 * 1000, // 30 days
  );

  return c.json({ success: true, orgId });
}
