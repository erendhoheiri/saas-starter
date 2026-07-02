---
name: implement
description: Use to actually build the work — pick up a ready Beads (bd) issue and implement it against its linked tech spec, following the repo's conventions and verifying before closing. This is stage 4 of the feature pipeline (PRD → tech spec → Beads issues → implementation). Trigger when the user says "kerjain issue", "implement", "lanjut task", "ambil kerjaan berikutnya", "work the backlog", "start on <issue-id>", or wants an agent to execute tracked work from Beads. Do NOT use to create issues (write-issue) or to design (tech-spec).
---

# Implement (from Beads)

Stage 4: do the work that stage 3 queued, keeping Beads as the source of truth so
progress survives across sessions and hand-offs. Follow the tech spec — the
design decisions were already made and reviewed there; don't relitigate them
while coding.

## Pick up work

```bash
bd prime     # load project context (may already be injected via SessionStart)
bd ready     # open issues with no active blockers — the real queue
```

Work a specific issue if the user named one; otherwise take the top of
`bd ready`. Respect the queue: only `ready` issues are unblocked. Then:

```bash
bd show <id>            # full details, acceptance criteria, spec link
bd update <id> --claim  # claim atomically before starting
```

Read the linked tech spec (the issue's `--spec-id`, i.e. the file in
`docs/tech-specs/`) for the design and edge cases. If the issue and spec
disagree, surface it to the user rather than guessing.

## Do the work

- **Stay in scope.** Implement exactly what this issue's acceptance criteria
  describe. Resist fixing unrelated things — see "discovered work" below.
- **Follow the repo's architecture.** This is a DDD/modular monorepo: shared
  zod contracts in `packages/shared/<domain>`, API `route → service →
  repository`, web `features/<domain>` folders. Put code in the right layer and
  reuse shared components/contracts. Check `CLAUDE.md` / memory for gotchas.
- **Write tests.** Prefer test-first for logic with clear inputs/outputs
  (invoke `superpowers:test-driven-development` when it applies). Match the
  existing test style.
- **Discovered work** → file it, don't silently absorb it:

  ```bash
  bd create "<follow-up>" -t task -p <0-4> \
    -d "Discovered while doing <id>: <why>" --deps 'discovered-from:<id>'
  ```

## Verify before closing

Do not claim done without evidence — invoke
`superpowers:verification-before-completion`. Run the relevant checks and read
the output:

- `bun run build` (this is the real typecheck via `tsc -b`; the `typecheck`
  script alone is a no-op on the root config).
- Tests for the touched packages (note: DB-dependent API tests need Postgres).
- `bun run lint` for the touched packages.

Confirm each of the issue's acceptance criteria is actually met.

## Close and continue

```bash
bd close <id> --reason "<what was implemented + how verified>"
```

Then report what changed and either take the next `bd ready` issue or stop and
hand back to the user — ask which if it's not obvious. Work one issue at a time
unless the user asks you to batch.

## Rules (from Beads' own workflow)

- Beads is the durable task state — don't create parallel markdown TODO lists as
  the source of truth.
- Don't use `bd edit` (interactive); use `bd update` flags.
- Prefer `--json` when parsing `bd` output.
- Never auto-close or mutate an issue unless the work is genuinely complete and
  verified.
