# Tasks

Sequencing: every task states its verification. Test-first ordering is explicit — write the failing test, watch it fail, then implement. Tasks sharing a file are listed in the order they must be applied; do not reorder them.

## 1. Layer vocabulary and stored preference

- [x] 1.1 Add the `CalendarLayerId` union and the canonical id tuple to `src/core/store/entities.ts`, beside the existing `CalendarDetailMode` type that sets the precedent for a feature-owned type living in the settings module. Verify with `pnpm typecheck`.
- [x] 1.2 Add `hiddenCalendarLayers` to `SettingsEntity` and `DEFAULT_SETTINGS` in `src/core/store/entities.ts`, defaulting to `[]` so nothing is hidden. Verify with a failing-first assertion in `src/core/store/__tests__/store.test.ts` that a fresh store reports every layer shown, then `pnpm test src/core/store`.
- [x] 1.3 [P] Create `src/features/calendar/layers.ts` holding the ordered layer declaration — id, label, group, the condition under which its key is offered (algorithm / full detail / always), the palette classes it paints, and its swatch shape — plus the helpers that answer which layers are currently offered, which are shown, and which are hidden. Verify with `src/features/calendar/__tests__/layers.test.ts` covering that the offered set shrinks when the algorithm is off and when the presentation is simple, and that the predicted cycle-start stripe is attributed to the predictive layer rather than the menses layer.

## 2. Split recorded menses from the predicted cycle start

- [x] 2.1 Write failing tests in `src/features/calendar/__tests__/grid.test.ts` asserting that a projected cycle's day 1 resolves to recorded-menses `false` with a separate cycle-start flag `true`, and that a logged blood flow resolves to recorded-menses `true` with the cycle-start flag `false`. Verify the tests fail against the current `CellInfo`.
- [x] 2.2 Add the cycle-start field to `CellInfo` in `src/features/calendar/grid.ts` and return it from both the projected-cycle and the real-cycle branch of `resolveCell`. Verify with `pnpm test src/features/calendar`.

## 3. Day cell honours hidden layers

- [x] 3.1 Write failing tests in `src/features/calendar/__tests__/calendar.test.tsx` that hide each layer in turn and assert the corresponding class is absent from a cell that would otherwise paint it, that the day number and today ring survive every layer being hidden, and that a day's accessible description is byte-identical before and after a layer is hidden. Verify the tests fail.
- [x] 3.2 In `src/features/calendar/day-cell.tsx`, accept the hidden-layer set and suppress only the painting that is already there — the phase fill, the forecast fill, the dashed border, the monitor dot, the menses stripe, and the intercourse icon. Add no new painting logic. Verify with `pnpm test src/features/calendar`.

## 4. Legend entries become controls

Shared files: `src/features/calendar/index.tsx` and `src/features/calendar/__tests__/calendar.test.tsx` are both touched by 3.1 and by this group. Apply 3.1 before starting 4.1, and extend the same test file rather than creating a second one.

- [x] 4.1 Write failing tests in `src/features/calendar/__tests__/calendar.test.tsx` asserting each offered legend entry is a control exposing its pressed state, that a hidden entry renders a hollow swatch with an unchanged label, that activating an entry twice restores its layer, that hiding `Menses` leaves a projected cycle's day-1 stripe visible, that the derived entries are not offered when the algorithm is off while the raw-data entries remain, and that the `Intercourse` entry is offered only in the full-detail presentation. Verify the tests fail.
- [x] 4.2 Replace the ad-hoc `LegendItem` / `LegendDot` / `LegendStripe` / `LegendMonitorKey` helpers in `src/features/calendar/index.tsx` with entries rendered from the layer declaration in `src/features/calendar/layers.ts`, so the legend and the day cell read the same list. Verify the key count matches the declaration and `pnpm test src/features/calendar` passes.
- [x] 4.3 Wire each entry to the stored preference in `src/features/calendar/index.tsx`, keeping the algorithm gate ahead of the layer gate so a stored choice can never paint a derived layer while the algorithm is off. Verify with a test that hides a layer, disables the algorithm, and confirms nothing derived is painted.
- [x] 4.4 Add the `Show all` control to the existing legend control row in `src/features/calendar/index.tsx`, rendered only when a layer is hidden, restoring exactly the layers currently offered and leaving every other stored choice untouched. Verify with tests for the algorithm-off case and for the inert no-hidden-layers case.

## 5. Persistence, backup, and wipe

Independent of groups 3 and 4 once group 1 has landed; touches `src/core/backup/backup.ts` and the settings tests, not the Calendar files.

- [x] 5.1 [P] Write failing tests in `src/core/backup/__tests__/backup.test.ts` asserting a document whose settings hide a layer round-trips that choice, and that a settings object carrying an unrecognised layer id restores successfully with the unknown id discarded rather than failing the restore. Verify the tests fail.
- [x] 5.2 [P] In `src/core/backup/backup.ts`, normalise the new field in `normalizeSettings` and validate it in `validateSettings` as an array of strings filtered to recognised ids — never failing a restore over an unrecognised id. Verify with `pnpm test src/core/backup`.
- [x] 5.3 [P] Verify in `src/features/settings/__tests__/clear-data.test.tsx` and `src/core/store/__tests__/backup.store.test.ts` that `Clear all data` returns the preference to nothing hidden and that a confirmed restore replaces it with the backup's value. Verify with `pnpm test src/features/settings src/core/store`.

## 6. Integration and gates

- [x] 6.1 Add a cross-check test asserting that the number of offered legend entries equals the number of layers whose conditions are currently met, so an entry that cannot hide anything is a failure rather than a dead control. Verify it fails if a layer is added to the declaration without a matching cell treatment.
- [x] 6.2 Run `pnpm check` and `openspec validate --all` and confirm both are green.

## 7. Verification pass

Added after `/opsx-verify` found the day-cell visibility tests had been deleted from `src/features/calendar/__tests__/calendar.test.tsx` while their task remained marked complete, and four scenarios had no coverage.

- [x] 7.1 Restore the `day cell layer visibility` and `the predicted cycle-start stripe` suites in `src/features/calendar/__tests__/calendar.test.tsx`, rewritten as a uniform boolean `painted` predicate over all nine layers rather than the mixed null/class reader that could not express a class-level assertion. Verify by breaking `day-cell.tsx` three ways and confirming the suite fails each time.
- [x] 7.2 Cover _Visibility choices survive month paging and view changes_ and _A stored `Intercourse` choice is preserved across a change of presentation_ in `src/features/calendar/__tests__/calendar.test.tsx`. Verify with `pnpm test src/features/calendar`.
- [x] 7.3 Cover _still reported as projected once the cue is hidden_ in `src/features/calendar/__tests__/calendar.test.tsx`, so the deliberate relaxation in the `fertility-visuals` delta is asserted rather than assumed.
- [x] 7.4 Cover _The legend is the only place these controls appear_ in `src/features/settings/__tests__/settings.test.tsx`. Verify with `pnpm test src/features/settings`.
- [x] 7.5 Remove the unused `DECLARED_LAYER_IDS` export from `src/features/calendar/layers.ts`. Verify with `pnpm typecheck` and `pnpm check`.

## 8. Close the two items verification left open

- [x] 8.1 Move the paint classes into `LAYER_PAINT` in `src/features/calendar/layers.ts` so the day cell and the legend sample both read one declaration, as design D1 describes, instead of each naming the palette. Verify with `pnpm typecheck` and the full calendar suite.
- [x] 8.2 Add a table test in `src/features/calendar/__tests__/calendar.test.tsx` asserting that for each of the nine layers the rendered day cell and the rendered legend key both carry the declared classes. Verify by hardcoding a different colour into the legend and confirming all nine cases fail.
- [x] 8.3 Correct the `calendar` delta's non-hideable clause, which promised a cell-level selection indicator the Calendar does not have, to state what the app actually guarantees: the day number, the click target, and the today indicator, with selection conveyed by the day-entry dialog. Verify with `openspec validate calendar-layer-visibility --strict`.
