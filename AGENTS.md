# AGENTS.md — Marquette Fertility Tracker

Guidance for AI agents and developers working on this project. Read before making changes.

## Project overview

Offline-first PWA that tracks a woman's fertility cycle using the **Marquette Method** with the
**ClearBlue Fertility Monitor (CBPM)**. The app logs user-entered daily observations (monitor readings,
cervical mucus, BBT, intercourse, symptoms), computes the fertile window per the official Marquette
Institute algorithm, and provides predictions.

A solo hobby project. The feature set is small and lean on purpose.

## How to work with me

I am the product owner and the end user. **I do not read code.** This holds in normal conversation and in
every skill and workflow without exception.

**Sort every question into one of two lanes before you ask it.**

**Lane 1 — it affects the end user.** Ask at the PM / end-user level: what I see on screen, what data I am
required to enter, what a rule should do, what "correct" looks like, what edge cases I would actually
notice. No run-down, no code, no file paths — name things by their user-facing name ("the calendar", "the
daily entry dialog", "the status summary").

**Lane 2 — it does not affect the end user.** These are still my calls, so ask me — but as the developer I
am: someone who owns this project without being deeply familiar with this codebase. **Give a short
run-down first, then the question.** The run-down is 3-5 sentences at most and covers:

- what area is involved and what it does today, in plain English
- why the decision comes up now
- the realistic options, one line each, with the tradeoff
- your recommendation, and the reason for it

Skip the run-down when it would not change my answer. No code, no stack traces, no diffs. Naming a file,
library, or tool is acceptable when it is the clearest way to identify the thing — one reference, not a
tour. Never open with a wall of context.

Shared rules for both lanes:

- **Bring a recommendation, not an open question.** Batch at most 3 at a time, each answerable in a
  sentence. A decision never becomes a question just because the artifact behind it is technical.
- **Match the depth I ask for.** End-user framing is the default, not a permanent cap. If I ask "how does
  that work?", "show me the technical detail", "why did you do it that way?", or name a file, module, or
  tool, then answer at that level — including code, paths, and tradeoffs. Do not volunteer the deep
  version when I have not asked for it.
- **Reading code is your job, not mine.** If an answer requires code inspection, inspect it yourself, then
  report the consequence in plain language.
- **Routine internal work with an obvious right answer** (refactor, dependency bump, test or tooling
  wiring): do not ask. Implement it and report one line of user impact ("no visible change"). Ask only
  when a genuine tradeoff exists that I would want to weigh in on.
- **Report the decision and its user-visible effect.** Never read artifacts back to me as a summary of
  their contents, and keep paths, type names, and commands out of it unless I ask.
- Be succinct with your responses. It is ok to sacrifice grammar for concision.

### Reporting results

`tasks.md`, `design.md`, tickets, and specs are written for you, not for me, so they legitimately contain
file paths, function names, and test commands. **Do not paste or quote those contents at me.** Report
findings, incomplete work, and recommendations as outcome and user impact:

- Report the gap — "the cycle chart still doesn't show the new Peak marker" — not "task 7 in
  `marquette.ts` is incomplete".
- Convert every incomplete task into the user-visible gap it leaves. A task with **no** user-visible
  effect is internal; drop it from the report and note that the rest is internal.
- Give the scorecard in outcome terms (what works, what does not), not as a count of tasks and
  requirements.
- When a finding genuinely needs a path to be actionable, describe it in plain language and offer the
  path only if I want it.

## Conventions

- **The engine is pure.** `core/engine` imports nothing framework-specific — no React, no Dexie, no
  browser API — and takes plain data in at a narrow seam. Breaking it is a regression even if the app
  still works. Logic that needs one of those belongs outside the directory.
- TypeScript strict throughout, and **no `any` in the engine** — it is the strictest surface here.
- State via Zustand; the algorithm recomputes on every write. Never store a computed result.
- Every persisted field is optional: the user may enter nothing on a day, and the app must hold that.
- Feature code in `src/features/**`; shared UI in `src/components/**` (shadcn/ui under `components/ui`).
- **Keep deps minimal.** No new dependency without telling me first.
- **YAGNI.** Implement what the ticket says, no more.

## Working rules

- **`pnpm check` green for any code change.** It is the only command that needs to be green.
- **There is no `openspec/`.** It was retired as a workflow and deleted. Do not recreate it and do not
  reintroduce its conventions. If a skill or document tells you to write there, that instruction is
  stale — say so rather than following it.
- **Predictions stay labelled.** Anything the app works out about a day that has not happened is
  **Predicted** on screen and stays labelled until a reading confirms it.

## Reference

Reach for these on the branch named, not before.

- **[`src/core/engine/AGENTS.md`](src/core/engine/AGENTS.md) — the Marquette protocol.** The authoritative
  rules: how a cycle's fertile window begins and ends, what a Peak day is, and what the engine reports.
  Loads automatically whenever work touches that directory. When code and those rules disagree, one of
  them is a bug — determine which, do not quietly reconcile them.
- **[`docs/decisions.md`](docs/decisions.md) — scope decisions.** Adding a feature, a dependency, or a
  data path (backup, export, sync).
- **[`docs/agents/quality-gates.md`](docs/agents/quality-gates.md) — the gate and its gotchas.** Before
  calling anything done, and whenever you touch hooks, CI, formatting, or lint config.
- **[`docs/agents/workflow.md`](docs/agents/workflow.md) — the skill flow.** Starting a feature, a bug
  fix, or anything you would otherwise plan by hand. Also carries the issue-tracker and triage-label
  conventions.
- **[`GLOSSARY.md`](GLOSSARY.md) — domain terms.** Before you name a domain concept. Its `_Avoid_` lists
  are binding: use the defined term, not a synonym.
- **[`docs/adr/`](docs/adr/) — decisions of record.** A decision under review, or code that seems to
  contradict something deliberate. Surface a conflict rather than silently overriding it.
- **[`docs/VISUAL_QA.md`](docs/VISUAL_QA.md) — per-surface behaviour.** Changing what a view renders;
  `src/app/router.tsx` holds the routes.
- **`src/core/store/entities.ts` — the persisted types.** Touching storage; the type definitions are the
  source of truth for fields.
