import { createId } from "@paralleldrive/cuid2";
import { parseEnv } from "@starter/shared";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb, type Database } from "./client";
import { loadEnv } from "./load-env";
import type { member, organization, user } from "./schema";

/**
 * Run `fn` against a freshly-migrated, truncated test database.
 *
 * Connects to `TEST_DATABASE_URL`, applies all migrations (idempotent), and
 * truncates every application table before invoking `fn` so each test starts
 * from a clean, isolated state. The connection is closed afterward.
 */
export async function withTestDb<T>(
  fn: (db: Database) => Promise<T>,
): Promise<T> {
  loadEnv();
  const env = parseEnv();
  const url = env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("TEST_DATABASE_URL is not set; cannot run database tests.");
  }

  const { db, client } = createDb(url);
  try {
    await migrate(db, {
      migrationsFolder: new URL("../drizzle", import.meta.url).pathname,
    });
    // The `note` table is a TEST-ONLY fixture (see src/test-fixtures/note.ts):
    // it is deliberately absent from the shipped migrations, so create it here
    // via raw DDL — mirroring the `tenantTable("note", ...)` shape — so the
    // tenant-isolation test runs against a real table without polluting
    // production migrations.
    await db.execute(
      sql.raw(`
        CREATE TABLE IF NOT EXISTS "note" (
          "organization_id" text NOT NULL,
          "id" text PRIMARY KEY NOT NULL,
          "title" text NOT NULL,
          "body" text,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        );
        CREATE INDEX IF NOT EXISTS "note_organization_id_idx"
          ON "note" USING btree ("organization_id");
      `),
    );
    await truncateAll(db);
    return await fn(db);
  } finally {
    await client.end({ timeout: 5 });
  }
}

/** Truncate every public table (except the drizzle migrations bookkeeping). */
async function truncateAll(db: Database): Promise<void> {
  const rows = await db.execute<{ tablename: string }>(sql`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '__drizzle_migrations'
  `);
  const tables = rows.map((r) => `"public"."${r.tablename}"`).join(", ");
  if (tables.length > 0) {
    await db.execute(
      sql.raw(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`),
    );
  }
}

// --- Factories ---------------------------------------------------------------

type UserInsert = typeof user.$inferInsert;
type OrgInsert = typeof organization.$inferInsert;
type MemberInsert = typeof member.$inferInsert;

/** Build a `user` insert row with sensible unique defaults. */
export function makeUser(overrides: Partial<UserInsert> = {}): UserInsert {
  const suffix = createId();
  return {
    name: `User ${suffix}`,
    email: `user-${suffix}@example.com`,
    emailVerified: true,
    ...overrides,
  };
}

/** Build an `organization` insert row with sensible unique defaults. */
export function makeOrg(overrides: Partial<OrgInsert> = {}): OrgInsert {
  const suffix = createId();
  return {
    name: `Org ${suffix}`,
    slug: `org-${suffix}`,
    ...overrides,
  };
}

/** Build a `member` insert row; `userId` and `organizationId` are required. */
export function makeMember(
  args: { userId: string; organizationId: string } & Partial<MemberInsert>,
): MemberInsert {
  return {
    role: "member",
    ...args,
  };
}
