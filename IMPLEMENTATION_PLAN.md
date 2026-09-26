# Implementation Plan — Marquette Fertility Tracker (MVP)

Offline-first PWA. Vite + React + TypeScript, Tailwind + shadcn/ui, Zustand, Dexie (IndexedDB), Recharts, Vitest. No backend in MVP.

Milestones are built in dependency order: each phase ends runnable and tested. **Milestone 2 (engine) is the heart of the project — do it first as pure TS with table-driven tests, before any UI.**

---

## Milestone 1 — Project scaffold

**Goal:** empty, runnable Vite React TS app with all tooling wired up.

### Steps

1. `npm create vite@latest . -- --template react-ts`
2. Install deps:
   - Runtime: `react-router-dom`, `zustand`, `dexie`, `dexie-react-hooks`, `recharts`, `lucide-react`, `clsx`, `tailwind-merge`, `class-variance-authority`
   - Dev: `tailwindcss @tailwindcss/vite`, `vite-plugin-pwa`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `eslint` (bundled w/ vite template), `typescript`
3. Tailwind v4 via `@tailwindcss/vite` + `@import "tailwindcss"` in `src/index.css`.
4. shadcn/ui init (components-only; no tailwind config rewrite if v4). Add base components as needed per feature: `button`, `card`, `input`, `select`, `label`, `switch`, `dialog`, `table`, `tooltip`, `tabs`, `badge`, `separator`, `sonner` (toasts).
5. PWA: `vite-plugin-pwa` with `registerType: 'autoUpdate'`, manifest (name, theme, icons later), navigate fallback `index.html`; keep icons as placeholder SVGs in `public/` for now.
6. Vitest: `vitest.config.ts` with `environment: 'jsdom'` for components, `node` for engine tests (use `// @vitest-environment node` pragma in engine test files), `setupTests.ts`.
7. Scripts in `package.json`: `dev`, `test` (`vitest run`), `test:watch`, `build` (`tsc -b && vite build`), `preview`, `lint`.
8. Enforce TS strict; add `tsconfig` paths alias `@/` → `src/`.
9. README with commands.

**Directory skeleton:**

```
src/
  app/            # Router, layout shell, providers (theme, toasts)
  components/     # Shared UI (shadcn-based)
  core/engine/    # types.ts, marquette.ts, predict.ts (pure, zero deps)
  core/store/     # db.ts (Dexie), repositories, Zustand slices
  features/
    calendar/     # Month grid + daily entry
    status/       # Date-selectable read-only status
    cycle-chart/  # CBPM-style strip chart (Recharts)
    history/      # Stats + forecast
    settings/     # Settings form
```

**Acceptance:** `npm run dev` boots; `npm run build` passes; `npm run test` runs an empty suite.

---

## Phase 2 — Marquette engine (PURE TS) + tests

**Files:**

- `src/core/engine/types.ts` — domain types (below)
- `src/core/engine/marquette.ts` — fertile-window computation
- `src/core/engine/predict.ts` — cycle-length/forecast stats
- `src/core/engine/__tests__/marquette.test.ts`, `predict.test.ts` — table-driven tests
- `src/core/engine/engineSdk.ts` — pure API to compute a full annotated cycle (entry point the store will call)

**Constraints:** imports nothing but stdlib TS. No React/Dexie/browser APIs. Strict types; no `any`.

### Types (per AGENTS.md data model)

- `MonitorReading = 'none' | 'low' | 'high' | 'peak'`
- `MucusLevel = 'none' | 'low' | 'high' | 'peak'` (track as L/H/P per Marquette teaching)
- `BloodFlow = 'none' | 'light' | 'medium' | 'heavy'`
- `Cycle`, `DayRecord` (all fields optional, see AGENTS.md), `Settings`, plus derived:
  - `CycleDerived`: lengthDays, peakDay (monitor-or-mucus latest), peakType, fertile window `{ begin: CycleDay, end: CycleDay, beginRule, endRule }`, anyCycleOutOfBand flag
  - `DailyStatus` (`'pre-fertile' | 'fertile' | 'post-peak-safe' | 'post-fertile'`) + `statusSource: 'confirmed' | 'predicted'`

**Algorithm (`marquette.ts`) — implement exactly:**

Input: ordered `DayRecord[]` of one cycle + `Settings` + reference to previous cycles (for calendar rules).

1. Cycle day = dayInCycle per record; day 1 = first day of menses.
2. **Peak day** = max(day of last monitor `peak`, day of last mucus `peak`). If neither → no peak.
3. **Begin:**
   - If `cycleNo <= 6` (and fewer than 6 prior cycled cycles): begin = day 6.
   - In ALL cases: if a monitor `high` or `peak` reading occurs on cycle day d, begin = min(begin, d) (any first High triggers fertility).
   - After 6 cycles: calendar begin = earliest peak day of the last `historyWindow` (default 6) cycles minus 6 days; combine with first-High rule (min).
4. **End:**
   - `end = noPeak ? calendarFallbackEnd : lastMonitorPeakDay + postPeakDays` (4 full 24-h days by default = `peak + 4`; fertile spans peak … peak+4, first assumed Low at peak+5). Monitor-only: mucus is never Peak evidence.
   - After 6 cycles: end = min(historic latest monitor peak + `postPeakDays`, current end) — "whichever comes first".
   - No peak + after 6 cycles: use calendar fallback (latest monitor peak of last 6 cycles + postPeakDays). No peak + first 6 cycles: no reliable end → status `unknown` (and surface a notice).
5. **Statuses per day:** `pre-fertile` (before begin), `fertile` (begin..end), `post-peak-safe` (after end once peak confirmed), `post-fertile` (after end via calendar only — label shows if end was by calendar); predicted vs confirmed computed for days without data.
6. Cycle validity: length 21–42 days; engine returns `outOfBandWarnings` when ≥2 consecutive cycles outside band.

**Boundary rules to encode & test:**

- High/Peak before day 6 in first 6 cycles → begin at that day (min rule).
- Mucus peak later than monitor peak → peak day = later; end shifts.
- No peak logged → end rule behavior.
- Cycle ≥ 43 days with peak: still computes (warn only).
- Transition cycles 1→7: cycleNo determines which branch; first 6 cycles = cycleNo 1..6, "after 6" from cycleNo ≥ 7.
- Predictions (`predict.ts`): next period start via mean/median of last 6–12 closed cycle lengths; predicted fertile window via earliest/latest peak of last 6 cycles ± 6⁄+3 calendar rule; all returned as `predicted` (distinct in UI).

**Vitest tests (table-driven):**

- Hand-built per-cycle fixtures (arrays of DayRecords), assert begin/end day/status mapping.
- Cover: cycle 1–6 day-6 rule; early High; first cycle with Peak on day 14 (end = 17); mucus peak later than monitor; no-peak cycle; cycle 7+ calendar rule with fake history; peak-on-last-day; 21-day short cycle & 43-day long cycle warnings; forecast stats. Every engine change must run `npm run test`.

**Acceptance:** `npm run test` green; engine has zero imports outside `engine/` (lint rule if cheap, else review).

---

## Phase 3 — Storage + state

**Files:**

- `src/core/store/db.ts` — Dexie schema:
  - `cycles` table (id PK, cycleNo, day1, closedAt, notes, version, synced, createdAt, updatedAt)
  - `dayRecords` table (id PK, cycleId indexed, date indexed, dayInCycle, all optional fields, version, synced…)
  - `settings` table (single row, key = 'main')
- `src/core/store/Observable` hydrate: on app start, load all cycles+records+settings into memory (hobby-scale local data; recompute everything in memory for simplicity and fast reading).
- `src/core/store/useAppStore.ts` (Zustand): state = `cycles`, `dayRecords`, `settings`, `derivedByCycle: Map<cycleId, CycleDerived>`, `selectedCycleId`; actions:
  - `addDayRecord`, `updateDayRecord`, `deleteDayRecord`
  - `startNewCycle(day1)` (creates cycle; closes previous with `closedAt` = day before)
  - `markMenses(cycleId, dayInCycle)` helper (legacy/internal compatibility)
  - `updateSettings`
  - After every mutation: recompute `derivedByCycle` via engine + persist to Dexie (single source of truth: Dexie; store is in-memory mirror + recompute cache). Every write bumps `version`; `synced` stays false.
- Selectors helpers: `getCycleFor(date)`, `todayRecord()`, `latestCycle()`, `cyclesByRecency`.
- Migration seam: Dexie `version(1)` with upgrade stub documented so future schema changes (sync flags) are easy.

**Acceptance:** CRUD persists across reload; editing a record updates derived windows; saving Calendar records derives cycle structure from the full logged history.

---

## Phase 5 — Layout & routes

- `src/app/router.tsx`: React Router routes `/` (Calendar), `/status`, `/history` (+ `/cycle/:cycleId` detail), `/settings`; responsive top bar on desktop.
- `src/app/Providers.tsx`: theme provider (light/dark toggle in settings), Dexie init + store hydration gate (splash until ready).
- Status view at `/status` provides the read-only date-selectable status summary.
- App manifest name: "Marquette Tracker" (placeholder; refine later).

**Acceptance:** all routes render; offline load works via service worker (`npm run build && npm run preview`).

---

## Phase 6 — Feature views (in order)

### 6.1 Status (`features/status/`)

- Date picker for inspecting a selected date's derived status.
- Status card with `DayStatus` (fertile/safe/etc.), `confirmed` vs `predicted` source, computed fertile-window explanation, and next predicted period info.
- Read-only view with no daily-entry or start-cycle controls.
- **Acceptance:** selected dates show derived status or a no-cycle state without writing data.

### 6.2 Calendar view (`features/calendar/`)

- Month grid (shadcn pattern): each day cell shows monitor icon/dot, menses color, fertile-window background, and raw observation markers.
- Month nav arrows; tap day → quick-entry dialog (log that date).
- Calendar is the sole daily-input surface; the first eligible opening of the day may open today's dialog automatically.
- **Acceptance:** daily records save through the placement-aware store path and predicted vs confirmed windows remain visually distinct.

### 6.3 Cycle chart (`features/cycle-chart/`)

- Recharts: percent-based forced-scatter of monitor readings per cycle day: bar/area band per day colored Low (subtle) / High (green) / Peak (gray), overlay optional mucus and BBT (line, right axis) plus intercourse markers.
- Window band as background `<ReferenceArea>` shaded; predicted window dashed.
- Cycle selector (latest cycles dropdown).
- **Acceptance:** renders from real data; degenerates gracefully with missing data.

### 6.4 History/Stats (`features/history/`)

- Cycle table: cycleNo, start date, length, peak day, fertile days count, status (open/closed).
- Stats: avg + median cycle length (last 5/6 closed cycles), earliest/latest peak day, variability (range/Min-max), # cycles out of 21–42 band warnings.
- Forecast panel: next expected period date(s) with range, next estimated fertile window, language marking predictions.
- **Acceptance:** numbers match `predict.ts` fixtures.

### 6.5 Settings (`features/settings/`)

- Goal: TTA / TTC / track-only (informational labels; drives copy like "avoid intimacy in fertile window" vs "best days for conception").
- Algorithm toggle (ON default; when OFF the app logs data only, no windows/status computed; label clearly). postPeakDays stepper (default 4, allowed 0–10). historyWindow (default 6). Dark mode; clear-all-data danger zone (with confirm + IndexedDB clear).

**Acceptance:** toggle persists; with OFF, all fertile/time labels disappear app-wide.

---

## Phase 6b — Cross-cutting requirements

- Dates: store as UTC ISO strings (`date` = day); day boundaries via local tz at render; avoid `new Date()` arithmetic mismatches — use date-only keys for day records.
- Import path level: no `any` in `core/engine`; strict everywhere.
- Accessibility: shadcn components carry it; contrast of fertile-window colors OK in both themes.
- Performance: fine at hobby scale; don't premature-optimize; Derived computed in-memory on write.
- PWA: `npm run build` + `npm run preview` test offline reload; manifest installable.
- README: commands (`npm run dev/test/build`), architecture diagram (ascii), data model.

---

## Phase 7 — Hardening / final MVP

- Full test sweep engine + a few store tests (dexie mock: use `fake-indexeddb` dev dep for store tests).
- Manual QA walkthrough to e2e-style flow: create 3–4 cycles fixture (script in tests seeds Dexie) → verify Calendar/Status/chart/history numbers against hand-computed Marquette expectations; fix mismatches.
- `npm run build` clean + tsc strict; lighthouse-ish sanity: installable, offline, responsive.
- Finalize README + plan status.

---

## Current data-portability scope

- Versioned JSON backup/restore for all persisted local data, including schema migration and atomic restore.
- CSV is a separate, low-priority human-readable export; it is not the canonical backup format.

## Out of scope (post-MVP backlog)

- Python FastAPI backend / cloud sync / multi-user / auth; reminders; device import; postpartum/non-cycling protocols; PDF/CSV export.

---

## Definition of done (MVP)

1. Marquette engine matches the AGENTS.md rules on the test fixtures; `npm run test` green.
2. Calendar/Status/Cycle chart/History/Settings all functional offline; PWA installable.
3. Toggle disables computed windows globally.
4. Predictions visible and clearly labeled.
5. `npm run build` passes; README documents `dev`/`test`/`build`.
