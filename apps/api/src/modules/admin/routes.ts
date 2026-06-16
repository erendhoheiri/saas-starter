/**
 * Admin operator panel routes.
 *
 * Most routes are gated by authMiddleware + adminMiddleware (checks
 * user.role === 'admin' on the platform level).
 *
 * The /impersonate/exit route is special: when an admin is impersonating a
 * non-admin user, the active session belongs to the target user (not admin).
 * Applying adminMiddleware on that route would 403. So /impersonate/exit only
 * requires authMiddleware; the handler itself validates the impersonatedBy
 * field on the session as the authorization check.
 *
 * This is intentionally separate from requireRole() which checks org-level
 * membership roles — the admin concept here is the platform super-admin role
 * stored on user.role.
 */
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { authMiddleware } from "../../middleware/auth";
import {
  exitImpersonationHandler,
  impersonateUserHandler,
  listOrgsHandler,
  listUsersHandler,
  suspendUserHandler,
  unsuspendUserHandler,
} from "./handlers";

// ---------------------------------------------------------------------------
// Admin middleware
// ---------------------------------------------------------------------------

/**
 * Middleware that enforces platform admin access.
 *
 * Must be mounted after authMiddleware (relies on c.get('user') being set).
 * Checks user.role === 'admin' — this is the DB-level platform role, not the
 * org-scoped role that requireRole() checks.
 */
export function adminMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const user = c.get("user");
    if (!user || user.role !== "admin") {
      throw new HTTPException(403, { message: "Forbidden: platform admin required" });
    }
    await next();
  };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const adminRouter = new Hono();

// POST /api/admin/impersonate/exit — exit impersonation session
// Registered BEFORE the /* middleware so it matches first.
// Only auth is required here — the handler checks impersonatedBy itself.
adminRouter.post("/impersonate/exit", authMiddleware(), exitImpersonationHandler);

// Apply auth + admin check to all other admin routes
adminRouter.use("/*", authMiddleware(), adminMiddleware());

// GET /api/admin/users — list / search users
adminRouter.get("/users", listUsersHandler);

// GET /api/admin/orgs — list / search orgs
adminRouter.get("/orgs", listOrgsHandler);

// POST /api/admin/users/:userId/suspend — set bannedAt
adminRouter.post("/users/:userId/suspend", suspendUserHandler);

// POST /api/admin/users/:userId/unsuspend — clear bannedAt
adminRouter.post("/users/:userId/unsuspend", unsuspendUserHandler);

// POST /api/admin/users/:userId/impersonate — create impersonation session
adminRouter.post("/users/:userId/impersonate", impersonateUserHandler);
