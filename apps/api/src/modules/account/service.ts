/**
 * Account application service — business rules for the account domain.
 *
 * The service owns orchestration and domain rules (deletion cascade, sole-owner
 * promotion, org soft-delete + scheduled hard-delete). It depends on the
 * repository for persistence and stays free of HTTP concerns; callers pass in
 * the authenticated user id / org id and receive plain data or throwing errors.
 */
import type { UpdateProfileInput, UserExport } from "@starter/shared";
import { HTTPException } from "hono/http-exception";
import * as repo from "./repository";

export async function getExport(userId: string): Promise<UserExport> {
  const { db } = await import("@starter/db");
  return repo.collectUserData(db, userId);
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const { db } = await import("@starter/db");
  const updates: { name?: string; image?: string | null } = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.image !== undefined) updates.image = input.image;

  const result = await repo.updateUserProfile(db, userId, updates);
  if (!result) throw new HTTPException(404, { message: "User not found" });
  return result;
}

/**
 * Delete the user's account, resolving org ownership first:
 *  - non-owner memberships: removed via cascade on user delete
 *  - sole owner, no other members: soft-delete org + schedule hard delete
 *  - sole owner with members: promote next eligible (admin > member) then leave
 */
export async function deleteAccount(userId: string): Promise<void> {
  const { db } = await import("@starter/db");
  const { jobQueue } = await import("../../lib/jobs");

  const memberships = await repo.listMemberships(db, userId);
  const orgsToSoftDelete: string[] = [];

  await db.transaction(async (tx) => {
    for (const membership of memberships) {
      const orgId = membership.organizationId;
      if (membership.role !== "owner") continue;

      const otherOwners = await repo.listOtherOwners(tx, orgId, userId);
      if (otherOwners.length > 0) continue;

      const otherMembers = await repo.listOtherMembers(tx, orgId, userId);
      if (otherMembers.length === 0) {
        await repo.softDeleteOrg(tx, orgId);
        orgsToSoftDelete.push(orgId);
      } else {
        const nextOwner =
          otherMembers.find((m) => m.role === "admin") ??
          otherMembers.find((m) => m.role === "member") ??
          otherMembers[0];
        if (nextOwner) await repo.promoteMemberToOwner(tx, nextOwner.id);
      }
    }

    await repo.deleteUser(tx, userId);
  });

  // Schedule hard-delete only after a successful commit.
  for (const orgId of orgsToSoftDelete) {
    jobQueue.schedule("org.hardDelete", { orgId }, 30 * 24 * 60 * 60 * 1000);
  }
}

/** Soft-delete an organization; only its owner may do so. */
export async function deleteOrg(userId: string, orgId: string): Promise<void> {
  const { db } = await import("@starter/db");
  const { jobQueue } = await import("../../lib/jobs");

  const membership = await repo.findMembership(db, orgId, userId);
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

  const org = await repo.findOrg(db, orgId);
  if (!org) throw new HTTPException(404, { message: "Organization not found" });
  if (org.deletedAt) {
    throw new HTTPException(409, {
      message: "Organization is already scheduled for deletion",
    });
  }

  await repo.softDeleteOrg(db, orgId);
  jobQueue.schedule("org.hardDelete", { orgId }, 30 * 24 * 60 * 60 * 1000);
}
