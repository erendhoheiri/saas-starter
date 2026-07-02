---
name: prd
description: Use to capture a new feature idea as a lightweight "mini PRD" (goals + user flow) before any technical design. This is stage 1 of the repo's feature pipeline (PRD → tech spec → Beads issues → implementation). Trigger whenever the user wants to start a new feature, floats an idea, says "buat PRD", "mini PRD", "bikin fitur X", "brainstorm fitur", or asks to define goals/scope for something to build — even if they don't say the word "PRD". Do NOT use for technical design (use tech-spec) or for writing issues (use write-issue).
---

# Mini PRD

Stage 1 of the feature pipeline. The goal here is small and specific: pin down
**what** we're building and **why**, plus the **user flow** — nothing technical
yet. Keep it to a one-pager. A mini PRD that fits on one screen gets read and
kept up to date; a ten-page PRD rots.

The technical "how" is deliberately out of scope — that belongs in the tech
spec (stage 2), where it can be reviewed properly.

## Process

1. **Understand the idea.** If the user's idea is already clear, don't
   interrogate them — draft the PRD and let them correct it. If it's fuzzy, ask
   a few focused questions **one at a time** (prefer multiple choice). Aim to
   learn: the problem, who has it, what success looks like, and the happy-path
   flow. Stop asking once you can write a coherent one-pager.

2. **Apply YAGNI.** Cut anything that isn't needed for the first useful version.
   Push "nice to haves" into an explicit Non-goals list so they're captured
   without bloating scope.

3. **Write the file.** Get today's date with `date +%F`, pick a short kebab-case
   `<slug>`, and write to `docs/prd/<date>-<slug>.md` (create the folder if
   needed). Use the template below.

4. **Hand off.** End by telling the user the PRD is ready for review and that the
   next step is the `tech-spec` skill, which turns this into a reviewable
   technical spec.

## Template

Use this structure (headings can be adjusted to fit the feature; keep it tight):

```markdown
# PRD: <Feature name>

- **Status:** draft
- **Author:** <user>
- **Date:** <YYYY-MM-DD>

## Problem
What's broken or missing today, and who feels it. 2–4 sentences.

## Goals
Bullet list of the outcomes this feature must achieve. Each goal should be
something you could later point at and say "did we do this? yes/no".

## Non-goals
What we're explicitly NOT doing in this iteration (prevents scope creep).

## Users & flow
Who uses this and the happy-path journey, step by step. A short numbered list
or a simple flow (Given → When → Then) is ideal. Note key alternate paths only
if they materially shape the feature.

## Success signals
How we'll know it worked (a metric, a behaviour, or a qualitative signal).

## Open questions
Anything unresolved that the tech spec or a decision needs to close.
```

## Notes

- Write the PRD in whatever language the user is using; keep the section
  headings as above so the `tech-spec` skill can find them.
- Don't design the solution here. If the user starts discussing implementation,
  capture it as an Open question or note and move it to the tech spec stage.
- This is the entry point of the pipeline: **PRD → tech-spec → write-issue →
  implement**.
