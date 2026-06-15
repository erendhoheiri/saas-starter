import { text } from "drizzle-orm/pg-core";
import { id, tenantTable, timestamps } from "./_helpers";

/**
 * Example tenant-scoped application table.
 *
 * This is the canonical demonstration of the `tenantTable` convention: it is
 * defined via `tenantTable` so it automatically gains a NOT NULL
 * `organizationId` column and an index on it. Future per-tenant domain tables
 * should follow this exact pattern, and all queries against them should be
 * filtered with `scopedTo(orgId)` (see `src/query.ts`).
 *
 * It also serves as the fixture for the tenant-isolation test.
 */
export const note = tenantTable("note", {
  id: id(),
  title: text("title").notNull(),
  body: text("body"),
  ...timestamps(),
});
