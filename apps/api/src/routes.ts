/**
 * Canonical route composition for Hono RPC type inference.
 *
 * This file chains all module routers onto a single Hono instance so that
 * `AppType` can be exported and consumed by the frontend RPC client:
 *
 *   import { hc } from "hono/client"
 *   import type { AppType } from "@starter/api/routes"
 *   const client = hc<AppType>(baseUrl)
 *
 * Runtime note: this file is NOT imported by app.ts — the production app uses
 * lazy-proxy sub-apps to avoid loading DB/auth at module-load time (important
 * for unit tests that mock those modules). TypeScript only needs the *type* of
 * this module; the frontend imports it as `import type { AppType }`.
 */
import { Hono } from "hono";
import { accountRouter } from "./modules/account/routes";
import { adminRouter } from "./modules/admin/routes";
import { organizationsRouter } from "./modules/organization/routes";

const routes = new Hono()
  .route("/api/organizations", organizationsRouter)
  .route("/api/account", accountRouter)
  .route("/api/admin", adminRouter);

export type AppType = typeof routes;
export { routes };
