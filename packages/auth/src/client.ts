import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * Browser-side Better Auth client.
 *
 * `baseURL` is sourced from the `VITE_API_URL` environment variable so the
 * client works correctly in cross-origin deploys (e.g. the web app on one
 * domain talking to the API on another).  In development Vite replaces
 * `import.meta.env.VITE_API_URL` at bundle time; if the variable is unset the
 * client falls back to the same-origin default built into better-auth.
 */
export const authClient = createAuthClient({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  baseURL: (import.meta as any).env?.VITE_API_URL as string | undefined,
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
