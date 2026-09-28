# Design — instructor chart

## Summary

A second printable document beside the single-cycle summary: a grid with cycle days running **across** as
columns and observations running **down** as rows, one block per cycle, covering a run of the most recent
cycles. Reached from History. Printed through the browser, exactly as the summary is. No file, no upload,
no write.

## The shape

The app already has everything a chart needs except a layout that matches the one instructors read:

```
  cycle day ----> 1   2   3   4   5   6   7   8  ...  28
                +----------------------------------------+
   date         | 3/02 3/03 3/04                        |
   menses       |  X   X   .                            |
   monitor      |  L   L   L   H   H   H   P   P  ...   |
   window       |##################################      |
   mucus        |  -   -   L                             |   <- only if logged
   temp         |      .   .                             |   <- only if logged
                +----------------------------------------+

                ... next cycle's block, below
```

Columns are `CycleResult.days`, which the engine already bounds correctly — `today` for an open cycle, the
next cycle's Day 1 for a closed one. So column count needs no new arithmetic.

## Decision 1 — the engine gains one additive field, and only one

The chart has to print which lookback Peak days produced a window begin. The engine already has that data:
`computeAll` threads a `CycleHistory` of `peaksByCycle` / `cycleNos` into `computeCycle` and `computeBegin`
consumes it, but it is never returned, and `EngineOutput` is `{ cycles, forecast, warnings }`.

Rather than widen `EngineOutput` — which would put a per-cycle concern on every consumer — the evidence is
attached to the cycle it explains. `CycleResult` gains:

```ts
export interface LookbackPeak {
  cycleNo: number;
  peakDay: number;
}

interface CycleResult {
  // ...
  /** The lookback monitor Peak days the calendar rule was derived from, oldest first. */
  lookbackPeaks: LookbackPeak[];
}
```

`computeBegin` already computes `historic`; it now also returns the `peaksByCycle` / `cycleNos` pairs behind
it, filtered to non-null Peak days. An **additive, optional-in-meaning** field: existing consumers ignore it,
and nothing is persisted. The window itself is untouched — the begin day and its rule are computed exactly
as before.

**Rejected:** widening `EngineOutput` with a `history` field. It is the same data but it would force every
caller to thread a run of cycles it does not care about, and the evidence is only ever read next to the
cycle whose rule it explains.

## Decision 2 — the model is pure and DOM-free, mirroring the summary

`src/features/instructor-chart/lib.ts` exports `buildInstructorChartModel`, taking the engine output, the
day records, the cycle count, and the algorithm toggle. It imports nothing from React, the router, the
store, or the clock — the same contract `cycle-summary/lib.ts` already holds. `generatedOn` is passed in by
the view, exactly as the summary passes it.

This is what makes the awkward parts testable without a DOM: which rows appear, how a day with no record
renders, which evidence lines print, and how a cycle with no end is banded.

## Decision 3 — the grid is a per-cycle table, and the page stacks

Each cycle is one `<table>`. Columns are its cycle days; rows are its observations. Cycles stack down the
page, each in its own block with a heading naming the cycle, Day 1, and length.

**Why a table per cycle and not one giant table.** A single table across six cycles would need a two-level
column header, and the two cycles' day numbering would have to be disambiguated per column. Per-cycle tables
let each block carry its own `1..n` header, which is what an instructor reads and what makes each block
legible on its own.

**Packing versus pagination.** Cycles stack and flow; no page break is forced between them, and each block
carries `break-inside: avoid` so a cycle is never split across a page. The browser's own pagination then
lands wherever it lands. With a 28-day cycle a landscape letter page holds roughly two blocks.

## Decision 4 — the page size is the user's, not ours

`src/index.css` sets `@page { margin: 12mm }` and deliberately omits `size`, commented _"so whatever paper
the user has is respected."_ This change does **not** add `size: landscape`.

Forcing landscape would override a documented decision, and it would be wrong for a one- or two-cycle chart
where portrait is the better sheet. A wide grid is a real consequence of that choice, so the container
scrolls horizontally on screen, and a printed one-cycle chart is a tall portrait page with a wide table on
it. The user picks landscape in the print dialog when they want it, which is the same place they already
pick the destination.

## Decision 5 — the window is its own row, marked per day

The band is a dedicated **Fertile window** row whose cells are filled on days the engine classifies
`fertile` and empty otherwise, taken straight from `DayResult.status === "fertile"`.

A filled cell is not a colour, so the band survives black and white — the same requirement the summary's
"no value distinguished by colour alone" is written against. Each block also states its begin and end in
words, and a cycle whose end is undetermined says so and bands from the begin to the end of the cycle.

## Decision 6 — rows are conditional, in a fixed order

Always present, in this order: **date**, **menses**, **monitor reading**, **fertile window**. Then one row
per optional observation — mucus, temperature, intercourse, pregnancy test, symptoms, notes — and a row
appears only when at least one day in **that cycle** holds that value.

The spec says "the run"; scoping it per cycle is a deliberate narrowing. A six-cycle packet where only the
last cycle has temperatures should not grow a temperature row for the five that have none, because an empty
row is a gap in the grid that an instructor reads as missing data rather than as absence. `buildInstructorChartModel`
is given the whole run and decides per cycle.

## Decision 7 — evidence prints per cycle, and marks what is on the page

For a cycle whose begin came from the calendar rule, the block prints a line naming the earliest Peak day
and the cycle it came from. When `lookbackPeaks` reaches back past the charted range, **every** contributing
Peak prints, each annotated with whether that cycle is charted on this page.

```
  Window opened by the calendar rule — earliest Peak day 12, cycle 3.
  Peak days used:  cycle 2 day 15 (not charted) · cycle 3 day 12 (charted)
```

This is the whole point of the change: a claim on the page with nothing on the page to check it against is
worse than no claim. When `lookbackPeaks` is empty the line says the rule had no Peak to use and prints no
Peak day.

## Decision 8 — routing and the count

Route `/instructor-chart`, with the count in the `?cycles=` search param. Default when absent is
`settings.historyWindow`, which is itself 6 by default — so the "six cycles" figure is not duplicated as a
second constant.

The count is deliberately **not** a stored setting: the spec says per-print, and a `useSearchParams` value
is already per-print, survives a refresh, and makes the printed state inspectable. The control writes the
param; History links to the bare route and takes the default.

The store's `settings.historyWindow` is read, not written, by this feature. The chart does not add a
setting and cannot move the protocol window.

## Decision 9 — History gains one control, and it must not eat the rows

`HistoryView`'s header already holds a "Compare cycles" link, so the entry point goes beside it, as a
`Button asChild` wrapping a `Link`. It is a sibling of the table, not inside it, so the existing
whole-row navigation to `/cycle/<cycleId>` — a keyboard-accessible control in its own right, with its own
accessible name — is untouched.

It renders only when `output.cycles.length > 0`, matching the "no cycles, no entry point" case.

## Decision 10 — the verb is "Print"

Nothing in this feature says "export". The action is "Print", and the page carries a sentence saying the
browser is handed the document and the app writes no file. The JSON backup, the CSV, and restore stay in
Settings, untouched, and the chart is not offered there.

## Testing shape

| Layer                       | Covers                                                                                                                           |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `engineSdk` / `marquette`   | `lookbackPeaks` pairing, window slicing, null-Peak filtering, non-calendar rules yielding `[]`                                   |
| `instructor-chart/lib`      | row presence per cycle, absent-day cells, band coverage, open-cycle labelling, evidence lines including uncharted, count capping |
| `instructor-chart/document` | day numbers across the top, the band row, no colour-only distinction, `print-sheet` class, no control inside the sheet           |
| `instructor-chart` view     | default count from settings, count param honoured, `window.print` called, nothing written                                        |
| `history`                   | entry point present, absent with no cycles, keyboard-activatable, cycle rows still navigate                                      |
| `layout`                    | the route prints without chrome                                                                                                  |

## Risks

- **Column count.** A cycle longer than the protocol's 42-day band still gets a column per day, because the
  spec says every cycle day has one. A 60-day cycle on a letter page is unreadable. Accepted: the band
  warning for out-of-band cycles already surfaces, and the grid stays honest rather than truncating.
- **A six-cycle packet is long.** Roughly six pages printed. That is the price of putting the whole
  lookback on paper, and it is what was asked for.
- **Two documents to keep.** The summary and the chart are separate. The spec states their division of
  labour, and this change does not modify the summary.
