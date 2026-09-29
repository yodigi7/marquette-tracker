# Proposal

## Why

The instructor chart does not fit on the paper it is printed on. A 28-day cycle is roughly 2.3x too wide
for a printable page, so printing puts days 1-11 on the sheet and drops the rest: the fertile-window band is
cut in half and the window-begin evidence the chart exists to carry never reaches the instructor. The
report was that printing "cuts off at day 12".

The chart also reads poorly on its own terms. Every observation cell is a word, and the monitor row
repeats "No reading logged" up to twenty times in a row — the row where a reader most needs to find a
pattern is the row that reads as a wall of prose. Neither the width nor the density is a matter of taste;
both are the direct consequence of putting unbounded text in a per-day cell of a 21-to-42-column grid.

## What Changes

- Every observation cell becomes a single character, and the chart gains a printed legend defining the
  vocabulary. Monitor readings read `L` / `H` / `P`, intercourse `X`, menses `1` / `2` / `3` for flow,
  pregnancy test `+` / `-`.
- A day the monitor was not used, and a day holding no record at all, both read `-` in the monitor row.
  The chart stops drawing one of them as the sentence "No reading logged".
- The date row reads `9/28` rather than `2026-09-28`. The year remains in each cycle's `Day 1` header.
- Symptoms and notes leave the grid and appear once, in the prose list beneath it. They are the only
  rows whose width was unbounded, and notes are already printed there today.
- The grid's columns are made equal and the table is pinned to the printable width, so no row can widen
  the chart again and a cell that is too narrow degrades to an ellipsis instead of overlapping its
  neighbour or running off the page.
- The chart prints on a landscape page; the single-cycle summary keeps printing on the page it uses today.
- The per-cycle evidence line drops its repeated parenthetical, annotating the line rather than every
  entry when the whole run is charted or wholly uncharted.
- **BREAKING** (spec wording): the instructor chart no longer names each day's monitor reading in spelled-out
  words, and a day holding no record now shows a value in the monitor row. Both intents the current
  wording protects — black-and-white legibility, and never letting "no reading" pass for "a gap" — are
  preserved by the glyph plus legend, but the wording changes.

## Capabilities

### New Capabilities

None. The chart is one document, and the behaviour it must guarantee changes rather than widens.

### Modified Capabilities

- `instructor-chart`: the grid's cell vocabulary, the date format, which observations are grid rows, the
  never-overflow guarantee, the page it prints on, and the wording of the two requirements that currently
  pin the old behaviour.

## Impact

- `src/features/instructor-chart/lib.ts` — the chart model. Glyph vocabulary, short-date formatting, the
  collapsed monitor-absence mark, removal of the symptoms and notes rows, the compressed evidence line,
  and a legend derived from the rows actually built. Two exported constants (`NO_READING_LOGGED`, and the
  unreachable `MONITOR_LABELS.none`) are deleted.
- `src/features/instructor-chart/document.tsx` — the printable sheet. The legend, fixed table layout with
  per-cell overflow, a narrower label column, shortened row labels, and the prose list that absorbs
  symptoms and notes.
- `src/features/instructor-chart/index.tsx` — the on-screen toolbar, which stops telling the user to pick
  landscape themselves.
- `src/index.css` — a named landscape page for the chart sheet, leaving the rest of the app's printing as
  it is.
- No change to `core/engine`, to stored data, to the JSON backup format, or to the CSV export. Nothing is
  written when the chart is opened or printed.
- No new dependency.
