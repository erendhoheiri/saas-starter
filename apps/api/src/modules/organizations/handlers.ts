/**
 * Organization route handlers.
 *
 * All handlers delegate to Better Auth's server-side organization API
 * (`auth.api.*`). Validation is done by `zValidator` on the route level;
 * handlers can therefore trust that `c.req.valid('json')` is well-typed.
 *
 * Imports are lazy where possible to keep this module safe in test
 * environments that mock @starter/db / @starter/auth before module load.
 */
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

// ---------------------------------------------------------------------------
// Typed accessor for validated JSON body
// ---------------------------------------------------------------------------

/**
 * Typed wrapper around `c.req.valid("json")`.
 *
 * Hono's `valid()` overload requires a literal `ValidatedData` key that the
 * TypeScript compiler knows about; "json" satisfies this at runtime but the
 * generic overload isn't always inferred correctly in handler contexts.
 * Casting to `never` silences the type error while preserving the runtime
 * value. The generic `T` gives callers proper type-safety at the call-site.
 */
function validatedJson<T>(c: Context): T {
  return c.req.valid("json" as never) as T;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Better Auth's APIError shape (from better-call/error → @better-auth/core).
 * It is not exported publicly as a class we can instanceof-check, so we duck-
 * type on the presence of statusCode (a number) to distinguish it from other
 * error types.
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

/**
 * Map a Better Auth API response to a Hono JSON response.
 * Better Auth returns `null` on some "not found" paths — surface that as 404.
 * Better Auth also throws APIError objects with statusCode for various
 * permission / business-logic failures — relay those status codes as-is.
 */
async function relayAuthResponse(c: Context, apiCall: () => Promise<unknown>) {
  try {
    const result = await apiCall();
    if (result === null || result === undefined) {
      throw new HTTPException(404, { message: "Not found" });
    }
    return c.json(result as Record<string, unknown>);
  } catch (err) {
    if (err instanceof HTTPException) throw err;
    // Better Auth throws APIError instances with a `statusCode` field — relay
    // those directly so callers see the correct HTTP status code.
    if (isBetterAuthApiError(err)) {
      const status = err.statusCode as Parameters<typeof c.json>[1];
      const message = err.body?.message ?? "Request failed";
      return c.json({ error: message }, status);
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function createOrgHandler(c: Context) {
  const { auth } = await import("@starter/auth");
  const body = validatedJson<{ name: string; slug: string }>(c);
  return relayAuthResponse(c, () =>
    auth.api.createOrganization({
      body: { name: body.name, slug: body.slug },
      headers: c.req.raw.headers,
    }),
  );
}

export async function listOrgsHandler(c: Context) {
  const { auth } = await import("@starter/auth");
  return relayAuthResponse(c, () =>
    auth.api.listOrganizations({
      headers: c.req.raw.headers,
    }),
  );
}

export async function inviteMemberHandler(c: Context) {
  const { auth } = await import("@starter/auth");
  const body = validatedJson<{
    email: string;
    role: string;
    organizationId?: string;
  }>(c);
  return relayAuthResponse(c, () =>
    // biome-ignore lint/suspicious/noExplicitAny: Better Auth's role type is
    // narrowly inferred from plugin options; we cast to any here since the
    // runtime value is validated by the Zod schema before reaching this point.
    (
      auth.api.createInvitation as (opts: {
        body: { email: string; role: unknown; organizationId?: string };
        headers: Headers;
      }) => Promise<unknown>
    )({
      body: {
        email: body.email,
        role: body.role,
        organizationId: body.organizationId,
      },
      headers: c.req.raw.headers,
    }),
  );
}

export async function acceptInvitationHandler(c: Context) {
  const { auth } = await import("@starter/auth");
  const body = validatedJson<{ invitationId: string }>(c);
  return relayAuthResponse(c, () =>
    auth.api.acceptInvitation({
      body: { invitationId: body.invitationId },
      headers: c.req.raw.headers,
    }),
  );
}

export async function updateMemberRoleHandler(c: Context) {
  const { auth } = await import("@starter/auth");
  const body = validatedJson<{
    memberId: string;
    role: string;
    organizationId?: string;
  }>(c);
  return relayAuthResponse(c, () =>
    auth.api.updateMemberRole({
      body: {
        memberId: body.memberId,
        role: body.role,
        organizationId: body.organizationId,
      },
      headers: c.req.raw.headers,
    }),
  );
}

export async function removeMemberHandler(c: Context) {
  const { auth } = await import("@starter/auth");
  const body = validatedJson<{
    memberIdOrEmail: string;
    organizationId?: string;
  }>(c);
  return relayAuthResponse(c, () =>
    auth.api.removeMember({
      body: {
        memberIdOrEmail: body.memberIdOrEmail,
        organizationId: body.organizationId,
      },
      headers: c.req.raw.headers,
    }),
  );
}

export async function setActiveOrgHandler(c: Context) {
  const { auth } = await import("@starter/auth");
  const body = validatedJson<{ organizationId?: string | null }>(c);
  return relayAuthResponse(c, () =>
    auth.api.setActiveOrganization({
      body: { organizationId: body.organizationId },
      headers: c.req.raw.headers,
    }),
  );
}
