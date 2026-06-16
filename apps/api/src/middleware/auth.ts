import type { Session, User } from "@starter/auth";
import { auth } from "@starter/auth";
import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";

// Extend Hono's context variable map so `c.get('user')` / `c.get('session')`
// are typed throughout the app without casting.
declare module "hono" {
  interface ContextVariableMap {
    user: User;
    session: Session;
  }
}

/**
 * Hono middleware that resolves the Better Auth session from the incoming
 * request headers and populates `c.get('user')` / `c.get('session')`.
 *
 * Returns 401 when:
 *  - No valid session exists
 *  - The session's user has been banned (`bannedAt` is set)
 *
 * Note: Better Auth may serve a cached session from a signed cookie without
 * re-reading the database. To ensure ban checks are always current, we do a
 * direct DB lookup for `bannedAt` after resolving the session.
 *
 * DB imports are lazy (inside the handler function) to keep this module safe
 * to import in test environments that mock @starter/db at the module level
 * before loading the application.
 */
export function authMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    // Lazy import: keeps the module safe in test environments that mock
    // @starter/db before app initialization.
    const { db, schema } = await import("@starter/db");
    const { eq } = await import("drizzle-orm");

    // Fetch the user fresh from the DB to catch ban state changes that may
    // not be reflected in a cached Better Auth session cookie.
    const [dbUser] = await db
      .select({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        emailVerified: schema.user.emailVerified,
        image: schema.user.image,
        role: schema.user.role,
        bannedAt: schema.user.bannedAt,
        createdAt: schema.user.createdAt,
        updatedAt: schema.user.updatedAt,
      })
      .from(schema.user)
      .where(eq(schema.user.id, session.user.id))
      .limit(1);

    if (!dbUser) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    if (dbUser.bannedAt) {
      throw new HTTPException(401, { message: "Account suspended" });
    }

    // Merge the DB user (with custom fields) into the session user shape.
    const user: User = { ...session.user, ...dbUser } as User;

    c.set("user", user);
    c.set("session", session.session);

    await next();
  };
}
