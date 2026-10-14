# Experiment: Matt Pocock's skills in place of OpenSpec

**Branch:** `experiment/matt-flow`
**Started:** 2026-10-14
**Status:** running

## What is being tested

Whether Matt Pocock's issue-tracker workflow works better for this repo than the OpenSpec
propose/apply/archive cycle it replaces.

`main` is untouched and remains the OpenSpec workflow. This branch swaps only the **workflow**.
Code written here is ordinary work and is not part of the experiment.

## What changed

| Change                                       | Where                        | Why                                                                                                                           |
| -------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Workflow section rewritten to the skill flow | `AGENTS.md`                  | The actual switch. Without it the agent would keep reaching for OpenSpec.                                                     |
| `## Agent skills` block added                | `AGENTS.md`                  | The block `@setup-matt-pocock-skills` writes.                                                                                 |
| `/opsx-*` commands moved aside               | `.opencode/commands-paused/` | Not for safety, for honesty. If they stay in the picker you will type `/opsx-apply` from habit and the test measures nothing. |
| Tracker and domain-doc config written        | `docs/agents/`               | Required before `@to-spec` and `@to-tickets` will run.                                                                        |
| This file                                    | `docs/agents/EXPERIMENT.md`  | So the revert is written down where the work happens.                                                                         |

Deliberately **not** changed:

- **OpenSpec is still installed.** `openspec/specs/` stays the historical record of how the app
  behaves. Nothing was deleted.
- **No GitHub labels were created.** They need the `gh` CLI, which was installed on this branch but
  is not yet authenticated. They are also the one side effect git could not undo, so they wait
  until the flow is adopted.

## One manual step

The `gh` CLI was installed to `~/.local/bin/gh` during setup but is not authenticated. The user
must run this once, in their own terminal:

```bash
gh auth login
```

Skills that touch the tracker will fail until that is done.

## How to revert

```bash
git checkout main          # the workflow is back, instantly
git branch -D experiment/matt-flow
```

There is **nothing to undo outside git**. No labels were created, no tracker was reconfigured, no
files outside the repo were touched.

If the work is worth keeping but the flow is not:

```bash
git checkout main
git cherry-pick <commit>...   # commits after the switch
```

## Known rough edges during the test

- **`/issue` and `/merge-pr` still assume OpenSpec.** `/issue` runs an explore/propose/apply/verify
  cycle against an OpenSpec change, which this branch has taken out of the workflow. Use
  `@implement` against a ticket directly for now. Rewriting those two commands is part of adopting
  the flow, not part of testing it.
- **`@ask-matt` is misleading here.** It routes to the upstream skill set, much of which this repo
  does not use. Ignore it.
- **`@code-review` locates the spec by commit-message issue references.** Pass the ticket number
  when invoking it so it does not have to ask.
- **`@tdd` asks the user to confirm test seams.** The engine's seams are already fixed by
  `src/core/engine/AGENTS.md`; confirm those rather than re-deciding them.

## If the flow is adopted

1. Create the five triage labels, then drop the un-authenticated warning from
   `docs/agents/issue-tracker.md`.
2. Rewrite `/issue` and `/merge-pr` around tickets instead of OpenSpec changes.
3. Decide whether OpenSpec is retired outright or kept as the spec archive. Archiving is the
   harder-to-reverse half: `openspec/specs/` is the only record of what the app does and why.
