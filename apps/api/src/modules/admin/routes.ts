/**
 * Admin operator panel routes — HTTP layer.
 *
 * Most routes are gated by authMiddleware + adminMiddleware (platform
 * user.role === 'admin'). `/impersonate/exit` is the exception: while
 * impersonating, the active session belongs to the target (not the admin), so
 * that route only requires auth — the service validates `impersonatedBy`.
 *
 * Cookie IO (signed session cookies) lives here; moderation + session domain
 * logic lives in the service.
 */

import type { Context, MiddlewareHandler } from "hono";
import { Hono } from "hono";
import { getSignedCookie, setCookie, setSignedCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { authMiddleware } from "../../middleware/auth";
import * as adminService from "./service";

/** Better Auth session cookie name (must match server.ts prefix). */
const SESSION_COOKIE_NAME = "better-auth.session_token";
const ADMIN_SESSION_COOKIE = "better-auth.admin_session";

async function authSecret(): Promise<string> {
  const { parseEnv } = await import("@starter/shared");
  return parseEnv().AUTH_SECRET ?? "";
}

/** Set the Better Auth session token as a Hono signed cookie. */
async function setSessionTokenCookie(
  c: Context,
  token: string,
  maxAgeSeconds: number,
  secret: string,
) {
  await setSignedCookie(c, SESSION_COOKIE_NAME, token, secret, {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    maxAge: maxAgeSeconds,
    secure: c.req.header("x-forwarded-proto") === "https",
  });
}

/** Enforce platform admin access (relies on authMiddleware having run). */
export function adminMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    if (c.get("user")?.role !== "admin") {
      throw new HTTPException(403, {
        message: "Forbidden: platform admin required",
      });
    }
    await next();
  };
}

export const adminRouter = new Hono();

// Registered before the /* admin gate so it matches first. Only auth required.
adminRouter.post("/impersonate/exit", authMiddleware(), async (c) => {
  const current = c.get("session");
  const { adminUserId } = await adminService.endImpersonation(current.token);
  const secret = await authSecret();

  const adminToken = await getSignedCookie(c, secret, ADMIN_SESSION_COOKIE);
  if (adminToken) {
    await setSessionTokenCookie(c, adminToken, 7 * 24 * 60 * 60, secret);
    await setSignedCookie(c, ADMIN_SESSION_COOKIE, "", secret, {
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      maxAge: 0,
      secure: c.req.header("x-forwarded-proto") === "https",
    });
  } else {
    const restore = await adminService.findRestorableSession(adminUserId);
    if (restore) {
      await setSessionTokenCookie(c, restore.token, restore.maxAge, secret);
    } else {
      setCookie(c, SESSION_COOKIE_NAME, "", {
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
        maxAge: 0,
      });
    }
  }

  return c.json({ success: true, userId: adminUserId });
});

// All other admin routes require auth + platform admin.
adminRouter.use("/*", authMiddleware(), adminMiddleware());

adminRouter.get("/users", async (c) => {
  const result = await adminService.listUsers({
    q: c.req.query("q"),
    page: Number(c.req.query("page") ?? "1") || 1,
    limit: Number(c.req.query("limit") ?? "20") || 20,
  });
  return c.json(result);
});

adminRouter.get("/orgs", async (c) => {
  const result = await adminService.listOrgs({
    q: c.req.query("q"),
    page: Number(c.req.query("page") ?? "1") || 1,
    limit: Number(c.req.query("limit") ?? "20") || 20,
  });
  return c.json(result);
});

adminRouter.post("/users/:userId/suspend", async (c) => {
  const result = await adminService.suspendUser(
    c.get("user").id,
    c.req.param("userId"),
  );
  return c.json({ success: true, ...result });
});

adminRouter.post("/users/:userId/unsuspend", async (c) => {
  const result = await adminService.unsuspendUser(c.req.param("userId"));
  return c.json({ success: true, ...result });
});

adminRouter.post("/users/:userId/impersonate", async (c) => {
  const actingAdmin = c.get("user");
  const actingSession = c.get("session");
  const targetUserId = c.req.param("userId");
  const secret = await authSecret();

  const { token } = await adminService.startImpersonation(
    actingAdmin.id,
    targetUserId,
  );

  // Set the impersonation cookie first so it is the first Set-Cookie header
  // (clients that read only the first Set-Cookie get the impersonation token).
  await setSessionTokenCookie(c, token, 60 * 60, secret);
  await setSignedCookie(c, ADMIN_SESSION_COOKIE, actingSession.token, secret, {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    maxAge: 60 * 60,
    secure: c.req.header("x-forwarded-proto") === "https",
  });

  return c.json({ userId: targetUserId, impersonatedBy: actingAdmin.id });
});
