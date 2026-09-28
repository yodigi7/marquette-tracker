# Tasks

Tests first, per the project's engine convention. Every engine task states the failing test that
precedes it. The `peakDay` field is **deleted** rather than redefined (design.md D1), so several tasks
finish with "verify the compiler now errors" as their check — that is the mechanism doing the work.

## 1. Types: split the single Peak value in two

- [x] 1.1 In `src/core/engine/types.ts`, replace `CycleResult.peakDay` with `firstPeakDay` and
      `lastPeakDay`, both `number | null`, and document that the first is the cycle's Peak day and the
      last is the reading the window end is measured from. Verify `pnpm typecheck` now fails in
      `marquette.ts`, `engineSdk.ts`, `projection.ts`, `predict.ts`, `grid.ts`, `auto-open.ts`,
      `status/index.tsx`, `history/index.tsx`, and `cycle-summary/lib.ts` — the complete list of readers
      design.md D1 enumerated. A field that compiles everywhere would mean the rename was missed.
- [x] 1.2 In `src/core/engine/types.ts`, replace `CycleHistory.peaksByCycle` with `firstPeaksByCycle`
      and `lastPeaksByCycle`, both `(number | null)[]` in cycle order. Verify `pnpm typecheck` fails in
      `engineSdk.ts`, `projection.ts`, and `marquette.ts`.

## 2. Engine: the calendar begin reads first-Peak days

- [x] 2.1 In `src/core/engine/__tests__/marquette.test.ts`, add table cases that build six prior cycles
      from **real records** holding two consecutive monitor Peak readings each, and assert the cycle-7+
      calendar begin is `min(first Peak) - 6`. This is the coverage gap design.md Context records: no
      existing case feeds a genuine multi-day run into a later cycle's begin. Verify the new cases fail
      against the current engine before 2.3 lands.
- [x] 2.2 In `src/core/engine/__tests__/marquette.test.ts`, add the swept invariant test asserting
      `fertileWindow.begin <= firstPeakDay` for every generated history-and-reading combination that
      holds a Peak (design.md D5), plus a case asserting a cycle's own first Peak opens the window the
      same way a High does. Verify the invariant test fails before 2.3.
- [x] 2.3 In `src/core/engine/marquette.ts`, have `computePeak` return `firstPeakDay` and `lastPeakDay`
      from one pass over the sorted records, pass `lastPeakDay` to `computeEnd`, and have `computeBegin`
      read `history.firstPeaksByCycle`. Update `DEFAULT_EARLIEST_PEAK`'s doc comment to state it is the
      earliest possible **first** Peak day. Verify the 2.1 and 2.2 cases pass and `pnpm test` is green.
- [x] 2.4 In `src/core/engine/engineSdk.ts`, push both `firstPeakDay` and `lastPeakDay` onto the two
      history arrays in the same loop iteration. Verify `pnpm test` is green and the projection cases
      that depend on the feed still pass.

## 3. Forecast and projection: each edge from its own reading

- [x] 3.1 In `src/core/engine/__tests__/predict.test.ts`, add failing cases for: a forecast window that
      begins six days before the earliest **first** Peak and ends three days after the latest **last**
      Peak; a range that does not widen when only a cycle's later reading moves; and the renamed
      `firstPeakDayEarliest` / `firstPeakDayLatest` all-cycles pair. Verify they fail before 3.3.
- [x] 3.2 In `src/core/engine/__tests__/projection.test.ts`, add failing cases for the same two edges
      over a lookback of multi-day runs, and for the composed fallback end. Verify they fail before 3.3.
- [x] 3.3 In `src/core/engine/predict.ts`, draw the forecast begin from first-Peak days and the end from
      last-Peak days, build `peakDayRangeInWindow` from the first readings, and rename
      `peakDayEarliest` / `peakDayLatest` to `firstPeakDayEarliest` / `firstPeakDayLatest` (design.md D7).
      In `src/core/engine/projection.ts`, build both history arrays and apply the same edge split to
      `projectCycles`'s window. Verify 3.1 and 3.2 pass and `pnpm test` is green.

## 4. The composed fallback end

- [x] 4.1 In `src/core/engine/marquette.ts`, add `MIN_PEAK_RUN_DAYS = 2` with the Fehring 2013 citation
      in its doc comment, recording that the monitor is specified to show at least two Peak days and
      that the minimum is the floor, not the average.
- [x] 4.2 In `src/core/engine/projection.ts`, recompose
      `PROTOCOL_DEFAULT_WINDOW_END = DEFAULT_EARLIEST_PEAK + (MIN_PEAK_RUN_DAYS - 1) +
DEFAULT_POST_PEAK_DAYS`, leaving `PROTOCOL_DEFAULT_WINDOW_BEGIN` at 6. Verify
      `src/core/engine/__tests__/projection.test.ts` asserts the composed value equals day 16 **and**
      equals the expression, so a literal cannot replace the derivation later.
- [x] 4.3 In `src/core/engine/__tests__/predict.test.ts`, assert the forecast's no-Peak-history window
      ends on cycle day 16. Verify `pnpm test` is green.

## 5. Surfaces: name both readings and their jobs [P]

These three share no files with each other. Each writes its own feature and its own test file.

- [x] 5.1 [P] In `src/features/status/lib.ts`, point `peakCountLine` at `lastPeakDay` so the
      retrospective count still measures from the reading the end came from, and leave the expected
      Peak-day range on `peakDayRangeInWindow`, which now holds first readings. Update
      `src/features/status/__tests__/lib.test.ts` and `status.test.tsx` for a two-reading cycle. Verify
      `pnpm test` is green and the count scenario still names the last reading.
- [x] 5.2 [P] In `src/features/history/index.tsx`, read the renamed
      `firstPeakDayEarliest` / `firstPeakDayLatest` in Cycle stats, and change the per-row Peak day cell
      to name the cycle's Peak day and, when the cycle holds more than one reading, state that the
      window end is measured from the last one. Update
      `src/features/history/__tests__/history.test.tsx`. Verify `pnpm test` is green.
- [x] 5.3 [P] In `src/features/cycle-summary/lib.ts`, change `peakLine` to name the Peak day, the number
      of readings, and — when there is more than one — the last reading and that the end is measured from
      it; point `END_BASIS` at `lastPeakDay`; thread both values through `SummaryModel` into
      `document.tsx`. Update `cycle-summary/__tests__/lib.test.ts`, `cycle-summary.test.tsx`, and
      `document.test.tsx`. Verify `pnpm test` is green.

## 6. Existence-only readers and remaining call sites

- [x] 6.1 Point the readers that only ask whether a Peak exists at `lastPeakDay`:
      `src/features/calendar/grid.ts` (two call sites), `src/features/calendar/index.tsx`,
      `src/features/calendar/auto-open.ts`, and `src/features/status/index.tsx`. These produce no
      user-visible change; verify `pnpm test` is green and `grid.test.ts` passes unchanged.
- [x] 6.2 Update `src/core/store/__tests__/store.test.ts` to assert both `firstPeakDay` and
      `lastPeakDay`. Verify `pnpm test` is green.
- [x] 6.3 Confirm `src/core/store/seedDemo.ts` needs no change: it writes one monitor Peak day per cycle
      (line 100-103), so `firstPeakDay` and `lastPeakDay` coincide in every demo cycle and the demo's
      calendar begin is unchanged. Verify by asserting the demo seed's peaks are all single-day, and
      leave the file unedited.

## 7. Verification

- [x] 7.1 Run `pnpm check` and confirm `format:check`, `lint`, `test`, and `build` are all green.
- [x] 7.2 Run `openspec validate --all` and confirm 0 failures.
- [x] 7.3 Resolve the one open question in `design.md`. **Decision:** the History cell renders as
      `day 12 (end from 13)` — a single compact line, with the second clause in a parenthetical rather
      than a second row, so the table keeps one row per cycle. Not browser-verified at a narrow
      viewport; the column is the only one that widens and the table already carries six columns.
- [x] 7.4 Remove the "In flight" line from the `AGENTS.md` domain-rules section, which was added while
      this change was in flight and must not survive its landing.
