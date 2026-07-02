/**
 * Organization routes — HTTP layer.
 *
 * Validation runs via `zJson`; role-sensitive actions additionally require
 * orgMiddleware + requireRole. Handlers delegate to the organization service
 * and use `relay` to map Better Auth results/errors to HTTP responses.
 */

import {
  acceptInvitationSchema,
  createOrgSchema,
  inviteMemberSchema,
  removeMemberSchema,
  setActiveOrgSchema,
  updateMemberRoleSchema,
} from "@starter/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { validator } from "hono/validator";
import type { ZodTypeAny } from "zod";
import { authMiddleware } from "../../middleware/auth";
import { orgMiddleware, requireRole } from "../../middleware/org";
import * as orgService from "./service";

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

/**
 * Better Auth throws APIError objects carrying a numeric `statusCode`; it isn't
 * exported as a class, so we duck-type on that field.
 */
function isBetterAuthApiError(
  err: unknown,
): err is { statusCode: number; body?: { message?: string; code?: string } } {
  if (
    typeof err !== "object" ||
    err === null ||
    !("statusCode" in err) ||
    typeof (err as Record<string, unknown>).statusCode !== "number"
  ) {
    return false;
  }
  const code = (err as Record<string, unknown>).statusCode as number;
  return code >= 400 && code < 600;
}

/** Map a service call (Better Auth result/error) to a Hono JSON response. */
async function relay(c: Context, call: () => Promise<unknown>) {
  try {
    const result = await call();
    if (result === null || result === undefined) {
      throw new HTTPException(404, { message: "Not found" });
    }
    return c.json(result as Record<string, unknown>);
  } catch (err) {
    if (err instanceof HTTPException) throw err;
    if (isBetterAuthApiError(err)) {
      const status = err.statusCode as Parameters<typeof c.json>[1];
      return c.json({ error: err.body?.message ?? "Request failed" }, status);
    }
    throw err;
  }
}

const valid = <T>(c: Context): T => c.req.valid("json" as never) as T;

export const organizationsRouter = new Hono();

organizationsRouter.post("/", authMiddleware(), zJson(createOrgSchema), (c) =>
  relay(c, () => orgService.createOrg(c.req.raw.headers, valid(c))),
);

organizationsRouter.get("/", authMiddleware(), (c) =>
  relay(c, () => orgService.listOrgs(c.req.raw.headers)),
);

organizationsRouter.post(
  "/invite",
  authMiddleware(),
  orgMiddleware(),
  requireRole("owner", "admin"),
  zJson(inviteMemberSchema),
  (c) => relay(c, () => orgService.inviteMember(c.req.raw.headers, valid(c))),
);

organizationsRouter.post(
  "/accept-invite",
  authMiddleware(),
  zJson(acceptInvitationSchema),
  (c) =>
    relay(c, () => orgService.acceptInvitation(c.req.raw.headers, valid(c))),
);

organizationsRouter.post(
  "/members/role",
  authMiddleware(),
  orgMiddleware(),
  requireRole("owner", "admin"),
  zJson(updateMemberRoleSchema),
  (c) =>
    relay(c, () => orgService.updateMemberRole(c.req.raw.headers, valid(c))),
);

organizationsRouter.post(
  "/members/remove",
  authMiddleware(),
  orgMiddleware(),
  requireRole("owner", "admin"),
  zJson(removeMemberSchema),
  (c) => relay(c, () => orgService.removeMember(c.req.raw.headers, valid(c))),
);

organizationsRouter.post(
  "/set-active",
  authMiddleware(),
  zJson(setActiveOrgSchema),
  (c) => relay(c, () => orgService.setActiveOrg(c.req.raw.headers, valid(c))),
);
