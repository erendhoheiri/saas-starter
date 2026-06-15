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
    // cascade: a membership is meaningless once its user is gone; deleting a
    // user should remove their memberships.
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // cascade is intentional: members are disposable with the org — when the
    // org is deleted these rows carry no independent meaning.
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

export const invitation = pgTable(
  "invitation",
  {
    id: id(),
    // cascade is intentional: invitations are disposable with the org — they
    // carry no independent meaning once the org is deleted.
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role"),
    status: text("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at").notNull(),
    // set null (column is nullable): deleting a user should not nuke the
    // historical invitations they sent — keep the invitation, just forget who
    // the inviter was.
    inviterId: text("inviter_id").references(() => user.id, {
      onDelete: "set null",
    }),
    ...timestamps(),
  },
  (table) => [
    index("invitation_organization_id_idx").on(table.organizationId),
    // Invites are looked up by email (seed + invite-accept API), often filtered
    // by status; a composite index serves both the email-only and
    // (email, status) lookups.
    index("invitation_email_status_idx").on(table.email, table.status),
  ],
);

/**
 * Dormant billing slot. No provider logic lives here yet — this table just
 * reserves the shape so a later billing phase can wire Stripe/Polar/etc.
 * One subscription per organization (enforced by the UNIQUE below, which also
 * serves as the organization_id lookup index).
 */
export const subscription = pgTable(
  "subscription",
  {
    id: id(),
    // restrict (not cascade): billing records must be handled explicitly at org
    // teardown (Phase 3 export-then-purge), never silently deleted with the
    // org. `restrict` forces conscious handling of billing state.
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("inactive"),
    plan: text("plan"),
    providerCustomerId: text("provider_customer_id"),
    providerSubId: text("provider_sub_id"),
    ...timestamps(),
  },
  (table) => [
    // Enforces one-subscription-per-org AND provides the organization_id
    // lookup index.
    unique("subscription_organization_id_unique").on(table.organizationId),
  ],
);
