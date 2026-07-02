---
name: write-issue
description: Use to populate Beads (bd) issues from an APPROVED tech spec's task breakdown — stage 3 of the feature pipeline (PRD → tech spec → Beads issues → implementation). Trigger when the user says "buat issue", "populate issues", "breakdown ke Beads", "bikin task dari tech spec", "isi backlog", or wants to create trackable tasks/epics for a spec. This skill refuses to run unless the tech spec is `status: approved`. Do NOT use to design (tech-spec) or to do the work (implement).
---

# Write Issues (Beads)

Stage 3: turn an approved tech spec into a tracked backlog in Beads, so progress
is visible and dependency-ordered. Beads (`bd`) is the durable source of truth
for tasks — not markdown checklists.

## Gate: the spec must be approved

Before doing anything, open the target tech spec in `docs/tech-specs/` and read
its frontmatter `status`.

- If `status` is not `approved`, **STOP**. Tell the user issues are only created
  from an approved spec, because issues + implementation are generated from it —
  populating a backlog off a spec that's still changing means churn and rework.
  Point them back to the `tech-spec` review gate.
- Only proceed when `status: approved`.

## Ensure Beads is ready

```bash
bd where          # is there an active workspace here?
```

If there's no workspace, initialise one: `bd init` (creates `.beads/`). If
`bd prime` output was injected this session, you already have context.

## Plan first, then create

Read the spec's **Task breakdown** section. Translate it into a plan and show it
to the user as a table (title, type, priority, depends-on, acceptance) **before**
creating anything — this is their last cheap checkpoint. You can also preview a
single create with `--dry-run`.

Do not invent work beyond the spec. If the breakdown is thin or a task is too
big to be atomic, say so and propose refinements rather than silently expanding
scope.

## Create the issues

1. **Epic** for the feature, linked to the spec:

   ```bash
   bd create "<Feature name>" -t epic -p 1 \
     --spec-id "docs/tech-specs/<date>-<slug>.md" \
     -d "<one-line summary>" --json
   ```

   Capture the returned epic ID (use `--json` and parse `.id`, or `--silent` to
   get just the ID).

2. **Tasks**, each parented to the epic, linked to the spec, with acceptance
   criteria:

   ```bash
   bd create "<task title>" -t task -p <0-4> \
     --parent <epic-id> \
     --spec-id "docs/tech-specs/<date>-<slug>.md" \
     --acceptance "<objective criteria from the spec>" \
     -d "<what and why>" --json
   ```

3. **Dependencies** — wire the "depends on" relationships from the breakdown so
   `bd ready` surfaces work in a buildable order. Either at create time via
   `--deps 'blocks:<id>'` (the named issue is blocked by this one), or after the
   fact:

   ```bash
   bd dep add <blocked-id> <blocker-id>   # blocked-id is blocked by blocker-id
   ```

   Verify the intended direction with `bd dep --help` if unsure — getting the
   direction wrong makes `bd ready` misleading.

Prefer `--json` when you need to read IDs back programmatically.

## Finish

- Show the resulting backlog and the ready queue:

  ```bash
  bd ready
  bd list --status=open
  ```

- Tell the user the backlog is populated and the next step is the `implement`
  skill, which works the ready issues against this spec.

## Notes

- Keep issues **atomic** — one reviewable unit of work each, matching one
  checkbox in the spec's breakdown.
- Don't `bd close` or start work here — this skill only populates.
- If Beads auto-export is on, `.beads/issues.jsonl` updates so the backlog is
  tracked in git alongside the code.
