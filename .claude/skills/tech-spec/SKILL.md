---
name: tech-spec
description: Use to turn a mini PRD into a detailed, implementation-ready Technical Specification grounded in THIS repo's architecture. This is stage 2 (the crucial, review-heavy one) of the feature pipeline (PRD → tech spec → Beads issues → implementation). Trigger when the user says "buat tech spec", "technical spec", "spec this out", references a PRD in docs/prd/, or asks how a feature should be built/architected in this codebase. The spec is written as `status: draft` and MUST be reviewed and set to `approved` by the user before issues are created. Do NOT create Beads issues here (that's write-issue).
---

# Tech Spec

Stage 2 of the feature pipeline, and the one that matters most: everything
downstream (issues, implementation) is generated from this document, so a vague
or wrong spec multiplies into vague or wrong work. Spend the effort here.

Two things make a spec in *this* repo good:
1. It is **grounded in the actual codebase** — it names real files, layers, and
   conventions, not generic advice.
2. It is **reviewable** — concrete enough that a human can catch a bad decision
   before any code is written.

## Before writing: load context

The spec must fit how this repo is actually built. Before drafting:

- Read the source PRD in `docs/prd/` (ask which one if it's ambiguous).
- Refresh the repo's architecture. This is a domain-driven / modular monorepo:
  - **`packages/shared/src/<domain>/`** — zod schemas + types are the single
    source of truth shared by API and web. New contracts go here first.
  - **API `apps/api/src/modules/<domain>/`** — layered `routes.ts` (HTTP) →
    `service.ts` (business rules) → `repository.ts` (Drizzle). Keep new work in
    the right layer.
  - **Web `apps/web/src/features/<domain>/`** — feature folders
    (`routes/`, `components/`, `hooks/`); shared UI in `components/`.
  - DB schema/migrations in `packages/db`.
  - Check `CLAUDE.md` and any `.claude/.../memory` notes for gotchas (e.g. the
    Tailwind `@source` requirement, the typed `api` facade, `tsc -b` vs the
    no-op typecheck script).
- If the feature touches an area you're unsure about, read that code before
  speccing it. A spec written without reading the code is a guess.

## Write the spec

Get today's date (`date +%F`), reuse the PRD's `<slug>`, and write to
`docs/tech-specs/<date>-<slug>.md` (create the folder if needed). Start the file
with frontmatter — the `status` field is the gate that `write-issue` checks:

```markdown
---
status: draft
prd: docs/prd/<date>-<slug>.md
date: <YYYY-MM-DD>
---

# Tech Spec: <Feature name>

## Summary
2–4 sentences: what we're building and the shape of the approach.

## Goals & context
Link the PRD. Restate the goals this spec satisfies and any constraints.

## Architecture & module placement
Where this lives in the DDD layout. Name concrete packages/dirs/files that will
be added or changed (shared contracts → API route/service/repository → web
feature folder). Call out cross-cutting concerns (auth, middleware, jobs).

## Data model & migrations
New/changed tables, columns, indexes; the Drizzle schema changes and the
migration. Note backfills or destructive changes explicitly.

## Contracts & API
New/changed endpoints (method, path, request/response). The zod schemas that go
in `packages/shared/<domain>` and are consumed by both sides. Note the typed
`api` facade entry if a new client call is needed.

## Web / UI
Screens/components/routes affected, states (loading/empty/error), and which
shared components are reused.

## Detailed behaviour & edge cases
The tricky parts: ordering, permissions/roles, concurrency, failure handling,
idempotency. This is where reviewers earn their keep — be specific.

## Test plan
What gets tested and how (unit/integration), the key cases, and how to verify
locally (build/test/lint commands). Note DB-dependent tests need Postgres.

## Rollout, flags & risks
Feature flags, migration ordering, backward-compat, and the main risks +
mitigations.

## Open questions
Unresolved decisions. These should be closed (or consciously deferred) before
approval.

## Task breakdown
The seed for Beads issues. List each task as a checkbox with the fields the
`write-issue` skill needs. Order them so dependencies are buildable.

- [ ] **<task title>** — type: `task|feature|bug|chore` · priority: `P0..P4` ·
      depends on: `<other task title or "none">`
      - Acceptance: <objective, checkable criteria>
- [ ] **<next task>** — type: … · priority: … · depends on: …
      - Acceptance: …
```

## Review gate — STOP here

Do **not** create Beads issues from this skill, and do not start implementing.
After writing the spec:

1. Tell the user the spec is at `docs/tech-specs/<date>-<slug>.md`, `status:
   draft`, and walk them through the key decisions and any open questions.
2. Ask them to **review** it. Explain plainly why this gate exists: issues and
   implementation are generated from this doc, so a decision caught now is cheap
   and one caught after coding is expensive.
3. When they're satisfied, they change the frontmatter `status: draft` →
   `status: approved` (do this for them only if they explicitly say it's
   approved). Then the next step is the `write-issue` skill.

Iterate on the spec with the user until they approve — revising the spec is the
whole point of this stage.
