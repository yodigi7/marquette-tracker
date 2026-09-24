# Proposal

## Why

The Settings route (`/settings`) is the last placeholder in the app. Core preferences already exist in the store — `goal`, `algorithmEnabled`, `postPeakDays`, `historyWindow`, `theme` — but only the algorithm toggle is surfaced anywhere, so users cannot personalise the tracker (TTA / TTC / track-only). The project mandates an explicit algorithm on/off switch, and several display behaviours that should be configurable are hardcoded: calendar week-start, cycle-chart overlay state, and the engine's 21–42 day cycle-length band. The installed `next-themes` package is inert — the app stores `theme` but never applies `.dark`.

## What Changes

A dedicated `/settings` screen with three sections:

- **Core** — fertility goal (TTA / TTC / track-only), algorithm on/off switch (on by default), post-Peak days (default 3), history window (default 6), theme (system / light / dark).
- **Display & protocol** — calendar week-start (Monday default, Sunday option), cycle-length band (default 21–42), cycle-chart overlay toggles (mucus / BBT / intercourse).
- **Danger zone** — "Clear all data" behind a two-step confirmation that wipes all cycles/readings and restores default preferences (and does not re-seed demo data).

Every preference persists immediately to the existing single Dexie settings row and applies app-wide. The engine gains `cycleMinLength`/`cycleMaxLength` on `EngineSettings` (defaults 21/42) so the out-of-band protocol warning and the forecast band filter consume the configured band — parameter plumbing, no rule-logic change.

## Capabilities

### New Capabilities
- `app-settings`: the Settings screen — core, display/protocol, and danger-zone preferences, persisted and applied app-wide.

### Modified Capabilities
- (none — first capability spec in the project)

## Impact

- `src/core/store/entities.ts` — `SettingsEntity` + `DEFAULT_SETTINGS` extended (`weekStart`, `cycleMinLength`, `cycleMaxLength`, `overlayMucus`, `overlayBbt`, `overlayIntercourse`).
- `src/core/engine/types.ts` — `EngineSettings` gains `cycleMinLength`/`cycleMaxLength`.
- `src/core/engine/engineSdk.ts`, `src/core/engine/predict.ts` — consume the band from settings.
- `src/app/providers.tsx` — `<ThemeProvider>` (next-themes) wiring; demo seed gates on `demoSeeded`.
- `src/features/settings/*` — new view + sections (core / theme / display / danger) replacing `FeaturePlaceholder`.
- `src/features/calendar/grid.ts` + `index.tsx` — week-start generalization.
- `src/features/cycle-chart/index.tsx` — overlay state persisted via settings.
- Tests: new/updated suites in `src/core/engine/__tests__`, `src/features/settings/__tests__`, `src/features/calendar/__tests__`, `src/features/cycle-chart/__tests__`.
- No new dependencies. No DB schema change beyond the single settings row.