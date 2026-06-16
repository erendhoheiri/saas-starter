/**
 * Account routes.
 *
 * Route layout:
 *   GET    /me          — return current user profile
 *   PATCH  /me          — update profile (name, image)
 *   GET    /export      — data export bundle
 *   DELETE /me          — delete account (cascade)
 *   DELETE /orgs/:orgId — soft-delete org (owner only)
 *
 * All routes require authMiddleware. Org deletion additionally verifies
 * ownership inside the handler (no activeOrganizationId needed for this
 * endpoint — the orgId comes from the URL param).
 */
import { type ZodTypeAny } from "zod";
import { Hono } from "hono";
import { validator } from "hono/validator";
import { updateProfileSchema } from "@starter/shared";
import { authMiddleware } from "../../middleware/auth";
import {
  deleteAccountHandler,
  deleteOrgHandler,
  exportHandler,
  getMeHandler,
  updateMeHandler,
} from "./handlers";

// ---------------------------------------------------------------------------
// Validator factory
// ---------------------------------------------------------------------------

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

export const accountRouter = new Hono();

// GET /api/account/me — current user profile
accountRouter.get("/me", authMiddleware(), getMeHandler);

// PATCH /api/account/me — update profile
accountRouter.patch(
  "/me",
  authMiddleware(),
  zJson(updateProfileSchema),
  updateMeHandler,
);

// GET /api/account/export — data export
accountRouter.get("/export", authMiddleware(), exportHandler);

// DELETE /api/account/me — delete account
accountRouter.delete("/me", authMiddleware(), deleteAccountHandler);

// DELETE /api/account/orgs/:orgId — delete org (owner only)
accountRouter.delete("/orgs/:orgId", authMiddleware(), deleteOrgHandler);
