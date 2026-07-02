/**
 * Account routes — HTTP layer only. Handlers read the request/context, delegate
 * to the account service, and shape the JSON response.
 *
 *   GET    /me          — current user profile
 *   PATCH  /me          — update profile (name, image)
 *   GET    /export      — data export bundle
 *   DELETE /me          — delete account (cascade)
 *   DELETE /orgs/:orgId — soft-delete org (owner only)
 */

import { type UpdateProfileInput, updateProfileSchema } from "@starter/shared";
import { Hono } from "hono";
import { validator } from "hono/validator";
import type { ZodTypeAny } from "zod";
import { authMiddleware } from "../../middleware/auth";
import * as accountService from "./service";

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

export const accountRouter = new Hono();

accountRouter.get("/me", authMiddleware(), (c) => {
  const user = c.get("user");
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
});

accountRouter.patch(
  "/me",
  authMiddleware(),
  zJson(updateProfileSchema),
  async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json" as never) as UpdateProfileInput;
    const updated = await accountService.updateProfile(user.id, body);
    return c.json(updated);
  },
);

accountRouter.get("/export", authMiddleware(), async (c) => {
  const user = c.get("user");
  const data = await accountService.getExport(user.id);
  return c.json({ exportedAt: new Date().toISOString(), ...data });
});

accountRouter.delete("/me", authMiddleware(), async (c) => {
  const user = c.get("user");
  await accountService.deleteAccount(user.id);
  return c.json({ success: true });
});

accountRouter.delete("/orgs/:orgId", authMiddleware(), async (c) => {
  const user = c.get("user");
  const orgId = c.req.param("orgId");
  await accountService.deleteOrg(user.id, orgId);
  return c.json({ success: true, orgId });
});
