# SaaS Starter

A reusable Bun + Turborepo monorepo starter for building SaaS applications.

## Quickstart

> Note: this project is scaffolding-in-progress (Phase 0). The `db:*` and `dev` targets below are placeholders that land in later phases, so they won't run yet on a fresh checkout.

```bash
bun install
docker compose up -d
bun run db:migrate
bun run db:seed
bun run dev
```
