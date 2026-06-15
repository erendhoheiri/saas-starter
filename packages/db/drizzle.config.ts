import { parseEnv } from "@starter/shared";
import { defineConfig } from "drizzle-kit";
import { loadEnv } from "./src/load-env";

loadEnv();
const env = parseEnv();

export default defineConfig({
  schema: "./src/schema/*",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
