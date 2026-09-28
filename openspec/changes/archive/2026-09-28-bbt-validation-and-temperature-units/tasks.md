# Tasks

Tests are written before the implementation in every group. `pnpm test` is the verification command
unless a task says otherwise; `pnpm check` is the gate for the whole change.

## 1. Pure temperature rules (`src/core/temperature.ts`)

- [x] 1.1 Write `src/core/__tests__/temperature.test.ts` as a table-driven suite covering: the usual
      band (35.0–38.0 °C) saving without ceremony; the plausible band (34.0–42.0 °C) requiring
      confirmation; values outside 34.0–42.0 °C being refused; a Celsius value refused as a
      Fahrenheit mismatch with the converted value in the message; a Fahrenheit value refused as a
      Celsius mismatch; a value plausible in neither unit refused as out of range with no unit named;
      and the boundary values 34.0, 35.0, 38.0, 42.0 °C classified as documented. Verify the suite
      fails to compile because the module does not exist yet.
- [x] 1.2 Add the same suite's conversion cases: Celsius→Fahrenheit and Fahrenheit→Celsius for
      `36.56`, `97.7`, `98.2`, and `35.0`; display rounding to two decimals in Celsius and one in
      Fahrenheit; and a Fahrenheit round trip of `98.2` returning `98.2`. Verify these fail first.
- [x] 1.3 Create `src/core/temperature.ts` exporting the canonical unit, the band constants
      (defined in Celsius, derived for Fahrenheit), the conversion helpers, the display formatter,
      and a validator returning a discriminated result (`ok` / `confirm` / `refused` with a reason and
      a user-facing message). It MUST import nothing — no React, no Dexie, no browser API. Verify
      `pnpm test src/core/__tests__/temperature.test.ts` passes.
- [x] 1.4 Add the usual-range hint string helper used by the entry form, and verify the suite covers
      it rendering in both units.

## 2. Persisted unit preference

- [x] 2.1 Add `temperatureUnit: "c" | "f"` to `SettingsEntity` and `DEFAULT_SETTINGS` in
      `src/core/store/entities.ts`, with an `isTemperatureUnit` guard and a `normalizeTemperatureUnit`
      that discards an unrecognised stored value in favour of Celsius, mirroring
      `normalizeCalendarLayerIds`. Verify by test that the default is Celsius.
- [x] 2.2 Apply `normalizeTemperatureUnit` in the `settings.get()` merge in
      `src/core/store/repositories.ts` so an existing database resolves to Celsius with no migration
      and an unrecognised stored value cannot break the screen. Verify with a store test that a row
      written without the key reads as Celsius and a row carrying a junk value also reads as Celsius.
- [x] 2.3 Add the °C/°F control to `src/features/settings/display-section.tsx`, saving immediately,
      and extend `src/features/settings/__tests__/settings.test.ts` to verify the preference persists
      across a remount and that changing it writes no day record. Verify the test passes.

## 3. Day-entry form (`src/features/calendar/quick-entry.tsx`)

- [x] 3.1 Extend `src/features/calendar/__tests__/calendar.test.tsx` with failing cases: the field
      label, hint, and input step follow the active unit; an existing record pre-populates in the
      active unit; a Fahrenheit entry is stored in Celsius; a refused value writes nothing and leaves
      the form open with the value still in the field; a unit mismatch writes nothing and shows the
      likely cause; an unusual-but-plausible value stores only after confirmation; and dismissing the
      confirmation stores nothing. Verify they fail first.
- [x] 3.2 Make the field unit-aware: read the active unit from settings, derive label, hint, step,
      and placeholder from it, and pre-populate an existing record by converting the stored Celsius
      value for display. Verify the label/hint/step and pre-population tests pass.
- [x] 3.3 Validate on save: convert the typed value to Celsius, run the validator, and on `refused`
      show the message and write nothing while keeping the form open and the field populated. Reuse
      the existing `FutureDateError` catch shape rather than introducing a new error path. Verify the
      refusal and mismatch tests pass and that nothing was written.
- [x] 3.4 Add the confirmation dialog for an `confirm` verdict, reusing the `Dialog` pattern from
      `src/features/settings/danger-section.tsx`, with a Save anyway / Cancel pair. Verify the
      confirm and dismiss tests pass.

## 4. Cycle-chart temperature axis

- [x] 4.1 Extend `src/features/cycle-chart/__tests__/strip-chart.test.tsx` with failing cases: the
      axis scales to the converted readings, its ticks carry the unit suffix, an empty cycle falls
      back to the usual range in the active unit, and a stored implausible value widens the domain
      rather than plotting off-screen. Verify they fail first.
- [x] 4.2 Convert the BBT series to the active unit in `src/features/cycle-chart/strip-chart.tsx`,
      derive the domain from the converted values with a unit-appropriate pad, and label the
      `yAxisId="bbt"` ticks with the unit suffix. Verify the new chart tests pass and the existing
      `overlays.test.tsx` expectations still hold.
- [x] 4.3 Confirm the cycle-comparison chart is untouched — it has no temperature axis, so no change
      is required. Verify by grep that no BBT series is added to it.

## 5. Backup import reporting

- [x] 5.1 Extend `src/core/backup/__tests__/backup.test.ts` with failing cases: a backup containing a
      finite out-of-plausible-range temperature restores successfully with the value preserved exactly
      and counted in the result; the existing non-finite refusal still holds; a full round trip
      preserves every stored temperature with Celsius active; and a document exported with Fahrenheit
      active carries the same values as one exported with Celsius active. Verify they fail first.
- [x] 5.2 Count out-of-plausible-range temperatures during import in `src/core/backup/backup.ts`
      without failing the document, add the count to `BackupRestoreResult` in
      `src/core/backup/types.ts`, and thread it through `restoreBackup` in
      `src/core/store/useAppStore.ts`. Do not change `CURRENT_BACKUP_VERSION` or the record shape.
      Verify the backup tests pass.
- [x] 5.3 Surface the count in the restore flow in
      `src/features/settings/data-backup-section.tsx` as a warning that the user has readings worth
      checking, and extend `src/features/settings/__tests__/backup.test.tsx` to verify it appears.
      Verify the test passes.

## 6. Verification

- [x] 6.1 Run `pnpm check` and confirm the only failure is the pre-existing, date-dependent calendar
      test "refuses to log a projected day" that is already red on the base commit and already fixed
      on `agent/issue-31`. Confirm no new failure is introduced by this change.
- [x] 6.2 Run `openspec validate --all` and confirm it is clean.
- [x] 6.3 Confirm every acceptance criterion in the issue maps to a passing test, and record in the
      pull request which criteria are covered by tests and which are not.
