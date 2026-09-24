# Research — App Settings & Preferences

Phase 0 output for `002-app-settings`. All material from in-repo verification of `src/core/engine`, `src/core/store`, and view code (2026-09-24).

## 1. Cycle-length band configurability (SC-002)

**Decision**: Parameterize the engine. `EngineSettings` gains `cycleMinLength: number` and `cycleMaxLength: number` (defaults `21`/`42`), threaded through `computeAll` into `engineSdk.ts:60` (the "cycle outside the 21–42 band" warning) and `predict.ts:35` (the forecast band filter). `CYCLE_LENGTH_MIN/MAX` in `marquette.ts` remain exported as the engine defaults so behavior with default settings is byte-identical to today. Table-driven band cases (boundary + default-preservation) added **before** implementation per constitution IV.

**Rationale**: The spec requires the band to be a user setting; a band that does not feed the engine's own warning/forecast filter is a lie ("band configured, engine still warns against fixed 21–42"). The engine already accepts `EngineSettings` everywhere it computes, so adding two numeric fields is parameter plumbing, not a rule change — it preserves Marquette correctness.

**Alternatives considered**:
- *Store-only field, engine untouched* — rejected: dead setting, contradicts SC-002 intent, misleading UX.
- *Re-export band from settings module into engine* — rejected: the pure engine must not import from the store (constitution purity gate).
- *Leave constants, expose band as display-only* — rejected: fails the measurable criteria SC-002 (user sets band → engine respects it).

## 2. Theme wiring (theme was inert)

**Decision**: Wire the already-installed `next-themes` into `src/app/providers.tsx` (`<ThemeProvider>`), with the persist callback writing the user's selection to the `theme` field of the settings row. `theme: 'system'` maps to the OS default via next-themes `defaultTheme="system"`. This is the minimal change: the shadcn components and `sonner` already assume `useTheme` exists; only the provider and the SettingsUI→settings row plumbing are missing.

**Rationale**: `SettingsEntity.theme` has existed since M3 but nothing ever set `.dark` on the root; the app is unavoidably light regardless of the stored value. Making the stored pref live is precisely the "surfacing existing settings" promise of US1. `next-themes` is already in `package.json` and used by `src/components/ui/sonner.tsx` — no new dependency.

**Alternatives considered**:
- *Hand-rolled `useEffect` class toggling* — rejected: reimplements next-themes and adds another surface to maintain; inconsistent with existing shadcn wiring.
- *ThemeProvider only, no persistence* — rejected: violates US1 (persist selection).

## 3. Week-start (SC-001-B, FR-004)

**Decision**: Add `weekStart: 'monday' | 'sunday'` to settings (default `'monday'`, matching the current hardcoded Monday-first grid). Generalize `src/features/calendar/grid.ts`: derive `WEEKDAY_LABELS` and the week slicing from the setting instead of the fixed `['Mo','Tu','We','Th','Fr','Sa','Su']`. Calendar view reads `settings.weekStart`. This is view-only: calendar cells are date-keyed independent of column order.

**Rationale**: `monthGrid` (grid.ts) already produces date-anchored week rows; changing column rotation + labels is a localized pure-function change covered by existing + new grid unit tests. No engine/storage impact.

**Alternatives considered**:
- *Recompute only labels, keep slicing fixed* — rejected: rows would misalign day numbers on Sunday-start (day 1 must land in the correct column).
- *Skip the feature* — rejected: user selected it in brainstorming; FR-004 is explicit.

## 4. Chart overlay persistence (FR-005)

**Decision**: Add `overlayMucus`, `overlayBbt`, `overlayIntercourse: boolean` (default `false`) to settings. `cycle-chart/index.tsx` replaces its ephemeral `useState(false)` defaults with the settings values and writes the toggle back via `updateSettings` on change. Because the chart view recomputes when `settings` change (it already depends on `settings.algorithmEnabled`), a persisted toggle updates the strip immediately.

**Rationale**: Tricky-on-every-visit live toggles were the user's stated pain; persisting on toggle is the smallest state model that "just works" and reuses the existing settings-recompute dependency.

**Alternatives considered**:
- *Local state seeded from settings, persisted on view exit* — rejected: complexity (cleanup timing, unmount persistence) with no user benefit over persist-on-change.
- *Persist to the Cycle instead* — rejected: overlays are a display preference, not cycle data; SC-003 keeps them in Settings.

## 5. Clear-all-data (SC-004)

**Decision**: Reuse the existing store action `useAppStore.clearAllData()` (which calls `repos.clearAll()` then refreshes, restoring default settings) behind a two-step confirmation dialog (destructive button + inline type-to-confirm per FR-010/FR-011). Additionally gate the demo-data seed on the existing `demoSeeded` flag: `providers.tsx` currently seeds **every boot**, so a destructive wipe followed by reload would repopulate sample data and defeat SC-004. With gating (`seedDemoData()` only when `!settings.demoSeeded`), a wiped store stays empty across reloads while dev QA keeps one-shot seeding on first run — honoring the marker's own doc comment.

**Rationale**: No new repo action; the confirmation flow is UI-only. The `demoSeeded` gate makes the existing "one-shot" marker true and directly serves FR-009's "sample data does not reappear after wipe". The flag remains a dev-only affordance (its `TODO(remove-after-dev)` seed path still ships); after the demo tooling is deleted, `demoSeeded` handling collapses to "always false".

**Alternatives considered**:
- *Stronger UX (typed "DELETE")* — rejected as friction vs. value at this scale; a dedicated confirm button + clear destructive label suffices for FR-010.
- *Leave seed unconditional* — rejected: reload after wipe resurrects demo data, violating FR-009 and SC-004.

## 6. Defaults

**Decision**: Keep existing code defaults authoritative: `goal: 'track-only'`, `algorithmEnabled: true`, `postPeakDays: 3`, `historyWindow: 6`, `theme: 'system'`. `DEFAULT_SETTINGS` gains the new fields with `weekStart: 'monday'`, `cycleMinLength: 21`, `cycleMaxLength: 42`, overlays `false`.

**Rationale**: The engine's behavior is calibrated on these; spec Assumptions listed `goal: TTA` but the shipped default (M3) is `track-only` — aligning to shipped reduces surprise. All defaults reproduce current behavior exactly (constitution "no behavior change by default" wins).

**Alternatives considered**: `goal: 'avoid-pregnancy'` default — rejected: `track-only` is the honest first-run default for a tracker and is already shipped in M3.

## 7. Validation bounds (per FR-001)

**Decision**: Validate numeric fields in the UI before persisting: `postPeakDays` integer 0–10; `historyWindow` integer 1–12; `cycleMinLength`/`cycleMaxLength` integers within 15–60 with `min < max` (band keeps 21–42 sensibly centered and never inverted). Invalid inputs show inline feedback and are not written.

**Rationale**: Bounds stay inside physiologically defensible ranges (AGENTS.md band is 21–42) while allowing Marquette-teacher guidance to widen it; inverted/invalid values would corrupt the band warning and forecast.

**Alternatives considered**: Free-form numbers persisted raw — rejected: garbage in → wrong fertile-window warnings.