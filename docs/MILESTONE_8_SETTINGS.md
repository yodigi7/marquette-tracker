# Milestone 8 — Settings & Preferences

Single routed Settings screen persisted to the local settings store: fertility goal, algorithm on/off, post-Peak days, inferred post-Peak fill mode, history window, theme, calendar week-start, cycle-length protocol band, persisted chart overlays, and a confirmed clear-all-data danger zone.

## 1. Files

```
src/features/settings/
  index.tsx                  # SettingsView shell: Core / Display & protocol / Danger zone sections
  core-section.tsx           # goal, algorithm toggle, post-Peak days, fill mode, history window
  theme-section.tsx          # theme (system/light/dark) via next-themes
  display-section.tsx        # week-start select + cycle band min/max (US4)
  danger-section.tsx         # clear-all-data, ack-gated destructive dialog (US3)
  number-field.tsx           # shared commit-on-blur/Enter validated numeric input (extracted US4)
  __tests__/
    settings.test.tsx        # US1: goal/algorithm/post-peak/history validation, theme persists
    algorithm-off.test.tsx   # US2: no interpretation app-wide when switch is off
    clear-data.test.tsx      # US3: ack gate, wipe + defaults restore, demo re-seed suppressed
src/app/providers.tsx        # ThemeProvider (attribute="class") + demoSeeded one-shot seed gate
src/features/calendar/grid.ts        # weekStart-aware slicing + weekday labels (US4)
src/features/calendar/index.tsx      # reads settings.weekStart; algorithm-off → no shading
src/features/cycle-chart/index.tsx   # overlay toggles seeded from + persisted to settings (US4)
src/core/engine/types.ts     # EngineSettings += cycleMinLength / cycleMaxLength
src/core/engine/predict.ts   # band filter reads EngineSettings
src/core/engine/engineSdk.ts # cycle-out-of-band warning reads EngineSettings
src/core/store/entities.ts   # SettingsEntity += weekStart, band, overlays; WeekStart type
src/core/store/useAppStore.ts# engineSettingsOf passes band; clearAllData writes demoSeeded:true
src/core/store/seedDemo.ts   # TEMP demo seeding — remove before release (TODO(remove-after-dev))
```

## 2. Behavior spec

- **Core settings**: goal select (track-only / avoid / achieve), algorithm switch (on by default; off ⇒ no fertile-window status, shading, or window band in Status/Calendar/Cycle chart while raw readings stay logged), post-Peak days (integer 0–10, default 4), inferred post-Peak fill mode (`Automatically after fertile window` by default or `After first user Low`), history window (integer 1–12). Numeric inputs commit on blur/Enter and reject out-of-range values with an inline error without writing. The fill mode is reconciled immediately; automatic mode stores assumed Low rows after the post-Peak window, while user-anchor mode leaves earlier gaps blank. Explicitly deleting an assumed row records a persistent suppression for that date and inference basis; entering user data on the date clears it.
- **Theme**: system/light/dark, applied live via `next-themes <ThemeProvider attribute="class">` (previously installed but unwired), persisted to settings.
- **Display & protocol**: week-start select (Monday default / Sunday), cycle band min/max (integer 15–60, min < max enforced in the UI; defaults 21–42). The band feeds the engine: cycles outside it trigger the existing "consult a teacher" style warning and are excluded from the forecast band filter.
- **Chart overlays**: the Cycle chart's BBT/mucus/intercourse toggles seed from and persist to `settings.overlayMucus/overlayBbt/overlayIntercourse` instead of ephemeral local state.
- **Danger zone**: clear-all-data in a confirm dialog; the execute button stays disabled until an ack checkbox is checked. Confirming wipes all cycles/records/resets settings to defaults and sets `demoSeeded` so demo data never re-seeds.

## 3. Engine deviation (tracked in spec-kit tasks/plan)

The user-facing requirement "no engine changes" was interpreted one way and the plan flagged a deliberate exception: the cycle band (21–42) is hard-coded as `CYCLE_LENGTH_MIN/MAX` in `core/engine/marquette.ts`. Making the band configurable required parameterizing the engine — `EngineSettings` gains `cycleMinLength`/`cycleMaxLength`, consumed by `predict.ts` (band filter) and `engineSdk.ts` (`collectWarnings(results, settings)`). Defaults equal the former constants, so behavior is byte-identical under default settings. Table-driven `band-shift` tests were written first (T015 RED before T018).

## 4. Test matrix

- `settings.test.tsx` (7): goal select, algorithm toggle, numeric validation (out-of-range rejected, not written), theme select persists.
- `postPeakFill.test.tsx` (3): default/persisted fill mode, algorithm-off preservation, post-Peak-day tail shift.
- `algorithm-off.test.tsx` (4): Status, Calendar, and Cycle strip show no interpretation when off; recordings still displayed.
- `clear-data.test.tsx` (3): execute disabled until ack; wipe + defaults restore + dialog closes + no re-seed.
- `grid.test.ts` (+2): Monday (default) preserved; Sunday-first slicing + labels.
- `overlays.test.tsx` (+2): strip mounts overlays seeded from settings; a toggle call persists via `updateSettings`.
- `band-shift` in `marquette.test.ts` (3): default preservation; boundary (==min/==max in, min−1/max+1 out); shifted [24,39].

Totals: 123 tests for the Milestone 8 snapshot (104 at the end of Milestone 7); the current full suite is 265 tests, all green with `pnpm test && pnpm lint && pnpm build`.

## 5. Verification

Quickstart scenarios S1–S7 (`specs/002-app-settings/quickstart.md`): core persistence, algorithm off, clear-all + no re-seed, week start, cycle band, overlay persistence, theme live.

## 6. Definition of Done

- [x] Core preferences persist and take effect immediately; numeric inputs validate without writing bad values
- [x] Post-Peak fill mode persists and reconciles stored assumed readings; at most 30 inferred rows per post-Peak window
- [x] Algorithm off ⇒ no fertile-window interpretation in any view; raw logging intact
- [x] Theme applied live and persisted
- [x] Week-start (Monday/Sunday) re-slices the calendar grid
- [x] Cycle band (15–60, min<max) drives the engine warning + forecast filter, defaults 21–42 unchanged
- [x] Chart overlay toggles persist across navigation/reload
- [x] Clear-all-data ack-gated; wipes everything; demo data does not re-seed
- [x] `pnpm test` (Milestone 8 snapshot: 123; current full suite: 232), `pnpm lint`, `pnpm build` green
- [x] README status → M8 complete; documented remaining items (disclaimer placement, demo-seed removal)
