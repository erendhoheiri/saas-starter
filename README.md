# SaaS Starter

A production-grade Bun + Turborepo monorepo for building multi-tenant SaaS
applications — end-to-end type-safe, cleanly layered, and ready to build on.

Auth, organizations, an admin panel, and the pluggable infrastructure (email,
storage, jobs) are done for you. You bring the product.

## What's included

- **API** — Hono on Bun with Better Auth, org-scoped middleware, in-memory rate
  limiting, request IDs, and structured logging. Health/readiness endpoints for
  probes.
- **Web** — Vite + React 19 + TanStack Router + TanStack Query + shadcn/ui,
  fully typed against the API via Hono RPC. Light/dark theme with a token-driven
  design system.
- **Auth** — email/password, email verification, password reset, and org
  invitations via Better Auth; Google and GitHub OAuth auto-enable when their
  env vars are set.
- **Multi-tenancy** — organizations, members, roles (owner/admin/member),
  invitations, and a `tenantTable()` helper that enforces org isolation at the
  schema level.
- **Account** — profile management, GDPR-style data export, and account deletion
  with ownership-transfer + cascade handling.
- **Admin panel** — operator UI for user moderation (suspend/reinstate),
  impersonation, and organization management.
- **Database** — Drizzle ORM on PostgreSQL with migrations and a seed script.
- **Email** — pluggable provider interface; console (dev) and Resend (prod).
- **Storage** — pluggable provider interface; local disk (dev) and
  S3-compatible (prod).
- **Jobs** — a simple in-memory job queue with scheduling (swap for a durable
  queue in production — see the extension guide).
- **CI** — GitHub Actions running typecheck, lint, and tests against Postgres.
- **Pre-commit** — a git hook that runs lint + typecheck before every commit.
- **Dev workflow** — a built-in PRD → tech-spec → issues → implementation
  pipeline backed by [Beads](https://github.com/steveyegge/beads) and project
  skills (see [Development workflow](#development-workflow)).

## Stack

| Layer | Technology |
|---|---|
| Runtime | Bun |
| Monorepo | Turborepo |
| Language / typing | TypeScript, Zod (shared contracts) |
| API framework | Hono |
| Auth | Better Auth (+ organization plugin) |
| ORM / DB | Drizzle · PostgreSQL |
| Frontend | Vite + React 19 |
| Routing / data | TanStack Router + TanStack Query |
| UI | shadcn/ui + Tailwind CSS v4 |
| Type-safe RPC | Hono client (`hc`) |
| Lint / format | Biome |
| Issue tracking | Beads (`bd`) |

## Quickstart

```bash
git clone https://github.com/your-org/starter.git my-app
cd my-app
bun install
cp .env.example .env         # then fill in the values
docker compose up -d         # start local Postgres
bun run db:migrate
bun run db:seed              # optional demo data
bun run dev
```

The API runs on `http://localhost:3000` and the web app on
`http://localhost:5173` (the web dev server proxies `/api` to the API).

See [docs/deployment.md](docs/deployment.md) for the full list of required and
optional environment variables and deployment notes.

## Project structure

```
apps/
  api/    Hono API — src/modules/<domain>/{routes,service,repository}.ts
  web/    React app — src/features/<domain>/{routes,components,hooks}
packages/
  shared/   Zod schemas + types — the contracts shared by api & web
  auth/     Better Auth server + browser client
  db/       Drizzle schema, migrations, client, seed
  ui/       Design system (shadcn/ui components + design tokens)
  config/   Shared tsconfig + Biome config
docs/       prd/ · tech-specs/ · plans/ · deployment.md · extending.md
.claude/skills/   prd · tech-spec · write-issue · implement
.beads/           Beads issue database (bd)
```

## Architecture

The codebase is domain-driven and modular — each feature is a self-contained
slice across three well-separated layers:

- **Contracts first.** Zod schemas and shared types live in
  `packages/shared/<domain>` and are the single source of truth consumed by both
  the API and the web client — no drift between server and browser.
- **API — `route → service → repository`.** `routes.ts` handles HTTP only,
  `service.ts` holds business rules (HTTP-free), and `repository.ts` owns every
  Drizzle query. Domains: `account`, `organization`, `admin`.
- **Web — feature folders.** `features/<domain>/{routes,components,hooks}`;
  shared UI/layout in `components/` and `app/`. The API client (`lib/api.ts`) is
  fully typed from the Hono `AppType`.

Adding a feature typically means: add the contract in `shared`, implement the
API layers, then build the web feature — each step type-checked against the
last.

## Scripts

Run from the repo root (Turborepo fans out to the workspaces):

| Command | Description |
|---|---|
| `bun run dev` | Start API + web in watch mode |
| `bun run build` | Build all packages (this is the real typecheck for web via `tsc -b`) |
| `bun run test` | Run all tests |
| `bun run lint` | Biome check across the monorepo |
| `bun run format` | Biome autofix |
| `bun run typecheck` | Per-package `tsc --noEmit` |
| `bun run db:generate` | Generate a Drizzle migration from schema changes |
| `bun run db:migrate` | Apply migrations |
| `bun run db:seed` | Seed demo data |
| `bun run db:studio` | Open Drizzle Studio |

## Testing

Unit and integration tests run with `bun test`. The API's module tests hit a
real database, so start the test Postgres (`docker compose up -d`) before
running them; DB-less tests (middleware, lib, app) run without it. CI provisions
both a dev and a test Postgres service.

## Development workflow

This repo ships an opinionated feature pipeline as project skills, so ideas turn
into tracked, reviewed, implemented work:

**`/prd` → `/tech-spec` → (review → approve) → `/write-issue` → `/implement`**

1. **`/prd`** — capture the idea as a one-page mini-PRD (goals + user flow) in
   `docs/prd/`.
2. **`/tech-spec`** — expand it into a detailed technical spec grounded in this
   codebase (`docs/tech-specs/`). Written as `status: draft`; **you review and
   set it to `approved`** before anything downstream runs.
3. **`/write-issue`** — populate [Beads](https://github.com/steveyegge/beads)
   issues from the approved spec (epic + tasks + dependencies + acceptance
   criteria). Refuses to run until the spec is approved.
4. **`/implement`** — work the ready Beads queue against the spec, following the
   architecture above, verifying (build/test/lint) before closing each issue.

Beads (`bd`) is the durable, dependency-aware task tracker (Jira/Linear, but in
the terminal). Install it with `brew install beads`; `bd ready` shows the next
unblocked work.

## Not included (bring your own)

Intentionally left as extension points — see
[docs/extending.md](docs/extending.md):

- **Billing / subscriptions** (Stripe, Polar, …) and plan-based entitlements
- **Durable background jobs** (the built-in queue is in-memory)
- **Deployment artifacts** (Dockerfile / IaC) — documented, not scaffolded
- Error tracking, product analytics, outbound webhooks, i18n

## Docs

- [Deployment guide](docs/deployment.md) — environment variables, build, CDN,
  migration workflow
- [Extension guide](docs/extending.md) — adding tables, swapping providers,
  billing, social auth, stripping the demo
