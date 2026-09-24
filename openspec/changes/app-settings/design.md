# Design

## Context

Route `/settings` currently renders `FeaturePlaceholder`. A single persisted `SettingsEntity` row already exists (Dexie, key `main`), hydrated by `useAppStore`, with a write-through `updateSettings(patch)`. Shipped defaults: `goal: 'track-only'`, `algorithmEnabled: true`, `postPeakDays: 3`, `historyWindow: 6`, `theme: 'system'`. Three gaps make the stored settings partially inert today:

1. `next-themes` is installed and used by shadcn/sonner but never wired, so the app cannot apply `.dark`.
2. The engine hardcodes the cycle band (`CYCLE_LENGTH_MIN/MAX`, 21/42) for the out-of-band warning (`engineSdk.ts`) and the forecast band filter (`predict.ts`); no setting feeds it.
3. Cycle-chart overlay toggles are ephemeral `useState(false)`; calendar week slicing is fixed Monday-first.

Constraints: the pure engine (`core/engine`) must not import React/Dexie/the store; all computed statuses stay derived-at-read-time; new prefs ride the single settings row (no new tables); no new dependencies; YAGNI (no reminders, export, About, disclaimer, or goal-driven UI copy).

## Goals / Non-Goals

**Goals:**
- A routed `/settings` screen surfacing the five core prefs and the agreed additions: clear-all-data, cycle-chart overlay persistence, calendar week-start, cycle-length band.
- Every pref persists immediately (write-through) and is consumed where it belongs: theme live, band feeds the engine, overlays persist, week-start re-slices the calendar.
- Constitution-mandated algorithm toggle honored across Today / Calendar / Cycle chart.
- Safe destructive wipe: two-step confirmation, defaults restored, demo data does not resurrect after reload.

**Non-Goals:**
- No algorithm rule-logic rewrites — the band change is parameter plumbing; defaults reproduce today's behaviour byte-for-byte.
- No new dependency, new table, or new entity.
- No reminders/notifications, export/backup, cloud sync, About/disclaimer, or goal-driven UI copy (project-level exclusions).

## Decisions

### D1. Parameterize the engine band (the one deliberate deviation)

`EngineSettings` gains `cycleMinLength` / `cycleMaxLength` (defaults 21 / 42), threaded through `computeAll` into the band warning (`engineSdk.ts`) and the `predict.ts` forecast filter. `CYCLE_LENGTH_MIN/MAX` stay exported from `marquette.ts` as the engine defaults and the UI's pre-fill values, so default behaviour is byte-identical to today.

- **Alternatives rejected**: store-only band field (a dead setting — the engine would still warn against fixed 21–42, misleading the user); re-exporting the band from the store into the engine (breaks engine purity); display-only band (fails the measurable outcome that the engine respects the band).

### D2. Wire next-themes, persist the selection

Add `<ThemeProvider>` (`defaultTheme="system"`, `attribute="class"`) in `src/app/providers.tsx`; theme changes sync to the settings row via `updateSettings({ theme })` so the provider and store never diverge. `sonner`/shadcn already assume `useTheme` exists.

- **Alternatives rejected**: hand-rolled `useEffect` class toggling (reimplements next-themes); provider without persistence (violates the persist requirement).

### D3. Week-start, view-only

Add `weekStart: 'monday' | 'sunday'` (default `'monday'`, matching today's fixed layout). `calendar/grid.ts` derives `WEEKDAY_LABELS` and the week slicing from the setting; `calendar/index.tsx` reads `settings.weekStart`. Calendar cells are date-keyed, so only labels/slicing change.

- **Alternatives rejected**: labels-only change (day numbers would misalign on a Sunday start); skipping the feature.

### D4. Overlay persistence, persist-on-change

Add `overlayMucus / overlayBbt / overlayIntercourse: boolean` (default `false`) to settings. `cycle-chart/index.tsx` seeds overlay state from settings and writes toggles through `updateSettings` on change; the chart already re-renders when settings change.

- **Alternatives rejected**: persist-on-view-exit (unmount-timing complexity with no user benefit); persisting on the Cycle (overlays are a display preference, not cycle data).

### D5. Clear-all-data + demo-seed gate

Reuse the existing `clearAllData()` store action (deletes Cycle/DayRecord/Settings rows, rehydrates defaults) behind a two-step dialog: a destructive "Clear all data" button opens a confirmation with an acknowledgment checkbox gating a disabled-until-checked execute button. Gate demo seeding on the existing `demoSeeded` marker in `providers.tsx` (seed only when `!settings.demoSeeded`; a wipe leaves `demoSeeded: true`), so a reload after a wipe stays empty while dev QA keeps one-shot first-run seeding. Dev-only marker (`TODO(remove-after-dev)`).

- **Alternatives rejected**: typed-"DELETE" friction (a gated confirm button suffices at this scale); unconditional seed (wipe followed by reload would resurrect demo data).

### D6. Defaults

Keep shipped code defaults authoritative and extend `DEFAULT_SETTINGS` with `weekStart: 'monday'`, `cycleMinLength: 21`, `cycleMaxLength: 42`, overlays `false`. The spec draft listed `goal: TTA`, but the shipped M3 default is `track-only` — aligned to shipped to avoid a behaviour change by default.

Numeric validation is enforced in the Settings UI before any write: `postPeakDays` integer 0–10, `historyWindow` integer 1–12, band integers within 15–60 with min < max. Invalid input shows inline feedback and is never written.

## Contracts

### Settings schema (single row, key `main`, + SyncMeta)

- New fields on `SettingsEntity`: `weekStart: 'monday' | 'sunday'` (default `'monday'`), `cycleMinLength` (int 15–60, default 21), `cycleMaxLength` (int 15–60, default 42, min < max), `overlayMucus` / `overlayBbt` / `overlayIntercourse` (boolean, default false). Existing fields unchanged; `demoSeeded` stays a dev-only marker.
- `EngineSettings` (pure): existing `postPeakDays`, `historyWindow`, plus new `cycleMinLength`, `cycleMaxLength`. Mapping lives in `useAppStore.engineSettingsOf(settings)`.
- Missing row at boot hydrates to `DEFAULT_SETTINGS` (existing path). Writes go through `updateSettings(patch)`.

### UI contract (testids)

`settings-goal`, `settings-algorithm`, `settings-post-peak-days`, `settings-history-window`, `settings-theme`, `settings-week-start`, `settings-cycle-min`, `settings-cycle-max`, `settings-overlay-mucus`, `settings-overlay-bbt`, `settings-overlay-intercourse`, `settings-clear-data`, `settings-clear-dialog`, `settings-clear-ack`, `settings-clear-execute`.

### File touchpoints

- Engine: `core/engine/types.ts`, `engineSdk.ts`, `predict.ts` (defaults stay exported from `marquette.ts`).
- Store: `core/store/entities.ts`, `core/store/useAppStore.ts`.
- Shell: `app/providers.tsx` (ThemeProvider + demo-seed gate).
- Views: `features/settings/*` (new: `index`, `core-section`, `theme-section`, `display-section`, `danger-section`, `number-field`); `features/calendar/grid.ts` + `index.tsx`; `features/cycle-chart/index.tsx`.
- Tests: extended engine suite (table-driven band cases, written first per constitution IV), new settings suites, updated calendar/cycle-chart suites.

## Risks / Trade-offs

- **Band parameterization** is the only deviation from "no engine changes"; mitigated by defaults-preserve-behaviour and table-driven tests written before the change.
- **Theme wiring** touches the app shell (`providers.tsx`); provider/attribute mismatch is the main risk — mitigated with a `window.matchMedia` mock in jsdom tests. Shared-file edits are sequenced: `providers.tsx` by US1 then US3, `settings/index.tsx` by US1/US3/US4.
- **Demo-seed gating** couples wipe correctness to a dev-only flag; removing it is deferred via `TODO(remove-after-dev)`. Trade-off accepts one-shot sample data in dev for ongoing manual QA.
- **Validation is UI-enforced**; the store trusts the written row. Acceptable for a single offline single-user writer with no external ingestion; a future sync layer would need stronger enforcement.
- **Spec-default `goal: TTA` vs shipped `track-only`** resolved toward shipped to avoid changing behaviour by default.