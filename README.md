# SaaS Starter

A production-ready Bun + Turborepo monorepo starter for building multi-tenant SaaS applications.

## What's included

- **API** — Hono on Bun with Better Auth, org-scoped middleware, rate limiting, request IDs, structured logging
- **Web** — Vite + React + TanStack Router + TanStack Query + shadcn/ui, fully typed via Hono RPC
- **Auth** — email/password + email verification + org invitations via Better Auth; Google and GitHub OAuth auto-enabled from env vars
- **Database** — Drizzle ORM on PostgreSQL with a `tenantTable()` helper that enforces org isolation
- **Email** — pluggable provider interface; console (dev) and Resend (prod) built in
- **Storage** — pluggable provider interface; local disk (dev) and S3-compatible (prod) built in
- **Admin panel** — operator UI for user and org management
- **CI** — GitHub Actions workflow with type-check, lint, and test gates
- **Pre-commit hooks** — lint-staged for fast local feedback

## Quickstart

```bash
git clone https://github.com/your-org/starter.git my-app
cd my-app
bun install
docker compose up -d        # start local Postgres
bun run db:migrate
bun run db:seed             # optional demo data
bun run dev
```

The API runs on `http://localhost:3000` and the web app on `http://localhost:5173`.

Copy `.env.example` to `.env` (or set the variables manually) before running. See [docs/deployment.md](docs/deployment.md) for the full list of required and optional environment variables.

## Stack

| Layer | Technology |
|---|---|
| Runtime | Bun |
| Monorepo | Turborepo |
| API framework | Hono |
| Auth | Better Auth |
| ORM | Drizzle |
| Database | PostgreSQL |
| Frontend | Vite + React 19 |
| Routing | TanStack Router |
| Data fetching | TanStack Query |
| UI components | shadcn/ui + Tailwind CSS |
| Type-safe RPC | Hono client (`hc`) |

## Docs

- [Deployment guide](docs/deployment.md) — environment variables, Docker build, static CDN, migration workflow
- [Extension guide](docs/extending.md) — adding tables, swapping providers, billing, social auth, stripping the demo
