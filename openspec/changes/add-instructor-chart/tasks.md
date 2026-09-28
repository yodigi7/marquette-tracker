# Tasks — instructor chart

Test-first throughout. Every task is done when its tests pass and `pnpm test` is green; run
`pnpm test` after any task touching `core/engine`.

## 1. Engine: expose the lookback Peaks a calendar rule consumed

- [x] 1.1 Add `LookbackPeak { cycleNo, peakDay }` and `CycleResult.lookbackPeaks` in `src/core/engine/types.ts`.
- [x] 1.2 Thread it out of `computeBegin` in `src/core/engine/marquette.ts` and into `CycleResult` from
      `computeCycle`, pairing `history.peaksByCycle` with `history.cycleNos` over the same `-windowSize`
      slice, filtered to non-null Peak days, oldest first.
- [x] 1.3 Table-driven tests in `src/core/engine/__tests__/marquette.test.ts`, written before 1.2: - cycle 7+ with a populated window yields the expected pairs - a window holding no Peak yields `[]` - the window slice takes the **last** `historyWindow` cycles, not the first - a cycle whose begin is `calendar-day-6` or `calendar-day-6-fallback` yields `[]` - a begin set by `first-high-or-peak` yields `[]` — the calendar rule did not run - the computed window begin and rule are byte-identical to before the change
- [x] 1.4 `pnpm test` green.

## 2. Model: the pure chart builder

- [x] 2.1 `src/features/instructor-chart/lib.ts` with `buildInstructorChartModel`, importing nothing from
      React, the router, the store, or the clock. Types: `InstructorChartModel`, `ChartCycle`, `ChartColumn`,
      `ChartRow`, `ChartCell`, `ChartEvidence`.
- [x] 2.2 Tests in `src/features/instructor-chart/__tests__/lib.test.ts`, written before 2.3, covering:
  - default fixed rows are date, menses, monitor, window — in that order
  - an optional row appears only when **that cycle** holds the value
  - widening the run adds rows for cycles that now have data
  - a day with no record yields the absent marker, never a value
  - the window row marks exactly the `fertile` days
  - a cycle with no end bands from the begin to the end of the cycle and says the end is undetermined
  - an open cycle is labelled in progress and states its length is unknown
  - the count defaults from `historyWindow`, and asking for more than exists covers all and reports the number
  - a calendar-rule begin produces an evidence line naming the earliest Peak and its cycle
  - evidence reaching past the charted range lists every contributing Peak and marks which are charted
  - `[]` lookback Peaks produces the "no Peak available" line and no Peak day
  - no value is carried forward from a neighbouring day
  - `algorithmEnabled: false` yields no window row and no evidence
- [x] 2.3 Implement 2.1 until 2.2 passes.
- [x] 2.4 `pnpm test` green.

## 3. Document: the landscape grid

- [x] 3.1 `src/features/instructor-chart/document.tsx` — presentational only, no store, no router, no clock.
      One `<table>` per cycle: cycle days across the top, observation rows down, `break-inside: avoid` per
      block, `print-sheet` on the sheet, an `aria-label` per block naming the cycle.
- [x] 3.2 Tests in `src/features/instructor-chart/__tests__/document.test.tsx`, written before 3.3:
  - cycle day numbers appear across the top in order
  - each observation label appears as a row
  - the window row marks exactly the fertile days
  - a monitor reading is a word, so the grid survives black and white
  - no value is conveyed by colour alone
  - the sheet carries `print-sheet`
  - no button, link, or input lives inside the sheet
  - each cycle block is labelled with its number, Day 1, and length, and an open cycle says so
- [x] 3.3 Implement 3.1 until 3.2 passes.

## 4. View and route

- [x] 4.1 `src/features/instructor-chart/index.tsx` — reads the store, builds the model, renders the
      document, and carries a print-hidden toolbar. The cycle-count control writes `?cycles=`; absent, the
      count is `settings.historyWindow`. `generatedOn` read once per mount.
- [x] 4.2 Register `/instructor-chart` in `src/app/router.tsx`.
- [x] 4.3 Tests in `src/features/instructor-chart/__tests__/instructor-chart.test.tsx`, written before 4.4:
  - the default run follows `settings.historyWindow`
  - `?cycles=N` is honoured
  - the control changes the run and is print-hidden
  - the print action calls `window.print` once and writes no file
  - opening and printing write, change, or delete nothing
  - no cycles renders an empty state offering a route back to History
- [x] 4.4 Implement 4.1–4.2 until 4.3 passes.

## 5. History entry point

- [x] 5.1 In `src/features/history/index.tsx`, add a "Print instructor chart" `Button asChild` → `Link` to
      `/instructor-chart` beside the existing "Compare cycles" control. Render only when
      `output.cycles.length > 0`.
- [x] 5.2 Tests in `src/features/history/__tests__/history.test.tsx`, written before 5.3:
  - the entry point appears when cycles exist
  - it is absent when no cycles exist
  - it is keyboard-focusable and activatable, with an accessible name identifying it as the instructor chart
  - it is not described as a data export
  - cycle rows still navigate to `/cycle/<cycleId>`, for closed and open cycles, with the algorithm off
- [x] 5.3 Implement 5.1 until 5.2 passes.

## 6. Docs

- [x] 6.1 `README.md` — the chart beside the existing summary in the feature list and the data-portability
      note, recorded as a printed document and not a file export.
- [x] 6.2 `AGENTS.md` — the non-negotiables list still reads "no PDF/PNG export". Correct it to the
      distinction the code actually implements: the app never generates an export file, and printable
      instructor documents are handed to the browser's own print action.

## 7. Gate

- [x] 7.1 `pnpm check` green.
- [x] 7.2 `openspec validate --all` clean, and `openspec validate add-instructor-chart --strict` clean.
- [x] 7.3 Verify against the spec: every scenario in `specs/instructor-chart/spec.md` and
      `specs/history/spec.md` has a test or is confirmed by inspection, and record the mapping in the PR.

## Scenario → test mapping

`src/core/engine/__tests__/lookback-peaks.test.ts` (engine)

| Scenario                                                             | Test                                                                                             |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Evidence is named with the cycle it came from                        | pairs each lookback Peak day with the cycle it came from, oldest first                           |
| A rule that had no Peak to use says so                               | is empty when the history window holds no monitor Peak to measure from                           |
| The window is the last `historyWindow` cycles                        | takes the last historyWindow cycles, not the first; honours a widened history window             |
| Cycles with no Peak contribute nothing                               | skips cycles in the window that recorded no Peak                                                 |
| A recorded reading that opened the window names no calendar evidence | names a first-High begin as that rule, not the calendar rule                                     |
| Cycles 1–6 carry no evidence                                         | is empty when the window holds no Peak (fallback case); the first-six case is the identity guard |
| The window itself is unchanged                                       | does not change the computed window, begin, or end                                               |
| No cycles at all                                                     | is `[]` for a user with no cycles at all, without throwing                                       |

`src/features/instructor-chart/__tests__/lib.test.ts` (model)

| Scenario                                        | Test                                                                                                                               |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Cycle days run across as columns                | makes one column per cycle day, in order                                                                                           |
| Days and observations become rows               | always carries date, menses, monitor and window rows in that order                                                                 |
| A day with no record shows no reading           | names a day with no record as having no monitor reading logged; shows a gap, not a repeated value, for a day with no record at all |
| The window is banded across the grid            | marks exactly the days the engine calls fertile                                                                                    |
| A cycle with no end bands to the cycle's end    | bands from the begin to the end of the cycle when no end can be determined                                                         |
| A recorded reading opened the window            | says the window opened by a recorded reading when one did                                                                          |
| No band with interpretation off                 | omits the window row and all evidence with interpretation off                                                                      |
| The default run is the configured window        | defaults to the configured history window                                                                                          |
| The default is six when untouched               | charts six cycles when the history window is untouched (view)                                                                      |
| Asking for more than exist                      | covers every cycle when the count exceeds what exists                                                                              |
| No projected cycle                              | never includes a projected cycle                                                                                                   |
| A run with only monitor readings stays narrow   | carries no optional row when nothing is logged                                                                                     |
| Logged data adds rows                           | adds rows for every observation the cycle holds                                                                                    |
| Widening the run can add rows                   | adds rows when widening the run brings in a cycle that holds the value                                                             |
| A row appears only on the cycle holding it      | adds a row only for the cycle that holds the value                                                                                 |
| An absence is not a value                       | shows an absence, never a value, for a day that records nothing for that row                                                       |
| Nothing is carried forward                      | shows a gap, not a repeated value, for a day with no record at all                                                                 |
| The calendar rule is named with the Peak used   | names the earliest Peak and its cycle when the rule ran                                                                            |
| Evidence is printed and marked                  | prints every contributing Peak and marks which are charted                                                                         |
| Evidence from uncharted cycles is still printed | marks evidence from cycles the chart does not cover                                                                                |
| No Peak available names no Peak day             | says the rule had no Peak to use and prints no Peak day                                                                            |
| Cycles 1–6 carry no evidence                    | carries no evidence for a cycle inside the first six                                                                               |
| An open cycle is not settled                    | states a closed cycle's length and an open cycle's progress                                                                        |
| Several Peak readings are reported              | reports a cycle's Peak day and count                                                                                               |
| Warnings are the engine's own                   | carries the protocol warnings the engine raised for a charted cycle                                                                |
| No warnings, no section                         | shows no warnings section for a cycle the engine did not warn about                                                                |

`src/features/instructor-chart/__tests__/document.test.tsx` (print markup)

| Scenario                                | Test                                                                                                                               |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Days are columns                        | lays the cycle day numbers across the top in order                                                                                 |
| Each observation is a row               | gives each observation its own labelled row                                                                                        |
| The band marks exactly the fertile days | marks the fertile days and leaves the rest unmarked                                                                                |
| Survives black and white                | carries a word for every monitor reading, so colour is never the only cue                                                          |
| Readable in both themes                 | reaches legibility through theme tokens, not fixed colours; marks the band with a token that inverts in dark mode and prints black |
| The print rules can find the sheet      | carries the print-sheet class so the print rules find it                                                                           |
| No control on the printout              | holds no control the printout would have to hide                                                                                   |
| Each block names its cycle              | names each cycle with its number, Day 1, and length; labels an open cycle as in progress rather than settled                       |
| The begin basis and its evidence print  | prints the begin basis and its evidence, marking cycles not on the page                                                            |
| The window's days are stated            | states the window's days; says when no window end could be determined                                                              |
| Warnings print only when raised         | carries the protocol warnings the engine raised, and none when there were none                                                     |
| No band with interpretation off         | shows the recorded data and no band with interpretation off                                                                        |
| A shortfall is stated                   | states the shortfall when fewer cycles exist than were requested                                                                   |
| The document is a snapshot              | carries the generation date so a saved file is a snapshot                                                                          |

`src/features/instructor-chart/__tests__/instructor-chart.test.tsx` (view)

| Scenario                                                 | Test                                                                     |
| -------------------------------------------------------- | ------------------------------------------------------------------------ |
| History opens the default run                            | defaults the run to the configured history window                        |
| The default is six when untouched                        | charts six cycles when the history window is untouched                   |
| An explicit count is honoured                            | honours an explicit count from the URL                                   |
| The user can change the count                            | changes the run and keeps the control off the printed page               |
| A shortfall is stated                                    | states the shortfall when fewer cycles exist than requested              |
| The user prints from the browser, and nothing is written | hands the document to the browser to print and writes no file            |
| No cycles, no document                                   | renders nothing but a route back when no cycles exist                    |
| Re-enabling restores the band                            | restores the band when interpretation is turned back on                  |
| No band with interpretation off                          | shows the recorded readings and no window when interpretation is off     |
| Evidence reaches past the charted range                  | prints the begin evidence for a cycle past the sixth                     |
| Evidence is marked charted when it is on the page        | marks contributing Peaks as charted when the run covers the whole window |

`src/features/history/__tests__/instructor-chart-entry.test.tsx` (entry point)

| Scenario                          | Test                                                                                                                               |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Offered when cycles exist         | offers the chart when cycles exist                                                                                                 |
| Not offered with no cycles        | does not offer the chart when no cycles exist                                                                                      |
| It opens the chart                | navigates to the chart view                                                                                                        |
| Reachable without a pointer       | is reachable and activatable without a pointer                                                                                     |
| Named as the chart, not an export | names itself the instructor chart, not a data export                                                                               |
| Cycle rows still navigate         | leaves cycle-row navigation to the cycle chart working; still navigates rows with the algorithm disabled, and the chart link stays |
| It does not swallow row clicks    | sits beside the compare link, not inside the cycle table                                                                           |

### Confirmed by inspection, not by a new test

- **"The JSON backup, its export, and the CSV export are unchanged"** and **"the chart is not offered in
  Settings"** — no file under `src/features/settings/` and no Settings test was touched. The chart's only
  entry point is the History link, asserted above to live outside the cycle table.
- **"The single-cycle summary is unchanged and still covers exactly one cycle"** — `src/features/cycle-summary/`
  and its 30 tests are untouched apart from a fixture gaining the new required engine field. Its own
  suite is green.
- **"The two documents are reached independently"** — `src/app/router.tsx` adds `/instructor-chart`
  alongside the existing `summary/:cycleId`; both are independently routable and neither links to the other.
