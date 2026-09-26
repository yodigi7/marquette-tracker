# AGENTS.md — Marquette Fertility Tracker

Guidance for AI agents and developers working on this project. Read before making changes.

## Project overview

Offline-first PWA that tracks a woman's fertility cycle using the **Marquette Method** with the **ClearBlue Fertility Monitor (CBPM)**. The app logs user-entered daily observations (monitor readings, cervical mucus, BBT, intercourse, symptoms, etc.), computes the fertile window per the official Marquette Institute algorithm, and provides predictions/forecasting.

This is a **solo hobby project**. MVP is small and lean, but data model + algorithm are designed to grow (multi-user, cloud sync, Python backend).

## How to work with me (audience)

I am the product owner and the end user. **I do not read code.** This applies to normal conversation **and to every OpenSpec workflow without exception**: `/opsx-propose`, `/opsx-explore`, `/opsx-apply`, `/opsx-verify`, `/opsx-archive`, `/opsx-bulk-archive`, `/opsx-update`, `/opsx-sync`, `/opsx-onboard`.

**Sort every question into one of two lanes before you ask it.**

**Lane 1 — it affects the end user.** Ask at the PM / end-user level: what I see on screen, what data I am required to enter, what a rule should do, what "correct" looks like, what edge cases I would actually notice. No run-down, no code, no file paths — name things by their user-facing name ("the calendar", "the daily entry dialog", "the status summary").

**Lane 2 — it does not affect the end user.** These are still my calls, so ask me — but as the developer I am: someone who owns this project without being deeply familiar with this codebase. **Give a short run-down first, then the question.** The run-down is 3-5 sentences at most and covers:

- what area is involved and what it does today, in plain English
- why the decision comes up now
- the realistic options, one line each, with the tradeoff
- your recommendation, and the reason for it

Skip the run-down when it would not change my answer. No code, no stack traces, no diffs. Naming a file, library, or tool is acceptable when it is the clearest way to identify the thing — one reference, not a tour. Never open with a wall of context.

Shared rules for both lanes:

- **Bring a recommendation, not an open question.** Batch at most 3 at a time, each answerable in a sentence.
- **Match the depth I ask for.** End-user framing is the default, not a permanent cap. If I ask "how does that work?", "show me the technical detail", "why did you do it that way?", or name a file, module, or tool, then answer at that level — including code, paths, and tradeoffs. Do not volunteer the deep version when I have not asked for it.
- **Reading code is your job, not mine.** If an answer requires code inspection, inspect it yourself, then report the consequence in plain language.
- **Routine internal work with an obvious right answer** (refactor, dependency bump, test or tooling wiring): do not ask. Implement it and report one line of user impact ("no visible change"). Ask only when a genuine tradeoff exists that I would want to weigh in on.
- **Never read the artifacts back to me as a summary of their contents.** Report the decision and its user-visible effect instead.

### Reporting workflow results (verify, apply, archive, sync)

`tasks.md` and `design.md` are written for you, not for me, so they legitimately contain file paths, function names, and test commands. **Do not paste or quote those contents at me.** When a workflow asks you to report findings, incomplete work, or recommendations, translate each item into what it means for me:

- Report as outcome and user impact — "the cycle chart still doesn't show the new Peak marker" — not "task 7 in `marquette.ts` is incomplete".
- Convert every incomplete task into the user-visible gap it leaves. If a task has **no** user-visible effect, drop it from the report and note that the remaining items are internal.
- Give the scorecard in outcome terms (what works, what does not), not as a count of tasks and requirements.
- Keep file paths, type names, and commands out of the report unless I ask for them. When a finding genuinely needs a path to be actionable, describe it in plain language and offer the path only if I want it.
- Never make a decision a question just because the underlying artifact is written in technical language. Decide it, then tell me the consequence.

## Non-negotiable project decisions (as agreed with the user)

- **Audience**: currently personal use (user/partner). Future: possibly open to other users, but NOT in MVP scope.
- **Fully digital** — no printed chart/export features. No PDF/CSV export for now.
- **Algorithm is ON by default** but must have a user-facing toggle to disable computed fertile-window logic (app then logs data without interpreting it).
- **Normal cycling protocol only** — no postpartum/non-cycling/transitioning rules in MVP.
- **Current Marquette Institute protocols** (Fehring et al.) — see domain rules below.
- **Day 1 = first day of menses**.
- **Manual entry only** for monitor readings — no device integration/import.
- **No reminders/notifications** for now.
- **Versioned JSON backup/restore is in scope** for local data protection; the storage schema must remain migration-ready. CSV is a separate, low-priority human-readable export; no cloud sync or backend is in scope.
- **Offline-first, local storage only** — IndexedDB. No cloud sync in MVP, no encryption required. Schema must be sync-ready later (UUIDs, version flags).
- **No Python backend in MVP** — deferred entirely. The algorithm module must be framework-agnostic pure TS so it can be ported to Python/FastAPI later for logic parity.

## Tech stack (decided)

| Concern   | Choice                                                                           |
| --------- | -------------------------------------------------------------------------------- |
| Framework | Vite + React + **TypeScript**                                                    |
| PWA       | `vite-plugin-pwa` (offline cache, installable manifest, mobile-first responsive) |
| UI        | **shadcn/ui** + Tailwind CSS                                                     |
| State     | Zustand                                                                          |
| Local DB  | **IndexedDB via Dexie** (UUID keys, sync-ready flags)                            |
| Charts    | **Recharts** (CBPM-style cycle strip + stats)                                    |
| Tests     | Vitest — table-driven tests for the Marquette engine                             |
| Backend   | **None in MVP** (deferred FastAPI)                                               |

## Marquette domain rules (cycling protocol — the core logic)

Source: Marquette University College of Nursing, Institute for NFP (Fehring et al.). Used for women with cycles 21–42 days.

Markers: monitor reading (Low / High / Peak), optional cervical mucus (L/H/P style), BBT, intercourse acts, menses.

Fertile-window **begin**:

|                | Rule                                                                                                                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cycles 1–6     | Fertility begins on **cycle day 6** (calendar rule, reflects earliest possible peak day 12 − 6)                                                                                           |
| After 6 cycles | Earliest Peak day of the last 6 cycles **minus 6 days** — AND the first High or Peak reading of the current cycle triggers the fertile window whenever it appears (whichever comes first) |

Fertile-window **end**:

|                | Rule                                                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------------------- |
| Cycles 1–6     | 3 full (24-h) days after the last user-entered **monitor** Peak day                                              |
| After 6 cycles | "Latest monitor Peak of last 6 cycles + 3" OR "current cycle's last monitor Peak + 3" — whichever **ends first** |

- Monitor-only evidence: Peak, fertile-window begin/end, and confirmation come from user-entered monitor readings. Mucus stays loggable and visible (calendar/chart overlays) but is never engine evidence.
- **Recorded evidence never moves the window.** If a monitor `high`/`peak` is logged on a day after the computed end, that contradiction is _reported_ as a protocol warning, not resolved by moving the end. `low` outside the window is consistent and is not reported. The window opens on evidence (first High before the calendar begin pulls it earlier) and closes on the Peak alone — the two halves deliberately differ, because the published protocol defines the end only through the last Peak.
- **An open cycle whose computed end has passed is reported.** The cycle is still in progress, so its remaining days are not settled. A closed cycle with an end in the past is ordinary.
- The post-Peak interval is a **fixed protocol constant of 3**, not a preference. The published protocol ends the window "three full days past the last peak reading" (Mu, Fehring & Bouchard, _Linacre Q_ 2022; Fehring 2018), so it is not user-configurable and no stored value can move it. Do not reintroduce a `postPeakDays` setting.
- If a cycle has **no Peak** (8–10% of cycles), fall back to the calendar rule for the end.
- Cycles outside 21–42 days: warn if 2+ cycles fall outside the band (protocol says consult a teacher).
- All computed statuses are **derived at read time** from raw records — never stored — recomputed on every data change.

## Architecture (MVP)

```
src/
  app/          # App shell: router, layout, providers
  features/     # Feature modules (calendar, status, cycle-chart, history, settings)
  core/engine/  # PURE framework-agnostic marquette.ts + types (no React/IDB imports)
  core/store/   # Zustand stores + Dexie repositories
  components/   # Shared UI components
```

- Pure engine lives in `core/engine` — must import nothing framework/IDB-specific; fully unit-testable and portable to Python later.
- State via Zustand; algorithm recomputed on every write.

## Data model (MVP)

- `Cycle`: id (UUID), cycleNo, day1 (date, = first day of menses), closedAt, notes.
- `DayRecord`: id (UUID), cycleId, date, dayInCycle, monitor (none/low/high/peak), mucus, blood flow, intercourse (bool + optional time), bbt, symptoms (array), medications, pregnancy test (neg/pos), notes — **all optional**.
- `Settings`: goal (TTA / TTC / track-only), algorithmEnabled (bool), historyWindow (default 6; used for calendar-rule peaks), theme (system/light/dark), weekStart (monday default / sunday), cycleMinLength/cycleMaxLength (band, default 21–42), calendarDetailMode (simple / full), projectFutureCycles (bool, default off), overlayMucus/overlayBbt/overlayIntercourse (cycle-chart overlay persistence, default off).
- Records carry sync-friendly metadata (UUID keys, `version`/`synced` flags) so a cloud sync layer can be added later.

## Views

1. **Calendar** — month grid and the sole daily-input surface: menses, monitor icons, fertile-window shading, and per-day entry dialog.
2. **Status** — date-selectable read-only status summary at `/status`.
3. **Cycle chart** — CBPM-style strip chart per cycle (Low/High/Peak bands) with optional mucus/BBT/intercourse overlays (Recharts).
4. **History/Stats** — cycle table, avg/median cycle length, peak variability, fertile-day counts, forecast panel.
5. **Settings** — `/settings` view with Core (goal, algorithm toggle, history window, theme), Display & protocol (week-start, cycle band, chart overlays), and Danger zone (clear all data).

## Predictions / forecasting

- Next period start: mean/median of last N cycles (6–12).
- Estimated next fertile window: "earliest/latest monitor Peak of last 6 cycles − 6 / + 3" calendar rule.
- Predictions are **always labeled as predictions** until confirmed by readings.

## Commands

The project uses **pnpm**. `pnpm check` is the single canonical quality gate and the only command that needs
to be green before a change is considered done.

- `pnpm dev` — local dev server
- `pnpm check` — **the full gate**: `format:check`, `lint`, `test`, then `build` (the type check runs once,
  inside `build`). This is what the hooks and CI invoke.
- `pnpm test` — Vitest (engine tests are required for any engine change)
- `pnpm build` — type check + production build (PWA)
- `pnpm lint` — Oxlint
- `pnpm format` / `pnpm format:check` — oxfmt write / verify
- `pnpm typecheck` — strict TypeScript project check only

**Before starting work:** `pnpm check`. **Before calling anything done:** `pnpm check` green, plus
`openspec validate --all` if OpenSpec artifacts changed.

## Quality gates

- **Git hooks** live in `.githooks/` (tracked in the repo) and are enabled at install time by a `prepare`
  script that sets `core.hooksPath`. `pre-commit` formats staged files and re-stages them, then runs
  `oxlint` and `openspec validate --all` (~1.4s). `pre-push` runs `pnpm check` (~21s).
- The type check and tests are intentionally **not** in `pre-commit`: `tsc -b` costs ~4s here with no
  useful incrementality, so they run once at push time instead of on every commit.
- `pnpm install` only runs `prepare` when it does real work. If hooks appear inactive, restore with
  `git config core.hooksPath .githooks`. Bypass deliberately with `git commit --no-verify` /
  `git push --no-verify`.
- **Formatting** is oxfmt, configured in `.oxfmtrc.json`. Style is semicolons, double quotes, 100-column
  width, two-space indent. Three exceptions: `src/index.css` stays 4-space (shadcn), `package.json` key
  order is preserved, and `.opencode/**` plus `openspec/changes/archive/**` are skipped (vendored tooling
  and historical records). Do not add a second formatter.
- **Lint baseline is zero warnings.** The one exception, `react/only-export-components` in
  `src/components/ui/`, is disabled by committed `overrides` in `.oxlintrc.json` because shadcn exports
  `cva()` results alongside components. Keep it scoped to that directory, and do not silence it with inline
  comments — `shadcn add` would wipe them.
- **CI**: `.github/workflows/ci.yml` runs `pnpm check` on pull requests and pushes to `main` with
  read-only permissions and no deploy step. `deploy.yml` publishes to Pages from `main` only and runs the
  same `pnpm check` first. Never add a deploy step to `ci.yml`.

## Development workflow

All feature work is driven by **OpenSpec** (via slash commands, never auto-triggered). The spec-system layout:

- `openspec/specs/` — authoritative project spec (what the app does now; grows as changes archive).
- `openspec/changes/*/` — active/in-flight changes: `proposal.md`, `specs/<capability>/spec.md` (delta), `design.md`, `tasks.md`.

Workflow commands (see `.opencode/commands/opsx-*.md`):

- `/opsx-propose` — draft a change (`openspec new change <name>` + proposal/specs).
- `/opsx-apply` — implement the change's `tasks.md` (tests-before-code per task).
- `/opsx-archive` — archive a completed change into `openspec/specs/` after all tasks are done and validation passes.
- `openspec validate` — lint specs; `openspec status --change <name>` — change progress.

- Before implementing, read `openspec/changes/<name>/specs/**/spec.md`, `design.md`, and `tasks.md` — those are the authoritative spec; implement what they say, no more (**YAGNI**).
- `pnpm test` is required for any change touching `core/engine` (table-driven tests written first).

## Conventions

- TypeScript strict mode. No `any` leaks into the engine.
- Pure engine cannot import React, Dexie, or any browser API.
- Keep feature code in `src/features/**`; shared UI in `src/data/**` (prefer shadcn/ui).
- Tests first for any change touching `core/engine` (run `pnpm test`).
- Keep deps minimal: no new dependency without the user's awareness (hobby project discipline).
