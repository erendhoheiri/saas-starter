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
  const client = postgres(url, {
    // Drop the benign "already exists, skipping" NOTICEs that the migrator
    // emits on idempotent re-runs; surface everything else.
    onnotice: (notice) => {
      if (notice.code === "42P06" || notice.code === "42P07") return;
      console.warn(notice);
    },
  });
  const db = drizzle(client, { schema });
  return { db, client };
}

export type Database = ReturnType<typeof createDb>["db"];

/**
 * A transaction handle, as passed to the `db.transaction(async (tx) => …)`
 * callback. Repository functions accept `Database | Transaction` so they can be
 * composed inside a transaction.
 */
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Lazily-initialised shared application client, connected to `DATABASE_URL`.
 *
 * Initialisation is deferred until first use so that merely importing this
 * module (e.g. for the schema or `createDb`/test helpers) does not require the
 * full application env to be present — tests that only need
 * `TEST_DATABASE_URL` can import freely.
 */
let _default: ReturnType<typeof createDb> | undefined;

function getDefault() {
  if (!_default) {
    const env = parseEnv();
    _default = createDb(env.DATABASE_URL);
  }
  return _default;
}

/** Shared application Drizzle instance, connected to `DATABASE_URL`. */
export const db: Database = new Proxy({} as Database, {
  get(_t, prop) {
    return Reflect.get(getDefault().db as object, prop);
  },
});

/** Shared underlying `postgres-js` client, connected to `DATABASE_URL`. */
export const client = new Proxy({} as ReturnType<typeof createDb>["client"], {
  get(_t, prop) {
    return Reflect.get(getDefault().client as object, prop);
  },
  apply(_t, _thisArg, args) {
    return (getDefault().client as (...a: unknown[]) => unknown)(...args);
  },
});

export { schema };
