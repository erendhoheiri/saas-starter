import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * Browser-side Better Auth client.
 *
 * `baseURL` is intentionally omitted so the client defaults to the same
 * origin — this is the correct behaviour when the API is served from the
 * same domain (or proxied by Vite in development).  If the web app ever
 * needs to talk to a different origin it can override this by importing
 * `createAuthClient` directly and passing `baseURL` explicitly.
 */
export const authClient = createAuthClient({
  plugins: [organizationClient()],
});

// Re-export the hooks and actions that the rest of the app needs so
// consumers never have to reach into better-auth internals directly.
export const { useSession, signIn, signOut } = authClient;

/**
 * Organization actions (list, create, setActive, getActiveMember, etc.).
 * Exposed under a single namespace so callers do `org.create(...)` etc.
 */
export const organization = authClient.organization;
