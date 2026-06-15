import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Load environment variables from the nearest `.env` file walking up from
 * `startDir` to the filesystem root, into `process.env` (without overriding
 * variables that are already set).
 *
 * Bun auto-loads `.env` for scripts run via `bun run`, but `drizzle-kit`
 * executes under Node from `packages/db` and does not, so its config needs to
 * load the monorepo-root `.env` explicitly. This is a tiny dependency-free
 * `.env` parser sufficient for `KEY=value` lines.
 */
export function loadEnv(startDir: string = process.cwd()): void {
  let dir = startDir;
  for (;;) {
    const candidate = join(dir, ".env");
    if (existsSync(candidate)) {
      applyEnvFile(candidate);
      return;
    }
    const parent = dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
}

function applyEnvFile(path: string): void {
  const content = readFileSync(path, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (key === "" || process.env[key] !== undefined) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}
