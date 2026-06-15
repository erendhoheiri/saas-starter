# SaaS Starter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a reusable SaaS starter monorepo (Bun + Hono + React + Drizzle/Postgres + Better Auth) with org-scoped multi-tenancy, accounts, an operator admin panel, and account/org deletion + export — so new projects begin at the core feature.

**Architecture:** Bun workspaces + Turborepo monorepo. `apps/api` (Hono on `Bun.serve`, feature-module layout, Hono RPC) and `apps/web` (React + Vite SPA, TanStack Router/Query). Shared `packages/` hold the Drizzle schema/client (`db`), Better Auth config (`auth`), Zod schemas/types (`shared`), and tooling config (`config`). Every external dependency (email, storage, jobs) sits behind an interface with a dev implementation, so the stack boots with zero external accounts. Multi-tenancy is org-scoped from day one; solo users get a default personal org.

**Tech Stack:** Bun, Turborepo, Hono, Hono RPC, React, Vite, TanStack Router, TanStack Query, react-hook-form, Tailwind, shadcn/ui, PostgreSQL, Drizzle ORM, Better Auth (+ organization plugin), Zod, Biome, Docker Compose, GitHub Actions.

**Deferred:** Visual design system / theming polish (functional shadcn defaults only for now). Billing provider (clean schema slot only). 2FA, i18n, notifications, audit logs, API keys, webhooks, search.

**Testing note:** `bun test` everywhere. Backend favors integration tests against a real test Postgres (most multi-tenant bugs are scoping/cascade bugs that unit tests miss). Frontend gets light smoke tests. TDD where there is real logic; for pure scaffolding/config tasks the "test" is a boot/typecheck command with expected output.

---

## Phase 0 — Repository foundation

### Task 0.1: Initialize git + base files

**Files:**
- Create: `.gitignore`, `README.md`, `.editorconfig`

**Step 1:** Run `git init` in the project root.
Expected: "Initialized empty Git repository".

**Step 2:** Create `.gitignore` with: `node_modules/`, `dist/`, `.env`, `.env.*` (but not `.env.example`), `.turbo/`, `*.log`, `coverage/`, `.DS_Store`, `bun.lockb` kept (commit the lockfile).

**Step 3:** Create a minimal `README.md` (project name, one-line description, the "clone and go" quickstart block from the design doc) and a standard `.editorconfig`.

**Step 4: Commit**
```bash
git add .gitignore README.md .editorconfig
git commit -m "chore: initialize repository"
```

### Task 0.2: Bun workspaces + Turborepo skeleton

**Files:**
- Create: root `package.json`, `turbo.json`, `bunfig.toml`
- Create: empty dirs `apps/`, `packages/`

**Step 1:** Root `package.json` with `"private": true`, `"workspaces": ["apps/*", "packages/*"]`, `"packageManager": "bun@<latest>"`, and root scripts that delegate to turbo: `dev`, `build`, `test`, `lint`, `format`, `typecheck` (each `turbo run <task>`), plus `db:*` scripts that filter to `@starter/db`.

**Step 2:** `turbo.json` with pipeline: `build` (dependsOn `^build`, outputs `dist/**`), `test` (dependsOn `^build`), `lint`, `typecheck`, and `dev` (cache false, persistent true).

**Step 3:** Run `bun install`.
Expected: lockfile created, no errors.

**Step 4: Commit**
```bash
git add -A
git commit -m "chore: scaffold bun workspaces + turborepo"
```

### Task 0.3: Shared tooling config (`packages/config`)

**Files:**
- Create: `packages/config/package.json` (name `@starter/config`), `packages/config/tsconfig.base.json` (strict mode on), `packages/config/biome.json`

**Step 1:** `tsconfig.base.json`: `strict: true`, `moduleResolution: "bundler"`, `target: "ESNext"`, `verbatimModuleSyntax`, `noUncheckedIndexedAccess: true`.

**Step 2:** `biome.json`: enable linter + formatter, recommended rules, organize imports.

**Step 3:** Add root `biome.json` extending `@starter/config`. Run `bun run format` and `bun run lint`.
Expected: passes on the (near-empty) tree.

**Step 4: Commit** `chore: add shared tsconfig and biome config`.

### Task 0.4: Local Postgres via Docker Compose + env validation package

**Files:**
- Create: `docker-compose.yml`, `.env.example`
- Create: `packages/shared/src/env.ts` (or a dedicated `packages/config/env.ts`)

**Step 1:** `docker-compose.yml`: a `postgres:16` service, named volume, ports `5432:5432`, env for db/user/password matching `.env.example`. Add a second `postgres-test` service on `5433` for the test database.

**Step 2:** `.env.example` with: `DATABASE_URL`, `TEST_DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, `API_URL`, `EMAIL_PROVIDER=console`, `STORAGE_PROVIDER=local`, plus placeholders for `RESEND_API_KEY`, S3 vars, `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`, `SENTRY_DSN`.

**Step 3: Write the failing test** `packages/shared/src/env.test.ts`: asserts `parseEnv({})` throws with a message naming a missing required var, and `parseEnv(validObj)` returns a typed object.

**Step 4:** Run `bun test packages/shared/src/env.test.ts` → FAIL (no `parseEnv`).

**Step 5:** Implement `env.ts`: a Zod schema for env, `parseEnv(source = process.env)` that throws a formatted error listing all invalid/missing vars. Export the inferred `Env` type.

**Step 6:** Run the test → PASS.

**Step 7:** Run `docker compose up -d` and verify Postgres accepts connections (`docker compose ps`). Then `docker compose down`.

**Step 8: Commit** `feat: add docker-compose postgres and validated env`.

---

## Phase 1 — Database layer (`packages/db`)

### Task 1.1: Drizzle setup + connection

**Files:**
- Create: `packages/db/package.json` (`@starter/db`, deps: `drizzle-orm`, `postgres`; devDeps: `drizzle-kit`), `packages/db/drizzle.config.ts`, `packages/db/src/client.ts`, `packages/db/src/index.ts`

**Step 1:** `client.ts`: create a `postgres` client from `DATABASE_URL` and a `drizzle()` instance; export `db` and a `createDb(url)` factory (so tests can point at `TEST_DATABASE_URL`).

**Step 2:** `drizzle.config.ts`: schema path `./src/schema/*`, dialect `postgresql`, out `./drizzle`, url from env.

**Step 3:** Add `db:generate`, `db:migrate`, `db:studio`, `db:push` scripts to the package.

**Step 4:** Typecheck the package (`bun run typecheck`). Expected: PASS.

**Step 5: Commit** `feat(db): add drizzle client and config`.

### Task 1.2: Auth + tenancy schema

**Files:**
- Create: `packages/db/src/schema/auth.ts`, `schema/organization.ts`, `schema/index.ts`
- Create: `packages/db/src/schema/_helpers.ts` (the `tenantTable` convention + shared columns)

**Step 1:** `_helpers.ts`: helpers `id()` (text PK, default cuid/uuid), `timestamps()` (createdAt/updatedAt), and `tenantColumns()` returning `{ organizationId }` text NOT NULL + a documented note that callers must add an index. Export a `tenantTable(name, columns)` wrapper that injects `organizationId` and an index on it.

**Step 2:** `auth.ts`: tables required by Better Auth's Drizzle adapter + organization plugin — `user` (add `role` text default `'user'`, `bannedAt` timestamp nullable), `session` (incl. `activeOrganizationId`), `account`, `verification`. (Use the exact column shape Better Auth expects — confirm against its Drizzle adapter docs at execution time.)

**Step 3:** `organization.ts`: `organization` (id, name, slug unique, `deletedAt` nullable, timestamps), `member` (id, userId FK, organizationId FK, role, timestamps; unique on (userId, organizationId)), `invitation` (id, organizationId FK, email, role, status, expiresAt, inviterId). Add `subscription` table (organizationId FK, status, plan, providerCustomerId, providerSubId — the dormant billing slot).

**Step 4:** `schema/index.ts` re-exports all tables.

**Step 5:** Run `bun run db:generate`.
Expected: a migration SQL file created under `packages/db/drizzle/`.

**Step 6:** Bring up Postgres (`docker compose up -d`), run `bun run db:migrate`.
Expected: tables created, no error. Verify with `db:studio` or a `\dt` query.

**Step 7: Commit** `feat(db): add auth, organization, and billing-slot schema`.

### Task 1.3: Tenant-isolation test helper + seed

**Files:**
- Create: `packages/db/src/test-helpers.ts`, `packages/db/src/seed.ts`
- Create: `packages/db/src/schema/schema.test.ts`

**Step 1:** `test-helpers.ts`: `withTestDb(fn)` that connects to `TEST_DATABASE_URL`, runs migrations, truncates tables between tests, and `makeOrg()/makeUser()/makeMember()` factories.

**Step 2: Write the failing test** `schema.test.ts`: insert two orgs each with a row in a sample tenant table; assert a query scoped to org A returns only org A's rows. (Establishes the isolation pattern every future app table reuses.)

**Step 3:** Run against `postgres-test` (port 5433) → make it pass by writing the scoped query helper `scopedTo(orgId)`.

**Step 4:** `seed.ts`: create a demo platform-admin user (`role='admin'`), a demo member user, an organization, memberships, and an invitation. Idempotent (upsert by email/slug).

**Step 5:** Run `bun run db:seed`. Expected: rows created; rerun is a no-op.

**Step 6: Commit** `feat(db): add tenant-isolation helpers and seed`.

---

## Phase 2 — Auth package (`packages/auth`)

### Task 2.1: Better Auth server config

**Files:**
- Create: `packages/auth/package.json` (`@starter/auth`, dep `better-auth`, `@starter/db`), `packages/auth/src/server.ts`, `packages/auth/src/index.ts`

**Step 1:** `server.ts`: configure Better Auth with the Drizzle adapter (pass `db` + schema), enable email/password, social providers (Google, GitHub — gated on env presence), email verification + password reset hooks (call the email interface — stubbed for now), and the **organization plugin** (with invitations + roles owner/admin/member, auto-create a personal org on signup via the `databaseHooks`/`organization.afterCreate` or a post-signup hook).

**Step 2:** Export the configured `auth` instance and its inferred types. Export `auth.handler` for mounting in Hono.

**Step 3:** Typecheck. Expected: PASS. (Behavior is exercised via API integration tests in Phase 3.)

**Step 4: Commit** `feat(auth): configure better-auth with organization plugin`.

### Task 2.2: Auth client config

**Files:**
- Create: `packages/auth/src/client.ts`

**Step 1:** Export a Better Auth React client (`createAuthClient`) with the organization client plugin, base URL from env. Re-export hooks (`useSession`, `signIn`, `signOut`, `organization.*`).

**Step 2:** Typecheck. Expected: PASS.

**Step 3: Commit** `feat(auth): add better-auth react client`.

---

## Phase 3 — API (`apps/api`)

### Task 3.1: Hono app boots on Bun

**Files:**
- Create: `apps/api/package.json` (`@starter/api`, deps `hono`, `@starter/auth`, `@starter/db`, `@starter/shared`), `apps/api/src/index.ts`, `apps/api/src/app.ts`

**Step 1: Write the failing test** `apps/api/src/app.test.ts`: `import { app }`, call `app.request('/health')`, assert status 200 and body `{ status: 'ok' }`.

**Step 2:** Run → FAIL.

**Step 3:** `app.ts`: create Hono app, add `/health` and `/health/ready` (the latter pings the DB). `index.ts`: `Bun.serve({ fetch: app.fetch, port })`.

**Step 4:** Run test → PASS. Also run `bun run dev` and curl `/health`.

**Step 5: Commit** `feat(api): hono app boots with health checks`.

### Task 3.2: Logging, request-id, error handling, rate limit middleware

**Files:**
- Create: `apps/api/src/middleware/{requestId,logger,error,rateLimit}.ts`, `apps/api/src/lib/logger.ts`

**Step 1: Tests** (`*.test.ts` per middleware): request-id added to context + response header; thrown errors become structured JSON (with status, no stack leak in prod); rate-limit returns 429 after N requests from one key.

**Step 2:** Run → FAIL. Implement minimal versions (in-memory rate-limit store behind a `RateLimitStore` interface; pino-style structured logger with `captureError()` Sentry hook stub).

**Step 3:** Run → PASS. Wire all four into `app.ts`.

**Step 4: Commit** `feat(api): add request-id, logging, error handling, rate limiting`.

### Task 3.3: Mount Better Auth + auth/org middleware

**Files:**
- Create: `apps/api/src/middleware/auth.ts`, `apps/api/src/middleware/org.ts`
- Modify: `apps/api/src/app.ts`

**Step 1:** Mount `auth.handler` at `/api/auth/*`.

**Step 2: Integration test** `apps/api/src/middleware/auth.test.ts` (uses `withTestDb`): sign up via the auth route, then call a protected probe route — assert 401 without session, 200 with session and `c.get('user')` populated.

**Step 3:** Implement `auth.ts` (resolves session → `user`, 401 if none + checks `bannedAt`) and `org.ts` (resolves `activeOrganizationId` → membership; sets `c.get('org')` and `c.get('role')`; 403 if not a member). Add a `requireRole(...roles)` helper.

**Step 4: Org-scoping integration test**: user in org A cannot read a resource in org B (403). Run → PASS.

**Step 5: Commit** `feat(api): mount better-auth and add auth/org middleware`.

### Task 3.4: lib interfaces — email, storage, jobs

**Files:**
- Create: `apps/api/src/lib/email/{index,console,resend}.ts`, `lib/storage/{index,local,s3}.ts`, `lib/jobs/{index,memory}.ts`

**Step 1: Tests:** email interface sends via console impl (captures payload); storage local impl writes/reads a file in a temp dir; jobs memory impl runs an enqueued job and supports a delayed job (for scheduled hard-delete).

**Step 2:** Run → FAIL. Implement: `EmailProvider` interface + console (logs) + resend (stub throwing "not configured" unless env set); `StorageProvider` + local-disk + s3 stub; `JobQueue` + in-process queue with `enqueue`/`schedule`. Provider chosen by env (`EMAIL_PROVIDER`, `STORAGE_PROVIDER`).

**Step 3:** Run → PASS.

**Step 4: Commit** `feat(api): add email, storage, and jobs interfaces with dev implementations`.

### Task 3.5: Organizations module

**Files:**
- Create: `apps/api/src/modules/organizations/{routes,handlers}.ts`
- Create: `packages/shared/src/schemas/organization.ts` (Zod request/response schemas)

**Step 1: Integration tests:** create org; list my orgs; invite a member (email sent via console provider); accept invite; change a member's role (owner/admin only); remove member; switch active org (updates session). Include negative cases (member cannot invite, cannot remove owner).

**Step 2:** Run → FAIL. Implement handlers delegating to Better Auth's organization API where possible; add Zod validation via `zValidator`. Routes use `auth` + `org` + `requireRole`.

**Step 3:** Run → PASS.

**Step 4: Commit** `feat(api): organizations module — orgs, members, invites, roles`.

### Task 3.6: Account module — profile, deletion, export

**Files:**
- Create: `apps/api/src/modules/account/{routes,handlers}.ts`, `apps/api/src/modules/account/collect.ts`

**Step 1: Integration tests:** update profile; export returns a JSON bundle containing the user + their orgs/memberships; account deletion removes memberships, deletes solo-owned orgs (soft-delete + schedules hard-delete job), reassigns/blocks orgs with other owners, then purges the user; org deletion (owner only) soft-deletes + schedules hard delete.

**Step 2:** Run → FAIL. Implement `collectUserData()` / `collectOrgData()` (documented extension point), deletion cascade following the documented contract, using the jobs interface for scheduled hard-delete.

**Step 3:** Run → PASS.

**Step 4: Commit** `feat(api): account module — profile, deletion, data export`.

### Task 3.7: Admin module — operator panel

**Files:**
- Create: `apps/api/src/modules/admin/{routes,handlers}.ts`

**Step 1: Integration tests:** non-admin gets 403 on all `/admin` routes; admin can list/search users & orgs; suspend sets `bannedAt` and that user's subsequent requests 401; impersonate issues a session for the target user with an `impersonatedBy` marker; un-impersonate restores.

**Step 2:** Run → FAIL. Implement, gated by `requireRole('admin')` against the platform-level `user.role`. Impersonation creates a scoped session and records the actor.

**Step 3:** Run → PASS.

**Step 4: Commit** `feat(api): admin operator panel — users, orgs, suspend, impersonate`.

### Task 3.8: Compose routes + export AppType for RPC

**Files:**
- Create: `apps/api/src/routes.ts`
- Modify: `apps/api/src/app.ts`

**Step 1:** `routes.ts`: chain all module routers onto the app in the canonical order and `export type AppType = typeof routes`.

**Step 2:** Typecheck + run the full `bun test` suite for the api. Expected: all green.

**Step 3: Commit** `feat(api): compose modules and export AppType`.

---

## Phase 4 — Web (`apps/web`)

### Task 4.1: Vite + React + Tailwind + shadcn skeleton boots

**Files:**
- Create: `apps/web/package.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `tailwind.config`, `src/styles.css`, shadcn init

**Step 1:** Scaffold Vite React-TS app; add Tailwind; run `shadcn init` and add a few primitives (button, input, card, dropdown, dialog). Functional defaults only — visual design system deferred.

**Step 2:** Run `bun run dev` (web) → app serves a placeholder page; `bun run build` → succeeds.

**Step 3: Commit** `feat(web): vite + react + tailwind + shadcn skeleton`.

### Task 4.2: RPC client, auth client, query setup, providers

**Files:**
- Create: `apps/web/src/lib/{api,auth,query}.ts`, modify `src/main.tsx`

**Step 1:** `api.ts`: `hc<AppType>(API_URL)` typed client. `auth.ts`: re-export `@starter/auth/client`. `query.ts`: QueryClient + sensible defaults. Wrap app in QueryClientProvider.

**Step 2: Smoke test** `src/lib/api.test.ts`: the typed client exposes expected route namespaces (type-level + a basic call mock). Run → PASS.

**Step 3: Commit** `feat(web): typed RPC client, auth client, query provider`.

### Task 4.3: Router + route guards

**Files:**
- Create: `apps/web/src/router.tsx`, `src/routes/(public)/*`, `src/routes/(app)/*`, `src/routes/admin/*`

**Step 1:** Set up TanStack Router. `(app)` layout loader checks `useSession`/session fetch → redirect to `/login` if absent. `admin` layout additionally requires `role==='admin'`.

**Step 2: Smoke tests:** unauthenticated visit to an `(app)` route redirects to `/login`; non-admin to `/admin` redirects/403 page.

**Step 3:** Run → PASS.

**Step 4: Commit** `feat(web): router with auth and admin route guards`.

### Task 4.4: Auth pages

**Files:**
- Create: `routes/(public)/{login,signup,forgot-password,reset-password,verify-email}.tsx`

**Step 1:** Build forms with react-hook-form + the shared Zod schemas; call the auth client. Handle success/redirect + error display.

**Step 2: Smoke test:** login form submits and on success lands in `(app)`. (Run against a mocked auth client or the real API if available.)

**Step 3: Commit** `feat(web): auth pages (login, signup, password reset, verify)`.

### Task 4.5: App shell + org context

**Files:**
- Create: `routes/(app)/_layout.tsx`, `components/{nav,org-switcher}.tsx`, `hooks/{useOrg,useMember,useRole}.ts`

**Step 1:** Authenticated shell: sidebar/topbar nav, org switcher (lists orgs, switches active org → updates session, invalidates scoped queries), user menu (logout). `useOrg/useMember/useRole` read from session + queries.

**Step 2: Smoke test:** org switcher renders the user's orgs and switching triggers a query invalidation.

**Step 3: Commit** `feat(web): authenticated app shell and org context`.

### Task 4.6: Settings, org management, dashboard pages

**Files:**
- Create: `routes/(app)/settings/*` (profile, account deletion, data export), `routes/(app)/org/*` (members, invites, roles, org settings + delete), `routes/(app)/dashboard/index.tsx`

**Step 1:** Wire each page to its RPC endpoints via TanStack Query (queries + mutations with invalidation). Dashboard is a minimal placeholder ("build your core feature here").

**Step 2: Smoke tests** on the critical mutations (invite member, delete account confirmation flow).

**Step 3: Commit** `feat(web): settings, org management, and dashboard pages`.

### Task 4.7: Admin panel UI

**Files:**
- Create: `routes/admin/{users,organizations}.tsx`, impersonation banner component

**Step 1:** Tables for users/orgs with search; suspend + impersonate actions; a persistent "viewing as <user>" banner with an exit-impersonation button when impersonating.

**Step 2: Smoke test:** admin route renders the users table; impersonation banner shows when impersonating.

**Step 3: Commit** `feat(web): operator admin panel UI`.

---

## Phase 5 — Hardening & delivery

### Task 5.1: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

**Step 1:** On PR/push: setup Bun, `bun install`, start a Postgres service container, `bun run typecheck`, `bun run lint`, `bun run test` (env points at the service container), `bun run build`.

**Step 2:** Validate the workflow YAML locally (`bun x ...` or push to a branch). Expected: green run.

**Step 3: Commit** `ci: add github actions pipeline`.

### Task 5.2: Pre-commit hook

**Files:**
- Create: `.husky/pre-commit` (or a simple bun-based hook), update root scripts

**Step 1:** Pre-commit runs `bun run lint` + `bun run typecheck` on staged changes.

**Step 2:** Make a trivial bad commit attempt → blocked; fix → passes.

**Step 3: Commit** `chore: add pre-commit lint + typecheck hook`.

### Task 5.3: Deployment artifacts + docs

**Files:**
- Create: `apps/api/Dockerfile`, `docs/deployment.md`, expand `README.md`
- Create: `docs/extending.md`

**Step 1:** API `Dockerfile` (Bun base image, install, build, `Bun.serve`). `docs/deployment.md`: API → Fly.io/Railway/container host; web → static build → CDN; required env per environment.

**Step 2:** `docs/extending.md`: how to add a tenant-scoped table (use `tenantTable` + isolation test), add a billing provider into the slot, swap email/storage providers, and delete the demo/admin scaffolding for a fresh app.

**Step 3:** Full `bun run build` + `bun test` across the monorepo. Expected: all green.

**Step 4: Commit** `docs: add deployment and extension guides; api dockerfile`.

### Task 5.4: Final verification pass

**Step 1:** Fresh-clone simulation: from a clean checkout, run the quickstart (`bun install`, `docker compose up -d`, `db:migrate`, `db:seed`, `dev`). Manually verify: sign up → personal org auto-created → invite a member → switch org → admin login → impersonate → export data → delete account.

**Step 2:** Use superpowers:verification-before-completion to confirm every claim with command output before declaring done.

**Step 3: Commit** any fixes; tag `v0.1.0` of the starter.

---

## Notes for the executor

- Confirm exact Better Auth Drizzle column shapes and organization-plugin API against current docs at execution time (Task 1.2 / 2.1) — these evolve; do not trust memory.
- Keep commits small and green. Never proceed past a red test.
- The dashboard and demo seed data are intentionally disposable — `docs/extending.md` documents what to strip for a real app.
