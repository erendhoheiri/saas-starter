/**
 * Organization routes.
 *
 * All routes are protected by authMiddleware. Role-sensitive actions also
 * require orgMiddleware + requireRole.
 *
 * Zod validation uses hono's built-in `validator` middleware wrapping Zod so
 * that we don't need an additional @hono/zod-validator dependency.
 */

import {
  acceptInvitationSchema,
  createOrgSchema,
  inviteMemberSchema,
  removeMemberSchema,
  setActiveOrgSchema,
  updateMemberRoleSchema,
} from "@starter/shared";
import { Hono } from "hono";
import { validator } from "hono/validator";
import type { ZodTypeAny } from "zod";
import { authMiddleware } from "../../middleware/auth";
import { orgMiddleware, requireRole } from "../../middleware/org";
import {
  acceptInvitationHandler,
  createOrgHandler,
  inviteMemberHandler,
  listOrgsHandler,
  removeMemberHandler,
  setActiveOrgHandler,
  updateMemberRoleHandler,
} from "./handlers";

// ---------------------------------------------------------------------------
// Validator factory
// ---------------------------------------------------------------------------

/**
 * Build a hono `validator` that parses the JSON body with a Zod schema.
 * Returns 400 with the first Zod error message on failure.
 */
function zJson<T extends ZodTypeAny>(schema: T) {
  return validator("json", (value, c) => {
    const result = schema.safeParse(value);
    if (!result.success) {
      return c.json(
        { error: result.error.issues[0]?.message ?? "Validation error" },
        400,
      );
    }
    return result.data as T["_output"];
  });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const organizationsRouter = new Hono();

// POST /api/organizations — create a new org
organizationsRouter.post(
  "/",
  authMiddleware(),
  zJson(createOrgSchema),
  createOrgHandler,
);

// GET /api/organizations — list orgs the current user belongs to
organizationsRouter.get("/", authMiddleware(), listOrgsHandler);

// POST /api/organizations/invite — invite a member (owner/admin only)
organizationsRouter.post(
  "/invite",
  authMiddleware(),
  orgMiddleware(),
  requireRole("owner", "admin"),
  zJson(inviteMemberSchema),
  inviteMemberHandler,
);

// POST /api/organizations/accept-invite — accept an invitation
organizationsRouter.post(
  "/accept-invite",
  authMiddleware(),
  zJson(acceptInvitationSchema),
  acceptInvitationHandler,
);

// POST /api/organizations/members/role — update a member's role (owner/admin only)
organizationsRouter.post(
  "/members/role",
  authMiddleware(),
  orgMiddleware(),
  requireRole("owner", "admin"),
  zJson(updateMemberRoleSchema),
  updateMemberRoleHandler,
);

// POST /api/organizations/members/remove — remove a member (owner/admin only)
organizationsRouter.post(
  "/members/remove",
  authMiddleware(),
  orgMiddleware(),
  requireRole("owner", "admin"),
  zJson(removeMemberSchema),
  removeMemberHandler,
);

// POST /api/organizations/set-active — switch active org
organizationsRouter.post(
  "/set-active",
  authMiddleware(),
  zJson(setActiveOrgSchema),
  setActiveOrgHandler,
);
