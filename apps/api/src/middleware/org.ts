// Type-only import for schema so we can reference the organization type.
// The runtime import is lazy (inside the handler) to avoid requiring the real
// @starter/db at module-load time — tests that mock @starter/db before the
// app loads will see the mock instead of the real module.
import type { schema } from "@starter/db";
import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";

type OrgRecord = typeof schema.organization.$inferSelect;

// Extend Hono's context variable map for org + role as optional — not every
// request will have an active org context (orgMiddleware skips resolution when
// there is no activeOrganizationId), so c.get('org') may be undefined at
// runtime and downstream handlers must null-check before trusting the value.
declare module "hono" {
  interface ContextVariableMap {
    org: OrgRecord | undefined;
    role: string | undefined;
  }
}

/**
 * Hono middleware that resolves the active organization from the session.
 *
 * Reads `session.activeOrganizationId`:
 *  - If absent/null: skips org resolution (org context not required for all
 *    routes). Downstream routes can check `c.get('org')` for undefined.
 *  - If present: looks up the membership in the `member` table to confirm
 *    the authenticated user is a member of that org.
 *    - 403 if the user is not a member.
 *    - Sets `c.get('org')` and `c.get('role')` on success.
 *
 * Must be mounted after `authMiddleware()` (requires `c.get('user')` and
 * `c.get('session')` to be set).
 *
 * DB imports are lazy (inside the handler function) to keep this module safe
 * to import in test environments that mock @starter/db at the module level.
 */
export function orgMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const session = c.get("session");
    const user = c.get("user");

    const activeOrgId = session.activeOrganizationId;

    if (!activeOrgId) {
      // No active org on the session — skip org resolution and continue.
      await next();
      return;
    }

    // Lazy import: keeps the module safe in test environments that mock
    // @starter/db before app initialization.
    const { db, schema } = await import("@starter/db");
    const { and, eq } = await import("drizzle-orm");

    // Look up the organization record and the user's membership in parallel to
    // minimise latency. Both queries are intentional: the membership row alone
    // would confirm access (FK guarantees the org exists), but we also need the
    // full org record to set on the context via c.set('org', ...) for downstream
    // handlers. If this becomes a performance concern, the two queries could be
    // collapsed into a single membership JOIN that also selects org columns.
    const [orgs, memberships] = await Promise.all([
      db
        .select()
        .from(schema.organization)
        .where(eq(schema.organization.id, activeOrgId))
        .limit(1),
      db
        .select()
        .from(schema.member)
        .where(
          and(
            eq(schema.member.organizationId, activeOrgId),
            eq(schema.member.userId, user.id),
          ),
        )
        .limit(1),
    ]);

    const org = orgs[0];
    const membership = memberships[0];

    if (!org || !membership) {
      throw new HTTPException(403, {
        message: "Forbidden: not a member of the active organization",
      });
    }

    c.set("org", org);
    c.set("role", membership.role);

    await next();
  };
}

/**
 * Hono middleware factory that enforces a minimum role within the active org.
 *
 * Must be mounted after `orgMiddleware()`. Returns 403 if the user's role
 * is not included in the `allowed` list.
 *
 * @example
 *   app.delete('/org/:id', authMiddleware(), orgMiddleware(), requireRole('owner'), handler)
 */
export function requireRole(...allowed: string[]): MiddlewareHandler {
  return async (c, next) => {
    const role = c.get("role");

    if (!role || !allowed.includes(role)) {
      throw new HTTPException(403, {
        message: `Forbidden: requires one of [${allowed.join(", ")}]`,
      });
    }

    await next();
  };
}
