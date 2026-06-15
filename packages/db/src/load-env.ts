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
 * `.env` parser sufficient for the project's needs. It handles `KEY=value`
 * lines, an optional leading `export ` prefix on keys, single- or double-quoted
 * values (quotes preserve inline `#`), and strips inline `# comments` from
 * unquoted values. It does not handle multi-line values or escape sequences.
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
    // Strip an optional `export ` prefix (e.g. `export KEY=value`).
    const key = line
      .slice(0, eq)
      .trim()
      .replace(/^export\s+/, "");
    if (key === "" || process.env[key] !== undefined) continue;
    let value = line.slice(eq + 1).trim();
    const quote = value[0];
    if (
      (quote === '"' || quote === "'") &&
      value.length >= 2 &&
      value.endsWith(quote)
    ) {
      // Quoted value: take what's inside the matching quotes verbatim (an
      // inline `#` inside quotes is part of the value, not a comment). The
      // `length >= 2` guard avoids mis-handling a lone quote char.
      value = value.slice(1, -1);
    } else {
      // Unquoted value: strip a trailing inline `# comment` (must be preceded
      // by whitespace so values like `a#b` are left intact), then trim.
      const hash = value.search(/\s#/);
      if (hash !== -1) value = value.slice(0, hash);
      value = value.trim();
    }
    process.env[key] = value;
  }
}
