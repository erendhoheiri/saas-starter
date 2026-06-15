import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { id, timestamps } from "./_helpers";

/**
 * Better Auth core tables.
 *
 * Column shapes match Better Auth's required core schema (user, session,
 * account, verification) so the Drizzle adapter works out of the box. We add a
 * few extra application columns where noted; extra nullable columns are safe
 * for the adapter.
 *
 * Verified against the Better Auth "Database / Core schema" docs:
 *   - user.email is unique; user.emailVerified is boolean (NOT NULL).
 *   - session.token is unique; session.userId -> user.id.
 *   - account.userId -> user.id; token/expiry/scope/idToken/password nullable.
 *   - verification: identifier/value/expiresAt + timestamps.
 *   - session gains activeOrganizationId from the organization plugin.
 */
export const user = pgTable("user", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // --- Extra application columns ---
  /** Platform-level role; `'admin'` denotes a platform super-admin. */
  role: text("role").notNull().default("user"),
  /** Set when the user is banned from the platform; null otherwise. */
  bannedAt: timestamp("banned_at"),
  ...timestamps(),
});

export const session = pgTable("session", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  // Added by the organization plugin: the org the session is acting within.
  activeOrganizationId: text("active_organization_id"),
  ...timestamps(),
});

export const account = pgTable("account", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  ...timestamps(),
});

export const verification = pgTable("verification", {
  id: id(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  ...timestamps(),
});
