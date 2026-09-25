# AGENTS.md — Marquette Fertility Tracker

Guidance for AI agents and developers working on this project. Read before making changes.

## Project overview

Offline-first PWA that tracks a woman's fertility cycle using the **Marquette Method** with the **ClearBlue Fertility Monitor (CBPM)**. The app logs user-entered daily observations (monitor readings, cervical mucus, BBT, intercourse, symptoms, etc.), computes the fertile window per the official Marquette Institute algorithm, and provides predictions/forecasting.

This is a **solo hobby project**. MVP is small and lean, but data model + algorithm are designed to grow (multi-user, cloud sync, Python backend).

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

| Concern | Choice |
|---|---|
| Framework | Vite + React + **TypeScript** |
| PWA | `vite-plugin-pwa` (offline cache, installable manifest, mobile-first responsive) |
| UI | **shadcn/ui** + Tailwind CSS |
| State | Zustand |
| Local DB | **IndexedDB via Dexie** (UUID keys, sync-ready flags) |
| Charts | **Recharts** (CBPM-style cycle strip + stats) |
| Tests | Vitest — table-driven tests for the Marquette engine |
| Backend | **None in MVP** (deferred FastAPI) |

## Marquette domain rules (cycling protocol — the core logic)

Source: Marquette University College of Nursing, Institute for NFP (Fehring et al.). Used for women with cycles 21–42 days.

Markers: monitor reading (Low / High / Peak), optional cervical mucus (L/H/P style), BBT, intercourse acts, menses.

Fertile-window **begin**:

| | Rule |
|---|---|
| Cycles 1–6 | Fertility begins on **cycle day 6** (calendar rule, reflects earliest possible peak day 12 − 6) |
| After 6 cycles | Earliest Peak day of the last 6 cycles **minus 6 days** — AND the first High or Peak reading of the current cycle triggers the fertile window whenever it appears (whichever comes first) |

Fertile-window **end**:

| | Rule |
|---|---|
| Cycles 1–6 | 4 full (24-h) days after the last user-entered **monitor** Peak day |
| After 6 cycles | "Latest monitor Peak of last 6 cycles + postPeakDays" OR "current cycle's last monitor Peak + postPeakDays" — whichever **ends first** |

- Monitor-only evidence: Peak, fertile-window begin/end, and confirmation come from user-entered monitor readings. Mucus stays loggable and visible (calendar/chart overlays) but is never engine evidence.
- Practical interpretation: the first assumed (inferred) Low begins at **P+5** with the default. The `postPeakDays` setting defaults to **4** and is configurable.
- A user-entered monitor **High** on or after the active tail start stops the inferred Low tail; a later monitor **Peak** starts a fresh tail with its own 30-row budget.
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
- `Settings`: goal (TTA / TTC / track-only), algorithmEnabled (bool), postPeakDays (default 4), historyWindow (default 6; used for calendar-rule peaks), theme (system/light/dark), weekStart (monday default / sunday), cycleMinLength/cycleMaxLength (band, default 21–42), overlayMucus/overlayBbt/overlayIntercourse (cycle-chart overlay persistence, default off).
- Records carry sync-friendly metadata (UUID keys, `version`/`synced` flags) so a cloud sync layer can be added later.

## Views

1. **Calendar** — month grid and the sole daily-input surface: menses, monitor icons, fertile-window shading, and per-day entry dialog.
2. **Status** — date-selectable read-only status summary at `/status`.
3. **Cycle chart** — CBPM-style strip chart per cycle (Low/High/Peak bands) with optional mucus/BBT/intercourse overlays (Recharts).
4. **History/Stats** — cycle table, avg/median cycle length, peak variability, fertile-day counts, forecast panel.
5. **Settings** — `/settings` view with Core (goal, algorithm toggle, post-Peak days, history window, theme), Display & protocol (week-start, cycle band, chart overlays), and Danger zone (clear all data).

## Predictions / forecasting

- Next period start: mean/median of last N cycles (6–12).
- Estimated next fertile window: "earliest/latest monitor Peak of last 6 cycles − 6 / + postPeakDays" calendar rule.
- Predictions are **always labeled as predictions** until confirmed by readings.

## Commands

(Define these when scaffolding starts — keep me updated in the README)

- `npm run dev` — local dev server
- `npm run test` — Vitest (engine tests are required for any engine change)
- `npm run build` — production build (PWA)

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
- `npm run test` is required for any change touching `core/engine` (table-driven tests written first).

## Conventions

- TypeScript strict mode. No `any` leaks into the engine.
- Pure engine cannot import React, Dexie, or any browser API.
- Keep feature code in `src/features/**`; shared UI in `src/data/**` (prefer shadcn/ui).
- Tests first for any change touching `core/engine` (run `npm run test`).
- Keep deps minimal: no new dependency without the user's awareness (hobby project discipline).