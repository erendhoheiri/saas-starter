import { and, eq, type SQL } from "drizzle-orm";

/**
 * Any table that follows the `tenantTable` convention, i.e. exposes an
 * `organizationId` column.
 */
type TenantScoped = { organizationId: Parameters<typeof eq>[0] };

/**
 * Build a WHERE predicate that scopes a query to a single organization.
 *
 * This is the canonical guard for reading/writing tenant-scoped tables: pass
 * the table and the acting organization's id, plus any additional predicates,
 * and the result is `organizationId = :orgId AND (...extra)`.
 *
 * Using this helper consistently is how cross-organization reads are prevented
 * — a query that goes through `scopedTo` can never return another tenant's
 * rows. See `src/schema/schema.test.ts` for the isolation guarantee.
 *
 * @example
 *   db.select().from(note).where(scopedTo(note, orgId));
 *   db.select().from(note).where(scopedTo(note, orgId, eq(note.title, "x")));
 */
export function scopedTo<T extends TenantScoped>(
  table: T,
  organizationId: string,
  ...extra: Array<SQL | undefined>
): SQL {
  const predicate = and(eq(table.organizationId, organizationId), ...extra);
  // `and` returns SQL when given at least one defined argument, which is always
  // the case here because the org-id equality is present.
  return predicate as SQL;
}
