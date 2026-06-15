# SaaS Starter — Design

**Date:** 2026-06-15
**Goal:** A reusable starter monorepo so new SaaS projects skip the from-scratch plumbing (auth, multi-tenancy, accounts, admin) and start at the core feature.

## Guiding principles

- **Build once, never rearchitect** — org-scoped multi-tenancy from day one; solo apps just get a default personal org.
- **You own everything** — auth, data, and components live in your code/DB. No vendor lock-in.
- **Every external dependency behind an interface** — runs locally with zero external accounts; wire real providers per project via env.
- **Types flow DB → API → frontend** — one source of truth, no duplication.
- **Lean, not bloated** — only baseline features that are painful to retrofit. App-specific features added per project.

## Stack decisions

| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript everywhere | — |
| Runtime / PM / test | **Bun** (+ `bun test`) | Optimized with Hono; one tool for runtime, deps, workspaces, tests |
| Monorepo | **Bun workspaces + Turborepo** | Task caching + parallel orchestration; room to add apps |
| Backend | **Hono** (`Bun.serve`) + Hono RPC | Fast; real client/server boundary; can split into services later |
| Frontend | **React + Vite**, TanStack Router, TanStack Query, react-hook-form | SPA (app-behind-login); type-safe routing + server state |
| UI | **Tailwind + shadcn/ui** | Own the component code, themeable, light/dark |
| DB / ORM | **PostgreSQL + Drizzle** | Relational integrity; best-in-class TS inference; edge-capable |
| Auth | **Better Auth** (+ organization plugin) | TS-native, Hono-friendly, multi-tenant + invites + roles built in |
| Validation | **Zod** in `packages/shared` | Shared between API and forms |
| Lint/format | **Biome** | One fast tool over ESLint+Prettier |
| Local infra | **Docker Compose** (Postgres) | Clone-and-go |

## Tenancy model

Option 3: **multi-tenant, optional**. Built org-scoped from the ground up; a single user gets a default personal org. Every tenant-owned row carries `organizationId`.

Mental model for every request: **authenticated user → active org → org-scoped data.**

## Monorepo structure

```
starter/
├── apps/
│   ├── web/                 # React SPA (Vite)
│   └── api/                 # Hono backend
├── packages/
│   ├── db/                  # Drizzle schema, migrations, client
│   ├── auth/                # Better Auth config (shared client+server types)
│   ├── shared/              # Zod schemas, shared types, constants
│   └── config/              # shared tsconfig, biome, env validation
├── docker-compose.yml       # local Postgres
├── turbo.json
└── package.json / bunfig
```

## Data model

Better Auth manages most auth tables. Key tables:

- `user` — id, email, name, image, emailVerified, createdAt, `bannedAt`, `role` (platform-level: `user` | `admin`)
- `session`, `account`, `verification` — Better Auth standard
- `organization` — id, name, slug, createdAt, `deletedAt` (soft delete)
- `member` — userId, organizationId, `role` (`owner` | `admin` | `member`)
- `invitation` — organizationId, email, role, status, expiresAt
- `subscription` — **billing slot**: organizationId, status, plan, providerCustomerId, providerSubId (shape exists, no provider wired)

Design rules baked in:
1. **Tenant scoping** — app tables always include `organizationId` + index; a `tenantTable()` convention enforces it.
2. **Soft delete + cascade** — documented contract for what hard- vs soft-deletes.
3. **Active org context** — lives in session (`activeOrganizationId`).

Note: platform-level `user.role` (admin panel) is separate from org-level `member.role`.

## API structure (apps/api)

```
src/
├── index.ts              # Bun.serve + Hono app
├── middleware/           # auth, org (tenant + role), rateLimit
├── modules/              # auth, organizations, account, admin, billing
├── lib/                  # email, storage, jobs, logger (behind interfaces)
└── routes.ts             # composes modules, exports AppType for Hono RPC
```

**Request lifecycle (protected routes):**
`rateLimit` → `auth` (who) → `org` (which tenant, member?, role) → handler (typed ctx with `user`, `org`, `role` resolved). Role checks = `requireRole('admin')`.

**Type-safe client:** `routes.ts` exports `AppType`; frontend uses `hono/client`. No OpenAPI codegen.

**Swap seams:** `lib/email` and `lib/storage` are interfaces — dev impl (console / local disk) + prod stub (Resend/SMTP, S3), swapped by config.

## Platform plumbing

- **Operator/admin panel** (`/admin`, `role=admin`): list/search users & orgs, signups, suspend (`bannedAt`), impersonate (scoped session + visible banner + audit entry).
- **Account & org deletion + export:** `collectUserData()`/`collectOrgData()` → JSON bundle; org delete = soft + scheduled hard-delete job; account delete = remove memberships, handle solo-owned orgs, purge. Documented cascade contract.
- **Email** — interface (dev: console; prod: Resend/SMTP stub)
- **Storage** — interface (dev: local disk; prod: S3 stub)
- **Background jobs** — lightweight queue abstraction (dev: in-process; swap to real queue). Used for async email, scheduled hard-deletes, future webhooks.
- **Rate limiting** — per-IP + per-user, swappable store
- **Logging** — structured (pino-style), request-id, `captureError()` (Sentry-ready)
- **Env validation** — Zod-validated at boot; invalid var = crash with clear message
- **Health** — `/health` + `/health/ready` (DB)

## Frontend structure (apps/web)

```
src/
├── main.tsx, router.tsx
├── routes/
│   ├── (public)/   # login, signup, forgot/reset, verify
│   ├── (app)/      # authed shell: dashboard, settings (profile/delete/export), org (members/invites/roles)
│   └── admin/      # operator panel
├── components/ui/  # shadcn/ui (owned)
├── components/     # org switcher, nav
├── lib/            # api.ts (Hono RPC), auth.ts (Better Auth client), query.ts
└── hooks/          # useOrg, useMember, useRole
```

Patterns: route guards in layout loaders (no per-page boilerplate); `useOrg()` switcher updates `activeOrganizationId` + refetches; TanStack Query over typed RPC; forms reuse `packages/shared` Zod schemas; Tailwind+shadcn light/dark persisted.

Pre-built screens: auth pages, dashboard shell, profile/account settings, org members & invites, admin panel. New apps build the core feature inside `(app)/`.

## Dev experience

```bash
bun install
docker compose up -d
bun run db:migrate
bun run db:seed        # demo admin + org + members
bun run dev            # api + web (turbo)
```

Scripts: `dev build test lint format typecheck db:migrate db:generate db:seed db:studio`. One validated `.env`. No external accounts to run locally.

## Testing

- `bun test` everywhere.
- **Backend:** integration tests vs real test Postgres — auth flow, org scoping, role gates, deletion cascade.
- **Shared:** unit tests on Zod schemas + pure logic.
- **Frontend:** light smoke tests (login, org switch).
- Documented **tenant-isolation helper** ("org A can't see org B").

## CI / deployment

- **CI (GitHub Actions):** PR → install, typecheck, lint, test (Postgres service container), build.
- **Deploy (documented, not prescribed):** API = standalone Bun app (Dockerfile) → Fly.io/Railway/any container host; web = static build → any CDN. Scale/relocate independently.

## Explicitly OUT of baseline (add per-project)

Billing provider (clean slot only), 2FA, i18n, in-app notifications, audit logs (beyond admin impersonation), API keys, outbound webhooks, feature flags, search, public marketing/landing pages (separate app).
