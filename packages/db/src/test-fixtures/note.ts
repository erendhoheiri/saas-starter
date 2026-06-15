import { text } from "drizzle-orm/pg-core";
import { id, tenantTable, timestamps } from "../schema/_helpers";

/**
 * TEST-ONLY fixture. This is NOT part of the shipped schema.
 *
 * It demonstrates the `tenantTable` convention (auto NOT NULL `organizationId`
 * + index on it) and serves as the fixture for the tenant-isolation test
 * (`src/schema/schema.test.ts`). It deliberately lives OUTSIDE
 * `src/schema/` so `drizzle.config.ts`'s schema glob does not pick it up and it
 * never lands in a generated migration — a clean starter clone should not
 * inherit a dead `note` table.
 *
 * The matching real table is created in the test database at runtime via raw
 * DDL in `withTestDb` (see `src/test-helpers.ts`), so the isolation test runs
 * against a genuine table while production migrations stay clean.
 *
 * When you add a real per-tenant domain table, follow this exact pattern
 * (define it via `tenantTable`, query it through `scopedTo(orgId)`), but place
 * it under `src/schema/` so it ships in migrations.
 */
export const note = tenantTable("note", {
  id: id(),
  title: text("title").notNull(),
  body: text("body"),
  ...timestamps(),
});
