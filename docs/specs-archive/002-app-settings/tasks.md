---

description: "Tasks for feature implementation: App Settings & Preferences"

---

# Tasks: App Settings & Preferences

**Input**: Design documents from `/specs/002-app-settings/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are required where the project conventions demand them — constitution IV mandates table-driven tests first for any engine change, and feature component tests are house style (every milestone ships them). Quickstart §4.1 lists the test-first engine cases.

**Organization**: Tasks are grouped by user story (spec.md) so each story is independently implementable and testable.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths in every task

## Shared-file sequencing notes

- `src/app/providers.tsx` is edited by US1 (T008, ThemeProvider) then US3 (T014, seed gate) — sequential.
- `src/features/settings/index.tsx` is edited by US1 (T005, shell), US3 (T013, mount danger-section), US4 (T022, mount display-section) — sequential.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify workspace baseline before any change

- [x] T001 Confirm baseline: run `pnpm test` (expect 104 passing) and `pnpm build` (strict `tsc -b` + PWA) from repo root; both green before any task begins

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared settings model all stories build on.

**⚠️ CRITICAL**: Complete before US3/US4 (US1 and US2 need only existing fields; the model extension is additive and behavior-neutral).

- [x] T002 Extend `SettingsEntity` and `DEFAULT_SETTINGS` in `src/core/store/entities.ts` with five fields per data-model.md §1: `weekStart: 'monday' | 'sunday'` (default `'monday'`), `cycleMinLength: number` (default `21`), `cycleMaxLength: number` (default `42`), `overlayMucus: boolean` (default `false`), `overlayBbt: boolean` (default `false`), `overlayIntercourse: boolean` (default `false`)

**Checkpoint**: Foundation ready — settings row carries the new fields; existing behavior unchanged.

---

## Phase 3: User Story 1 — Core Preferences Live & Persisted (Priority: P1) 🎯 MVP

**Goal**: The Settings screen surfaces goal, algorithm toggle, post-peak days, history window, and theme; every control persists via `updateSettings`; theme actually applies (root `.dark` class), surviving reload.

**Independent Test**: Change each core control on `/settings`, reload — values persist; setting theme to `dark` flips the root class and survives reload.

### Tests for User Story 1

> **NOTE: Write these FIRST; ensure they FAIL before implementation**

- [x] T003 [P] [US1] Component test in `src/features/settings/__tests__/settings.test.tsx`: SettingsView renders all core controls with the current store values and testids per `contracts/settings-ui.md` (`settings-goal`, `settings-algorithm`, `settings-post-peak-days`, `settings-history-window`, `settings-theme`)
- [x] T004 [US1] Component test in `src/features/settings/__tests__/settings.test.tsx`: changing theme select to `dark` applies the `.dark` root class (mock `window.matchMedia` for next-themes in jsdom) and calls `updateSettings({ theme: 'dark' })`; validation: posting `postPeakDays` -1 and 11 (bounds "integer 0–10" per data-model.md §3) and `historyWindow` 0 and 13 ("integer 1–12") shows inline error and does NOT write

### Implementation for User Story 1

- [x] T005 [P] [US1] Build SettingsView shell in `src/features/settings/index.tsx` (replaces `FeaturePlaceholder`): page heading, three section blocks (core / display & protocol / danger zone) in order per `contracts/settings-ui.md`, mounts core-section and theme-section
- [x] T006 [P] [US1] Create `src/features/settings/core-section.tsx`: goal select, algorithm switch (`settings-algorithm`, `checked=algorithmEnabled`), post-peak days input (validate "integer 0–10"), history window input (validate "integer 1–12"); every change writes its field via `updateSettings`; invalid numeric input shows inline error and is not written
- [x] T007 [P] [US1] Create `src/features/settings/theme-section.tsx`: theme select `settings-theme` (`system`/`light`/`dark`, `value=settings.theme`); change writes `updateSettings({ theme })`
- [x] T008 [US1] Wire `<ThemeProvider>` (next-themes) in `src/app/providers.tsx`: `defaultTheme="system"`, `attribute="class"`; sync theme changes to the settings row via `updateSettings({ theme })` so provider and store never diverge

**Checkpoint**: US1 demoable — Settings shows all core prefs; dark/light/system live; persistence across reload; numeric validation enforced.

---

## Phase 4: User Story 2 — Algorithm Off = Logging Only (Priority: P1)

**Goal**: With `algorithmEnabled = false` every view drops computed interpretation: Today shows logging-only (no computed status), Calendar shows no fertile-window shading, Cycle strip shows no interpretation and no predictions are labeled as confirmed.

**Independent Test**: Toggle the algorithm switch off; Today card/Calendar/Cycle strip show raw entries only (monitor/mucus rows still visible) and zero computed windows; toggling back restores them.

### Tests for User Story 2

> **NOTE: Write FIRST; ensure they FAIL (or are absent) before implementation**

- [x] T009 [P] [US2] Component test in `src/features/settings/__tests__/algorithm-off.test.tsx`: with `algorithmEnabled=false` — Today (`src/features/today/index.tsx`) renders the logging-only state (no computed fertile status), Calendar (`src/features/calendar/index.tsx`) renders no fertile-window shading on any cell, Cycle strip (`src/features/cycle-chart/index.tsx`) renders no interpretation band and no confirmed/predicted labels; with `true` all computed UI returns

### Implementation for User Story 2

- [x] T010 [P] [US2] Gate Calendar fertile-window shading on `algorithmEnabled` in `src/features/calendar/index.tsx` (currently not referenced): shading cells only when enabled
- [x] T011 [US2] Ensure Today card and Cycle strip show an explicit "logging only — interpretation off" label when `algorithmEnabled=false` (add copy where missing in `src/features/today/index.tsx` and `src/features/cycle-chart/index.tsx`); predictions stay labeled "predicted" while on

**Checkpoint**: US1 + US2 both work independently — constitution's mandatory toggle fully honored across all three views.

---

## Phase 5: User Story 3 — Clear All Data (Priority: P2)

**Goal**: Danger zone on Settings offers destructive "Clear all data" behind a two-step confirmation; execution wipes all cycles/day records, restores default settings, and does not repopulate sample data on reload.

**Independent Test**: Run the flow — History empty, Today no records, Settings back to defaults; reload stays empty (demo data does not re-seed).

### Tests for User Story 3

> **NOTE: Write FIRST; ensure they FAIL before implementation**

- [x] T012 [P] [US3] Component test in `src/features/settings/__tests__/clear-data.test.tsx`: `settings-clear-data` opens the dialog (testids `settings-clear-dialog`, `settings-clear-ack`, `settings-clear-execute` per `contracts/settings-ui.md`); execute disabled until ack checked; on execute, `clearAllData()` runs → `useAppStore` cycles/day-records empty and settings equal `DEFAULT_SETTINGS`; dialog close/escape leaves data intact

### Implementation for User Story 3

- [x] T013 [US3] Add danger-zone section in `src/features/settings/danger-section.tsx` and mount it in `src/features/settings/index.tsx` (after US1's T005): destructive `settings-clear-data` button → dialog with acknowledgment checkbox (gate) and disabled-until-ack `settings-clear-execute` that calls the existing `clearAllData()` store action
- [x] T014 [US3] Gate demo seeding in `src/app/providers.tsx` on the `demoSeeded` flag (per research.md §5): only call `seedDemoData()` when `!settings.demoSeeded`, and set `demoSeeded: true` on wipe so a reload after clear-all-data stays empty (FR-009); file already edited by US1's T008 — apply after

**Checkpoint**: US3 independently complete — destructive wipe safe (two-step), defaults restored, no demo resurrection.

---

## Phase 6: User Story 4 — Display & Protocol Preferences (Priority: P3)

**Goal**: Calendar respects week-start (default Monday), cycle band (21–42 default) drives the engine's out-of-band warning and forecast filter, and cycle-chart overlay toggles persist per-user.

**Independent Test**: Set week-start Sunday → calendar re-slices; set band 24–39 → 23-day cycle warns and is excluded from the forecast band; toggle strip overlays off/on → state survives navigation and matches Settings switches.

### Tests for User Story 4

> **⚠️ ENGINE FIRST (constitution IV)**: T015 must FAIL before T018 changes the engine.

- [x] T015 [P] [US4] Table-driven engine tests in `src/core/engine/__tests__/marquette.test.ts` (add `band-shift` describe), cases per quickstart.md §4.1: (a) default settings ⇒ band warning + forecast filter identical to current `CYCLE_LENGTH_MIN/MAX` behavior; (b) boundary — length `== min` / `== max` in-band, `min−1` / `max+1` out-of-band (flagged + excluded from `predict.ts` band filter); (c) shifted band `[24,39]` flags 23 and 40 and accepts 24–39, forecast respects the window
- [x] T016 [P] [US4] Week-start tests in `src/features/calendar/__tests__/grid.test.tsx`: existing Monday-first case still passes; new Sunday case — first day of cycle lands in the Sunday column, `WEEKDAY_LABELS` reads `['Su','Mo','Tu','We','Th','Fr','Sa']`
- [x] T017 [P] [US4] Overlay tests in `src/features/cycle-chart/__tests__/overlays.test.tsx` (existing file — keep current cases green): strip mounts with overlay toggles seeded from `settings.overlayMucus/overlayBbt/overlayIntercourse`; toggling calls `updateSettings` with the flipped value

### Implementation for User Story 4

- [x] T018 [US4] Add `cycleMinLength`/`cycleMaxLength` to `EngineSettings` in `src/core/engine/types.ts`; `src/core/engine/predict.ts` band filter and `src/core/engine/engineSdk.ts` cycle-band warning read the values (defaulting to exported `CYCLE_LENGTH_MIN`/`CYCLE_LENGTH_MAX` from `src/core/engine/marquette.ts`); extend `engineSettingsOf()` in `src/core/store/useAppStore.ts` to pass them; default behavior byte-identical (depends on green T015)
- [x] T019 [P] [US4] Create `src/features/settings/display-section.tsx`: week-start select (`settings-week-start`, default `monday`), cycle min/max inputs (`settings-cycle-min`, `settings-cycle-max`, validate "integer 15–60" and "min < max" per data-model.md §3), all via `updateSettings`
- [x] T020 [US4] Generalize `src/features/calendar/grid.ts`: derive `WEEKDAY_LABELS` and week slicing from `weekStart` (`'monday'` default) instead of the fixed Monday-first layout; update `src/features/calendar/index.tsx` to read `settings.weekStart`
- [x] T021 [P] [US4] Seed cycle-chart overlay initial state from settings and persist toggles in `src/features/cycle-chart/index.tsx`: replace ephemeral `useState(false)` defaults with `settings.overlayMucus/overlayBbt/overlayIntercourse`; on change call `updateSettings` (chart already re-renders on settings change)
- [x] T022 [US4] Mount `display-section` into the SettingsView shell in `src/features/settings/index.tsx` (after US1's T005 and US3's T013 edits); wire numeric bounds so band inputs cannot invert (min<max enforced in UI)

**Checkpoint**: All four stories independently functional; Settings is the single source of truth for display/protocol/preference.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and end-to-end validation across all stories.

- [x] T023 [P] Update `README.md` Status section: Milestone 8 (Settings) complete, remaining notes (medical disclaimer placement, demo-seed removal per `TODO(remove-after-dev)`)
- [x] T024 [P] Author `docs/MILESTONE_8_SETTINGS.md` milestone doc (house pattern: scope, decisions incl. band parameterization trade-off, verification steps referencing `quickstart.md`)
- [ ] T025 Run quickstart.md validation: scenarios S1–S7 manually on `pnpm dev`; full gates `pnpm test` (all suites), `pnpm lint` (no new warnings), `pnpm build` (strict) — all green; fix any failures before reporting done

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001)**: no dependencies — first task
- **Foundational (T002)**: after T001; blocks US3 and US4 (new settings fields), additive-safe for US1/US2
- **User Stories**: US1 → US2 → US3 → US4 in priority order; US3's T014 and US4's T022 wait on the matching earlier edits to their shared files (`providers.tsx`, `index.tsx`)
- **Polish (T023–T025)**: after all four stories

### User Story Dependencies

- **US1 (P1)**: nothing beyond T001 — fully independent, THE MVP
- **US2 (P1)**: reading-only of US1's toggle; no shared files with US1
- **US3 (P2)**: depends on T002 (defaults include new fields after wipe); `providers.tsx` edit after US1's T008
- **US4 (P3)**: depends on T002 for all new fields; engine tasks (T015→T018) test-first per constitution; `index.tsx` edit after US1/US3 mounts

### Within Each User Story

- Tests MUST be written first and FAIL before implementation (house TDD + constitution IV for engine)
- Store/model edits before view edits; view shell before sections; mounts last
- Story complete (test + impl + checkpoint) before moving to the next priority

### Parallel Opportunities

- T003/T004 (US1 tests) parallel; T005/T006/T007/T008 parallel after tests
- T009 (US2) then T010/T011 parallel
- T012 (US3), then T013/T014 parallel (T014 after US1's providers change)
- T015/T016/T017 (US4 tests) all parallel — engine table, grid, overlays
- T019/T020/T021 parallel after T018 (engine) and T002; T022 last (mounts)
- T023/T024 parallel; T025 final

---

## Parallel Example: Phase 6 (User Story 4)

```bash
# Tests first — all three are independent files:
Task: "Table-driven engine band tests in src/core/engine/__tests__/marquette.test.ts (T015)"
Task: "Week-start grid tests in src/features/calendar/__tests__/grid.test.tsx (T016)"
Task: "Overlay persistence tests in src/features/cycle-chart/__tests__/overlays.test.tsx (T017)"

# After engine + model land, independent view work:
Task: "display-section.tsx inputs (T019)"
Task: "calendar grid week-start (T020)"
Task: "cycle-chart overlay persistence (T021)"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2)

Both P1 stories ship as the MVP (constitution requires the algorithm toggle).

1. T001 baseline → (T002 optional for MVP) → US1 (tests T003/T004, then T005–T008)
2. STOP and VALIDATE: change core prefs, reload, flip theme, confirm persistence
3. US2 (test T009, then T010/T011) → VALIDATE toggle behavior across Today/Calendar/Strip
4. Deploy/demo: Settings fully functional, algorithm toggle constitutional-mandated

### Incremental Delivery

1. Baseline + model → US1 → US2 → stop/demo (MVP)
2. US3 (clear-all-data) → demo
3. US4 (display & protocol prefs) → demo
4. Polish (docs + quickstart validation)

### Parallel Team Strategy

Solo repo — sequential execution per the priority order above. If parallel: tests per story run first (all [P]), engine band work (T015/T018) can proceed independently of the settings-view tasks.

---

## Notes

- [P] tasks = different files, no dependencies. Cross-phase same-file edits (`providers.tsx`, `src/features/settings/index.tsx`) are sequenced explicitly.
- [Story] labels map tasks to spec.md user stories.
- Every user story is independently completable and testable (component tests + manual quickstart scenario).
- Engine change (T018) is the ONLY deviation from "no engine changes" — parameter plumbing, defaults preserve behavior; approved in plan.md Complexity Tracking.
- Commit after each task or logical group; stop at any checkpoint to validate.