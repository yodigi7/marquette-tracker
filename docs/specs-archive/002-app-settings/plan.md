# Implementation Plan: App Settings & Preferences

**Branch**: `002-app-settings` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-app-settings/spec.md`

## Summary

Build the Settings screen (route `/settings`, currently `FeaturePlaceholder`) and persist prefs on the existing single Dexie `AppSettings` row (key `main`). It surfaces the five core preferences (`goal`, `algorithmEnabled`, `postPeakDays`, `historyWindow`, `theme`) plus four agreed additions: clear-all-data (with confirmation and default restore), persistent cycle-chart overlay toggles (mucus/BBT/intercourse), calendar week-start, and a configurable cycle-length band (default 21–42).

One deliberate engine touch: the band is currently hardcoded as `CYCLE_LENGTH_MIN/MAX` constants used by the out-of-band warning (`engineSdk.ts`) and the forecast band filter (`predict.ts`). Making it a setting means `EngineSettings` gains `cycleMinLength`/`cycleMaxLength` (defaults 21/42) — parameter plumbing, no rule-logic change, tests-first per constitution IV. Theme additionally requires wiring the already-installed `next-themes` (inert today: the app never applies `.dark`). Clear-all-data reuses the existing `clearAllData()` store action behind a two-step confirmation; the wipe also restores defaults and prevents demo re-seeding.

## Technical Context

- **Language/Version**: TypeScript (strict), React 19, Vite — established at scaffolding.
- **Primary Dependencies**: shadcn/ui + Tailwind v4 (existing), `next-themes` (installed, currently unwired), `react-router` (existing), zustand (existing), Dexie (existing). **No new dependencies.**
- **Storage**: IndexedDB via Dexie; single AppSettings row (`key: 'main'`), extended in place. Cycles/DayRecords unchanged except via clear-all-data.
- **Testing**: Vitest (jsdom default; `@vitest-environment node` for the pure-engine suites). New settings-view component tests + table-driven engine band tests are required.
- **Target Platform**: offline-first PWA, mobile-first single-user.
- **Project Type**: web app (SPA).
- **Performance Goals**: N/A. Single-row settings writes; every control re-renders consumers reactively. No debouncing needed; toggles persist on change.
- **Constraints**: engine purity (no React/IDB imports in `core/engine`); all statuses derived at read time, never stored; YAGNI; no export/backup/cloud; settings-only change — no algorithm rule rewrites.
- **Scale/Scope**: one user, ~40 day-records per cycle; no growth concerns.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Marquette correctness** — band defaults stay 21–42 and post-peak default 3; Day 1 semantics untouched; algorithm on/off toggle included (mandatory). Band parameterization changes zero rule logic; defaults reproduce today's behavior exactly.
- [x] **Engine purity** — change is additive (`EngineSettings` gains two `number` fields; constants consumed via those fields). No new imports, no `any`, no framework/IDB leakage.
- [x] **Engine tests-first** — table-driven band cases added before implementation (constitution IV: any engine change requires `npm run test`).
- [x] **Offline / sync-ready** — new prefs ride the existing single settings row; `SyncMeta` retained. No new table.
- [x] **Read-time derivation** — no computed status stored; settings only tune inputs/display.
- [x] **Dependency discipline** — zero new dependencies.
- [x] **Spec scope (YAGNI)** — exactly the four stories in spec.md; no reminders/export/About/disclaimer, no goal-driven UI copy.

## Project Structure

### Documentation (this feature)

```text
specs/002-app-settings/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── settings-schema.md
│   └── settings-ui.md
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── main.tsx                 # unchanged
│   ├── router.tsx               # keep existing /settings route
│   └── providers.tsx            # + <ThemeProvider> wiring; seed demo only when !demoSeeded
├── core/
│   ├── engine/
│   │   ├── types.ts             # EngineSettings + cycleMinLength/cycleMaxLength
│   │   ├── marquette.ts         # constants consumed via params (keep exported defaults)
│   │   ├── engineSdk.ts         # band warning uses settings.cycleMin/MaxLength
│   │   └── predict.ts           # forecast band filter uses settings
│   └── store/
│       ├── entities.ts          # SettingsEntity + DEFAULT_SETTINGS new fields
│       └── useAppStore.ts       # engineSettingsOf() passes band fields
├── features/
│   ├── settings/
│   │   ├── index.tsx            # SettingsView replaces FeaturePlaceholder
│   │   ├── core-section.tsx     # goal, algorithm toggle, post-peak, history window
│   │   ├── display-section.tsx  # theme, week-start, overlays, cycle band
│   │   ├── danger-section.tsx   # clear-all-data confirmation flow
│   │   └── __tests__/
│   ├── calendar/grid.ts         # week-start generalized (labels + slicing)
│   ├── calendar/index.tsx       # read settings.weekStart
│   ├── cycle-chart/index.tsx    # overlay initial state + persistence from/to settings
│   └── today/index.tsx          # unchanged (already gates on algorithmEnabled)

tests/  (co-located __tests__ per feature dir)
├── features/settings/
├── features/calendar/
├── features/cycle-chart/
└── core/engine/                 # band table-driven cases (test-first per constitution)
```

**Structure Decision**: single-project SPA already in place; the feature edits the existing settings row and feature folders, adds no new directories beyond the settings sub-components. The engine gains two settings fields with no structural change. No Option-2/Option-3 structures apply.

## Complexity Tracking

> Only the one deliberate deviation — recorded for transparency.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| `EngineSettings` change (hardcoded band -> params) | Spec's "cycle-length band as a setting" (SC-002) can only be honored if the engine's band warning + forecast filter actually consume it | Store-only band field (never fed to engine) is a dead setting that misleads the user into thinking the protocol band changed; static re-export from the store would couple the pure engine backward (breaks purity) |
| `providers.tsx` demo-seed gating (read `demoSeeded`) | After clear-all-data, reload must not repopulate sample data (trade-off with demo tooling) | Removing the seed entirely: M6/M7 manual QA still relies on seeded data during development (keep until `TODO(remove-after-dev)`) |