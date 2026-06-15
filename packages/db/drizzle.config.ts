import { parseEnv } from "@starter/shared";
import { defineConfig } from "drizzle-kit";
import { loadEnv } from "./src/load-env";

loadEnv();
const env = parseEnv();

export default defineConfig({
  // Match only schema modules; the `!(*.test)` extglob excludes test files so
  // drizzle-kit doesn't try to load them as schema.
  schema: "./src/schema/!(*.test).ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
