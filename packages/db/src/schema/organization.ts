import { index, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { id, timestamps } from "./_helpers";
import { user } from "./auth";

/**
 * Better Auth organization-plugin tables.
 *
 * Verified against the Better Auth "Organization plugin" docs:
 *   - organization: id, name, slug (unique), logo, metadata, createdAt.
 *   - member: id, userId -> user, organizationId -> organization, role,
 *     createdAt.
 *   - invitation: id, email, inviterId, organizationId -> organization, role,
 *     status, expiresAt, createdAt.
 *
 * Extra columns we add (plan): organization.deletedAt + updatedAt, member
 * UNIQUE(userId, organizationId), and a dormant `subscription` billing slot.
 */
export const organization = pgTable("organization", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  metadata: text("metadata"),
  /** Soft-delete marker; null when the org is active. */
  deletedAt: timestamp("deleted_at"),
  ...timestamps(),
});

export const member = pgTable(
  "member",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    ...timestamps(),
  },
  (table) => [
    unique("member_user_org_unique").on(table.userId, table.organizationId),
    index("member_organization_id_idx").on(table.organizationId),
  ],
);

export const invitation = pgTable("invitation", {
  id: id(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role"),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  inviterId: text("inviter_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  ...timestamps(),
});

/**
 * Dormant billing slot. No provider logic lives here yet — this table just
 * reserves the shape so a later billing phase can wire Stripe/Polar/etc.
 * One subscription per organization.
 */
export const subscription = pgTable("subscription", {
  id: id(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("inactive"),
  plan: text("plan"),
  providerCustomerId: text("provider_customer_id"),
  providerSubId: text("provider_sub_id"),
  ...timestamps(),
});
