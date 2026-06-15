export type { Auth } from "better-auth";
export { auth, handler } from "./server";

// Inferred session/user types derived from the configured auth instance.
// Consumers (e.g. the API layer) import these instead of spelling out the
// generic parameters manually.

/**
 * Session type inferred from the configured auth instance.
 *
 * The organization plugin adds `activeOrganizationId` to the session; Better
 * Auth's type inference includes it when the plugin is registered.
 */
export type Session = typeof import("./server").auth.$Infer.Session.session;

/**
 * User type inferred from the configured auth instance.
 *
 * The Drizzle adapter passes extra columns through at runtime (e.g. `bannedAt`,
 * `role`) even though they are not part of Better Auth's core type. We
 * intersect them here so that middleware can safely access these fields with
 * full type safety.
 */
export type User = typeof import("./server").auth.$Infer.Session.user & {
  /** Application-level platform role. 'admin' denotes a platform super-admin. */
  role: string;
  /** Set when the user is banned from the platform; null otherwise. */
  bannedAt: Date | null;
};
