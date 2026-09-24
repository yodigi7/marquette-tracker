# Implementation Plan: Cycle Strip Chart (Milestone 6)

**Branch**: `001-cycle-strip-chart` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-cycle-strip-chart/spec.md` — the Milestone 6 view per IMPLEMENTATION_PLAN §6.3 + AGENTS.md view 3.

## Summary

Replace the `cycle-chart` placeholder with a read-only, mobile-first CBPM-style **strip chart** of one cycle: daily monitor readings (Low / High / Peak) as equal-width bands on a numeric day axis, the engine-computed fertile window drawn as a shaded `ReferenceArea` behind the strip (solid = confirmed, dashed = predicted), toggleable mucus / BBT (right-axis, gapped) / intercourse overlays, and a newest-first cycle selector. Renders entirely from `useAppStore` (read-only), honors `settings.algorithmEnabled` (no window band when off), and degrades to an empty-state CTA when no cycles exist.

No schema, engine, or store changes. New feature code lives in `src/features/cycle-chart/`; render logic is Recharts (already in the stack, verified for the needed primitives), pure derivation helpers go in `feature/lib.ts` for table-driven unit tests, and the view gets jsdom component tests mirroring the calendar/test pattern (`calendar.test.tsx`).

## Technical Context

**Language/Version**: TypeScript 6.0.2 (strict, `verbatimModuleSyntax`, `erasableSyntaxOnly`), React 19, Vite 8

**Primary Dependencies**: Recharts ^3.10.1 (already installed — `ComposedChart`, `Bar`+`Cell`/custom `shape`, `Line.connectNulls:false`, `Scatter`, `ReferenceArea`, numeric + dual `YAxis`, `ResponsiveContainer`). UI from existing shadcn/ui kit: `Select`, `Button`, `Badge`, `Switch` (present in kit), `Card`. `date-fns`/`core/dateKeys` for labels. **No new dependencies** (constitution principle V).

**Storage**: None new. Read-only consumption of `useAppStore` state: `cycles`, `dayRecords`, `settings.algorithmEnabled`, `output` (`EngineOutput`). No writes from the view (FR-009).

**Testing**: Vitest 4 (jsdom default; `fake-indexeddb/auto` singleton store for component tests, mirroring `calendar.test.tsx`; pure `lib.ts` helpers as plain unit tests). Gates: `pnpm test`, `pnpm lint` (oxlint), `pnpm build`.

**Target Platform**: Offline-first PWA, mobile-first portrait (strip scrolls horizontally on phones), both themes.

**Project Type**: Web app — a single feature view (React SPA).

**Performance Goals**: Hobby scale; nothing to tune (recompute-on-write already central). Strip must not reflow jankily on fast overlay toggling (small datasets, no memoization needed).

**Constraints**: Pure `core/engine` MUST NOT be touched; all derived helpers live in the feature. View is read-only (no store writes). When `algorithmEnabled === false` NO fertile-window band renders — only raw readings (constitution I). No `any` anywhere. Accessible + legible in light/dark.

**Scale/Scope**: One read-only view replacing `src/features/cycle-chart/index.tsx` placeholder; completes Milestone 6. History/Stats (M7) is not in scope.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design — see "Post-design re-check".*

| Gate | Status | Assessment |
|---|---|---|
| I. Marquette correctness | PASS | Strip derives day-by-day status/source from engine `DayResult` only — view adds no interpretation. Window band gated on `settings.algorithmEnabled` (off ⇒ raw readings only). |
| II. Offline-first, local-only, sync-ready | PASS | Read-only from the Dexie-backed store; no schema/entity changes; no new storage semantics. |
| III. Pure, portable engine | PASS | Zero changes to `core/engine`; new helpers are feature-local and browser-safe, kept OUT of the engine. |
| IV. Test-first for the engine | PASS | No `core/engine` change ⇒ no new engine table tests required; feature gets `lib.ts` unit tests + component tests, and the existing 58-test suite must stay green. |
| V. Minimal dependencies | PASS | Uses only Recharts (already decided/locked) + existing shadcn/ui kit. No new dependency. |
| Scope constraints | PASS | Fully digital, no export/reminder/device features introduced; window band is derived at read time, never stored. |

All six gates pass — no violations to justify (Complexity Tracking not needed).

## Project Structure

### Documentation (this feature)

```text
specs/001-cycle-strip-chart/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions incl. Recharts strip approach
├── data-model.md        # Phase 1 — consumed entities + read-side StripModel
├── quickstart.md        # Phase 1 — validation guide
├── contracts/           # Phase 1 — strip-model + UI contracts
│   ├── strip-model.md
│   └── cycle-strip-ui.md
└── tasks.md             # Phase 2 — /speckit.tasks (NOT created by /speckit.plan)
```

### Source Code (repository root)

Uses the existing single-project layout (`src/**`); only the feature module changes.

```text
src/features/cycle-chart/
├── index.tsx                 # CycleChartView: cycle selector, overlay toggles, empty state
├── strip-chart.tsx           # Recharts strip: bands, ReferenceArea window, overlays, axes
├── lib.ts                    # PURE: buildStripModel + overlay series (unit-tested)
└── __tests__/
    ├── lib.test.ts           # table-driven model/series tests
    └── cycle-chart.test.tsx  # component tests (seeded fixtures, testid assertions)
```

Unchanged: `src/app/router.tsx` already routes `/cycle/:cycleId` → `CycleChartView`. No new routes, no nav changes, no engine/store changes.

**Structure Decision**: Single React app, feature-module pattern per AGENTS.md (`src/features/cycle-chart`), placeholders for M7 (`history`, `settings`) left untouched.

## Complexity Tracking

> Not needed — Constitution Check passes with zero violations.

## Post-design re-check (after Phase 1)

Re-ran every row above against the Phase 1 artifacts — all still PASS. Notable re-confirmations: no schema/entity change (FR-009 read-only hold), the band's confirmed/predicted classification is a pure derivation mirroring `core/cycleStatus.dayInfo` (not new Marquette logic), and the numeric X-axis/`ReferenceArea` design needs no extra dependency. Phase 1 introduced no new constitution risk.