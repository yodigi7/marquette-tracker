# Tasks

Notes from the source plan (speckit `002-app-settings`), preserved for the apply workflow:

- **[P]** tasks touch different files and can run in parallel; cross-phase same-file edits are sequenced explicitly (`src/app/providers.tsx` by 3.6 then 5.3; `src/features/settings/index.tsx` by 3.3, 5.2, 6.8).
- Story labels map to the delta-spec capability: US1 core prefs, US2 algorithm toggle, US3 clear-all-data, US4 display/protocol.
- Engine work is TEST-FIRST (constitution IV): 6.1 (tests) must be green before 6.4 (engine change).
- State is faithful to the source tasks.md: everything through 7.2 is complete; 7.3 (manual quickstart validation) is the only remaining task.

## 1. Setup

- [x] 1.1 Confirm baseline: run `pnpm test` (expected 104 passing) and `pnpm build` (strict `tsc -b` + PWA) from repo root; both green before any task begins

## 2. Foundational — shared settings model

- [x] 2.1 Extend `SettingsEntity` and `DEFAULT_SETTINGS` in `src/core/store/entities.ts` with the five new fields per data-model.md §1: `weekStart: 'monday' | 'sunday'` (default `'monday'`), `cycleMinLength: number` (default 21), `cycleMaxLength: number` (default 42), `overlayMucus: boolean` (default false), `overlayBbt: boolean` (default false), `overlayIntercourse: boolean` (default false). [P] Blocks the new-fields stories; additive-neutral for existing behavior.

## 3. User Story 1 — Core preferences (P1)

- [x] 3.1 [P] Component test in `src/features/settings/__tests__/settings.test.tsx` (write first, must fail): SettingsView renders all core controls with current store values and testids per contracts (`settings-goal`, `settings-algorithm`, `settings-post-peak-days`, `settings-history-window`, `settings-theme`)
- [x] 3.2 Component test in `src/features/settings/__tests__/settings.test.tsx` (write first): changing theme to `dark` applies the `.dark` root class (mock `window.matchMedia` for next-themes in jsdom) and calls `updateSettings({ theme: 'dark' })`; invalid `postPeakDays` (-1, 11; bounds 0–10) and `historyWindow` (0, 13; bounds 1–12) show inline error and are NOT written
- [x] 3.3 [P] Build SettingsView shell in `src/features/settings/index.tsx` (replaces `FeaturePlaceholder`): page heading, three section blocks in order (core / display & protocol / danger zone), mounts core-section and theme-section
- [x] 3.4 [P] Create `src/features/settings/core-section.tsx`: goal select (`settings-goal`, TTA/TTC/track-only), algorithm switch (`settings-algorithm`, `checked=algorithmEnabled`), post-peak days input (validate integer 0–10), history window input (validate integer 1–12); every change writes via `updateSettings`; invalid input shows inline error, not written
- [x] 3.5 [P] Create `src/features/settings/theme-section.tsx`: theme select (`settings-theme`, system/light/dark, `value=settings.theme`); change writes `updateSettings({ theme })`
- [x] 3.6 Wire `<ThemeProvider>` (next-themes) in `src/app/providers.tsx`: `defaultTheme="system"`, `attribute="class"`; sync theme changes to the settings row via `updateSettings({ theme })` so provider and store never diverge (after 3.5; this file is also edited by 5.3)

## 4. User Story 2 — Algorithm off = logging only (P1)

- [x] 4.1 [P] Component test in `src/features/settings/__tests__/algorithm-off.test.tsx` (write first): with `algorithmEnabled=false` — Today renders logging-only (no computed fertile status), Calendar renders no fertile-window shading on any cell, Cycle strip renders no interpretation band and no confirmed/predicted labels; with `true` all computed UI returns
- [x] 4.2 [P] Gate Calendar fertile-window shading on `algorithmEnabled` in `src/features/calendar/index.tsx` (currently not referenced): shade cells only when enabled
- [x] 4.3 Ensure Today and the Cycle strip show an explicit "logging only — interpretation off" label when `algorithmEnabled=false` (add copy where missing in `src/features/today/index.tsx` and `src/features/cycle-chart/index.tsx`); predictions stay labeled "predicted" while on

## 5. User Story 3 — Clear all data (P2)

- [x] 5.1 [P] Component test in `src/features/settings/__tests__/clear-data.test.tsx` (write first): `settings-clear-data` opens the dialog (`settings-clear-dialog`, `settings-clear-ack`, `settings-clear-execute`); execute disabled until ack checked; on execute, `clearAllData()` runs → store cycles/day-records empty and settings equal `DEFAULT_SETTINGS`; dialog close/escape leaves data intact
- [x] 5.2 Add danger-zone in `src/features/settings/danger-section.tsx` and mount in `src/features/settings/index.tsx` (after 3.3): destructive `settings-clear-data` button → dialog with ack checkbox (gate) and disabled-until-ack `settings-clear-execute` calling the existing `clearAllData()` store action
- [x] 5.3 Gate demo seeding in `src/app/providers.tsx` on the `demoSeeded` flag: only call `seedDemoData()` when `!settings.demoSeeded`, and set `demoSeeded: true` on wipe so a reload after clear-all-data stays empty (file already edited by 3.6 — apply after)

## 6. User Story 4 — Display & protocol (P3)

- [x] 6.1 [P] ENGINE FIRST — table-driven engine tests in `src/core/engine/__tests__/marquette.test.ts` (add `band-shift` describe); must FAIL before 6.4: (a) default settings ⇒ band warning + forecast filter identical to current `CYCLE_LENGTH_MIN/MAX` behavior; (b) boundary — length == min / == max in-band, min−1 / max+1 out-of-band (flagged + excluded from `predict.ts` band filter); (c) shifted band [24,39] flags 23 and 40 and accepts 24–39, forecast respects the window
- [x] 6.2 [P] Week-start tests in `src/features/calendar/__tests__/grid.test.tsx`: existing Monday-first case still passes; new Sunday case — first day of cycle lands in the Sunday column, `WEEKDAY_LABELS` reads `['Su','Mo','Tu','We','Th','Fr','Sa']`
- [x] 6.3 [P] Overlay persistence tests in `src/features/cycle-chart/__tests__/overlays.test.tsx` (keep current cases green): strip mounts with overlay toggles seeded from `settings.overlayMucus/overlayBbt/overlayIntercourse`; toggling calls `updateSettings` with the flipped value
- [x] 6.4 Add `cycleMinLength`/`cycleMaxLength` to `EngineSettings` in `src/core/engine/types.ts`; `src/core/engine/predict.ts` band filter and `src/core/engine/engineSdk.ts` cycle-band warning read the values (defaulting to exported `CYCLE_LENGTH_MIN`/`CYCLE_LENGTH_MAX` from `src/core/engine/marquette.ts`); extend `engineSettingsOf()` in `src/core/store/useAppStore.ts`; default behavior byte-identical (depends on green 6.1)
- [x] 6.5 [P] Create `src/features/settings/display-section.tsx`: week-start select (`settings-week-start`, default monday), cycle min/max inputs (`settings-cycle-min`, `settings-cycle-max`; validate integer 15–60 and min < max), overlay switches (`settings-overlay-mucus/bbt/intercourse`), all via `updateSettings`
- [x] 6.6 Generalize `src/features/calendar/grid.ts`: derive `WEEKDAY_LABELS` and week slicing from `weekStart` (default `'monday'`) instead of the fixed Monday-first layout; update `src/features/calendar/index.tsx` to read `settings.weekStart`
- [x] 6.7 Seed cycle-chart overlay initial state from settings and persist toggles in `src/features/cycle-chart/index.tsx`: replace ephemeral `useState(false)` defaults with `settings.overlayMucus/overlayBbt/overlayIntercourse`; on change call `updateSettings` (chart already re-renders on settings change)
- [x] 6.8 Mount `display-section` into the SettingsView shell in `src/features/settings/index.tsx` (after 3.3 and 5.2 edits); wire numeric bounds so band inputs cannot invert (min < max enforced in UI)

## 7. Polish & cross-cutting

- [x] 7.1 [P] Update `README.md` Status section: milestone 8 (Settings) complete; remaining notes (medical disclaimer placement, demo-seed removal per `TODO(remove-after-dev)`)
- [x] 7.2 [P] Author `docs/MILESTONE_8_SETTINGS.md` (house pattern: scope, decisions incl. band parameterization trade-off, verification steps referencing quickstart)
- [ ] 7.3 Run quickstart validation: scenarios S1–S7 manually on `pnpm dev`; full gates `pnpm test` (all suites), `pnpm lint` (no new warnings), `pnpm build` (strict) — all green; fix any failures before archiving the change