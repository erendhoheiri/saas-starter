import { createId } from "@paralleldrive/cuid2";
import {
  index,
  type PgColumnBuilderBase,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Primary-key text column with a cuid2 default.
 *
 * We use `text` (not `uuid`) because Better Auth generates string ids and
 * stores them in text columns; matching that keeps the Drizzle adapter happy.
 */
export function id() {
  return text("id").primaryKey().$defaultFn(createId);
}

/**
 * Standard `createdAt` / `updatedAt` columns.
 *
 * Both default to `now()`; `updatedAt` also bumps on update via Drizzle's
 * `$onUpdate` hook. Stored as `timestamp` (without time zone) to match Better
 * Auth's `Date` fields.
 *
 * Awareness: `$onUpdate` fires only on writes issued through Drizzle. On
 * Better-Auth-managed tables (user/session/account/verification) Better Auth
 * does its own writes via its adapter, so `updatedAt` may not reflect those
 * writes. Don't rely on `updatedAt` as a source of truth for Better-Auth-driven
 * changes.
 */
export function timestamps() {
  return {
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  };
}

type ColumnsShape = Record<string, PgColumnBuilderBase>;

/**
 * Multi-tenant table convention.
 *
 * `tenantTable(name, columns)` defines a `pgTable` that is GUARANTEED to be
 * tenant-scoped:
 *   - it injects a NOT NULL `organizationId` text column, and
 *   - it creates an index on `organizationId`.
 *
 * Every application-domain table that belongs to a tenant MUST be declared
 * through this helper rather than `pgTable` directly, so a developer can never
 * forget to scope a table by organization. Always filter reads/writes with the
 * `scopedTo(orgId)` helper (see `src/test-helpers.ts` / query helpers).
 *
 * Note: the Better Auth core/org tables (`user`, `session`, `organization`,
 * etc.) are NOT defined via this helper — their shapes are dictated by Better
 * Auth. `tenantTable` is for the app's own per-tenant domain tables.
 */
export function tenantTable<TColumns extends ColumnsShape>(
  name: string,
  columns: TColumns,
) {
  return pgTable(
    name,
    {
      organizationId: text("organization_id").notNull(),
      ...columns,
    },
    (table) => [index(`${name}_organization_id_idx`).on(table.organizationId)],
  );
}
