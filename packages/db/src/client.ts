import { parseEnv } from "@starter/shared";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Create a Drizzle client backed by a `postgres-js` connection.
 *
 * Exposed as a factory so callers (e.g. tests) can point at an arbitrary
 * connection string such as `TEST_DATABASE_URL` instead of the default
 * `DATABASE_URL`.
 */
export function createDb(url: string) {
  const client = postgres(url);
  const db = drizzle(client, { schema });
  return { db, client };
}

export type Database = ReturnType<typeof createDb>["db"];

const env = parseEnv();

/** Shared application client, connected to `DATABASE_URL`. */
export const { db, client } = createDb(env.DATABASE_URL);

export { schema };
