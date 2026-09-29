# Design

## Context

See `proposal.md` for why. What shapes the approach is the shape of the grid and the shape of the paper.

The grid is a table with one column per cycle day, for cycles the protocol puts at 21 to 42 days, at
`text-[10px]` with `whitespace-nowrap`, under the default `table-layout: auto`. Under auto layout every
column sizes to the widest cell it contains, so the column width is set by content — today the full ISO
date is the widest cell in a typical cycle at roughly 55px, which is why printing a 28-day cycle shows
days 1-11 and drops the rest. Two rows are worse than that: symptoms are a comma-joined list and notes are
free text, so either can set a column to any width the user happened to type that week.

The printable width is fixed by the paper and the 12mm `@page` margin: 725px for Letter portrait, 965px
Letter landscape, 527px A4 portrait, 1032px A4 landscape. Subtracting an 80px label column, a 28-day grid
gets 23.6px per column in Letter portrait and 32.1px in Letter landscape.

Two things about the project constrain the vocabulary. The app loads Geist as unicode-range subsets whose
`latin` face covers `U+0000-00FF` and `U+2000-206F` only, so `♥` (U+2665) and the block elements
(U+2581/2584/2588) would fall back to the system face and be the only marks on the sheet set in a
different typeface. And `instructor-chart`'s model is pure and DOM-free by design, so the glyph mapping
and the short-date format belong in `lib.ts` where they are testable without a browser, not in the view.

The three measurements above are computed from font metrics, not observed in a browser — no browser was
available in the authoring environment. They are treated here as approximate, and the design is built so
that being wrong about them degrades one cell rather than the page.

## Goals / Non-Goals

**Goals:**

- No cycle day of a charted cycle is ever lost off the printed page, for any paper, any orientation, and
  any value the user recorded.
- Every day column is the same width, so a column can be scanned vertically.
- The monitor row reads as a pattern rather than as prose.
- The chart's cell vocabulary is unambiguous on paper with no colour, in the app's own typeface.
- Nothing in the model depends on the browser, so every rule above is unit-testable.

**Non-Goals:**

- No change to the engine, to stored records, to the JSON backup format, or to the CSV export.
- No change to what a cycle's window is, or to what evidence a begin claim carries. The claims on the page
  are identical; only the wording of the evidence line changes.
- Not a redesign of the single-cycle summary, which keeps its own vocabulary and its own page.
- Not a fit-to-page scaling mechanism. The document is not shrunk to fit; it is built to fit.

## Decisions

### The cell vocabulary is one character per mark, all inside the app's typeface

```
mark            meaning                          prior cell text
-----------     ------------------------------   -------------------------
L  H  P         monitor low / high / peak       "Low" / "High" / "Peak"
-               monitor not used, or no record   "No reading logged"
1  2  3         menses flow light / med / heavy  "Light" / "Medium" / "Heavy"
X               intercourse                      "Yes" / "No"
+  -            pregnancy test pos / neg         "Positive" / "Negative"
L  H  P         cervical mucus, same as monitor  "Low" / "High" / "Peak"
-               logged, nothing recorded         "-"
(blank)          no record at all                 (blank)
```

Every glyph is ASCII or inside `U+2000-206F`, so all of them render in Geist at the sheet's own size. The
one exception is deliberate: the blank stays a blank. A day with no record at all shows nothing in the
observation rows, and only the monitor row fills that day in, because "was the monitor used" is the one
question a day with no record still answers.

**Alternatives considered.** A heart for intercourse was proposed and not adopted: `U+2665` is outside
every Geist subset, and a drawn SVG heart would put a shape among a sheet of characters at 10px. `▁ ▄ █`
for menses flow, the common cycle-app ramp, is outside the subsets for the same reason. `1 2 3` was chosen
over `· ● ●●` because a single character keeps the flow column at the same width as every other column and
needs no legend for its own sake — the legend names it once.

### The mark is the text; the meaning is a `sr-only` word beside it

Each row owns a `phrases` map from the character it prints to what the character means, and both the
cell's `spoken` value and the printed legend are read off those maps. A cell renders its character and,
where there is something to say, the value in words as screen-reader text. The table's row headers already
name the observation, so the cell only carries the value, and the two read together as "Monitor, low"
rather than as a bare "L".

One source for both is the point: a legend and a cell's accessible name that are written separately will
drift, and a key that disagrees with the grid is worse than no key. The maps also resolve the ambiguity
of a shared character — `L` is a monitor low on one row and a mucus low on another — by pairing every
entry with its row.

This is the same non-colour requirement the window band already satisfies, extended to the value cells, so
the glyph change costs nothing in accessibility relative to the words it replaces. A blank cell and a date
announce nothing: there is nothing to say about a day with no record, and a date is already readable as
itself.

### The two monitor-absence states collapse to one mark, on this chart only

A record whose monitor field is empty and a day holding no record are both "the monitor was not used that
day", so both read `-`. The difference between them is an app internal and not a printed fact. This is
scoped to the chart: the Calendar, Status, and cycle-summary surfaces key off cycle days rather than
records and are untouched.

The mark is load-bearing and stays. The engine's high-run counter iterates records and requires
consecutive cycle days, so an untested day breaks a run of High readings: nine Highs with one day missing
are two runs, and neither reaches the 9-day stop-testing warning. A reader has to be able to see the hole.

**Alternatives considered.** Keeping "No reading logged" in words, and a separate dash for a record with
an empty monitor field, both preserve a distinction nobody can act on and cost 77px and a second glyph in
the row that most needs to be scannable.

### The date row is short, and the year moves nowhere

The date is rendered as month and day — `9/28` — by splitting the stored date key on its hyphens. No `Date`
object is constructed, so the formatting cannot pick up a timezone and the model stays DOM-free. The year
is already printed for every cycle on its own `Day 1 2026-09-01` heading, and a six-cycle run only crosses
a year boundary inside a single cycle, so no cycle's dates are ambiguous.

**Alternatives considered.** Day number only, with the date row dropped entirely, fits the whole 21-42 band
on A4 and is the most robust option; it was declined because it drops a convention instructors are trained
to read and makes the date derivable only by counting from Day 1.

### The table is fixed to the page, so no row can widen it

`table-fixed` with the grid at `w-full`. Under fixed layout the column widths come from the first row and
the remainder is shared equally, so every day column is identical and the table is exactly the printable
width no matter what any cell contains. A cell that is still too narrow gets `overflow: hidden` with
`text-overflow: ellipsis`, so the failure mode is one elided cell rather than a chart that stops at day 12.

This is the decision that makes the requirement true rather than approximately true. Orientation only
decides whether the values are comfortable; fixed layout is what guarantees nothing is lost.

**Alternatives considered.** A fit-to-width scale transform, which shrinks the whole sheet to fit and
leaves it illegible on a long cycle. Shorter cell padding, which buys a couple of pixels and leaves the
content-width dependency in place. Both were rejected in favour of removing the dependency.

### The chart prints on a named landscape page, and nothing else changes its page

A 21-to-42 column grid is a landscape document: A4 portrait offers 16.5px per column at 28 days, which
does not hold a `9/28`. So the chart wants landscape — but `@page` is document-level and applies to
everything the app prints, and the single-cycle summary is a prose document that should stay portrait.

The chart sheet is therefore assigned its own named page (`@page chart { size: landscape }` plus
`page: chart` on the sheet), and the existing global `@page` keeps its margin and no size. The summary is
untouched. Where a browser ignores named pages it falls back to the summary's behaviour — portrait, with
fixed layout still guaranteeing that no day is lost.

**Alternatives considered.** Forcing landscape globally, which would reflow the summary's prose to
10-inch lines. Leaving orientation to the user and keeping the toolbar's instruction, which leaves the
chart's default state the cramped one.

### Symptoms and notes leave the grid and are reported once, beneath it

They become a per-day prose list, `Day 7: slept badly`, joining the notes list the sheet already prints.
The grid gains the property that matters most: no cell in it is unbounded, so the fixed layout is
genuinely fixed. Notes are already printed there today, so removing the grid row duplicates nothing away.

**Alternatives considered.** Truncating each to a fixed character budget in the grid. That keeps an
at-a-glance row but invents a value the user never recorded, or hides part of what they did — and the
project's existing rule is that no value shown is derived or filled forward.

### The evidence line annotates the line, not every entry

`ChartEvidence.phrase` becomes `cycle 3 day 12` and a line-level note carries the charted status. When the
whole window is on the page the line ends `(all on this chart)`; when none of it is, `(none on this
chart)`; when the run is mixed, only the uncharted entries are marked individually. The default case — six
charted cycles, the history window — stops repeating a parenthetical six times per line across six cycles.

The requirement that every contributing Peak be printed, with its cycle and day, is unchanged, and every
entry still says whether its cycle is on the page. Only the redundancy goes.

### The legend is derived from the rows the model built

`buildInstructorChartModel` returns a `legend` alongside `rows`, read off each row's own `phrases` map, so
a sparse run gets a short legend and the legend cannot drift from the grid. It is printed on the sheet,
not in the toolbar, because a key the paper does not carry is no key at all. The sheet takes the union
across the charted cycles, since the rows differ cycle to cycle.

### Row labels shorten, and the label column narrows

The label column goes from 96px to 80px and the longest labels shorten — `Fertile window` to `Fertile`,
`Cervical mucus` to `Mucus`, `Pregnancy test` to `Test` — now that a legend carries the vocabulary. At
80px every label fits without wrapping, and the 16px returned goes to the day columns.

## Assumptions

These are choices made without a decision from the issue owner. Each is recorded here because the change
has to be reviewable as a set of reversible decisions rather than discovered later in the diff.

**Load-bearing — changes what appears on the printed page:**

1. **Menses flow is `1` / `2` / `3` for light / medium / heavy.** The issue asked for "something similar"
   to the monitor letters for menses and did not specify one. Reversible by changing one map.
2. **Cervical mucus becomes `L` / `H` / `P` too.** The owner asked for L/H/P on the monitor row only.
   Leaving mucus spelled out would keep a 34px-wide cell in the grid and put two vocabularies on one
   sheet. Reversible by returning that row's text function.
3. **Symptoms and notes are removed from the grid entirely** and appear only in the prose list beneath
   it. This removes something the user can currently see at a glance, and was proposed in the issue
   without being ratified. Reversible by restoring two rows.
4. **The chart prints landscape** via a named page, and the toolbar stops telling the user to choose
   landscape. A browser without named-page support still prints every day, in portrait.
5. **Temperature stays a full decimal number, `36.8`.** It is four characters, so it ties the date row as
   the widest cell and sets the minimum column width. The alternative — rounding to one decimal place
   changes no information but does not shrink it either; dropping the row would lose the reading.
6. **The date row drops the year.** `9/28` rather than `9/28/26`. The year remains on each cycle's Day 1
   heading.
7. **The evidence line is compressed** to `cycle 3 day 12 · cycle 5 day 18 (all on this chart)`, and the
   phrases two tests assert on change wording.

**Routine — mechanical, no user-visible judgement:**

8. The absence mark is unified on ASCII `-` across the grid, replacing the em dash in rows that were not
   part of the request, so one mark means one thing.
9. The label column narrows to 80px and row labels shorten.
10. The unreachable `MONITOR_LABELS.none` and the `NO_READING_LOGGED` sentence are deleted.
11. The `9/28` format is US month-first with no leading zero, matching the app's existing US-oriented date
    conventions.

## Risks / Trade-offs

**[The width numbers are computed, not measured]** → No browser was available to measure Geist's advance
widths, so every pixel figure above carries roughly ±10%. The design does not depend on them being right:
fixed layout makes the table page-width regardless, and ellipsis confines a wrong estimate to one cell. The
cycle lengths the design comfortably covers — 21 to 35 days — leave enough margin that a 10% error does
not reach the values. It does mean "no cycle day is ever lost off the page" is verified structurally
(the grid is fixed-layout at full width) and not by counting printed pages, which a DOM test cannot do.

**[A legend entry repeats the row name for every mark]** → `L Monitor low` and `L Mucus low` rather than
one `L` entry shared between them. Accepted: it is what lets a reader tell two identical characters apart,
and the alternative is a key that is ambiguous in exactly the way the grid is not.

**[Named pages are not universally supported]** → Chrome and Edge have supported them since 2023; Firefox
has not. Where the named page is ignored, the chart prints portrait and the toolbar no longer tells the
user to switch. The no-days-lost requirement still holds through fixed layout, but a 28-day cycle in A4
portrait may show elided dates. Mitigation if it is reported: add an explicit on-screen note, or force the
orientation globally and accept the summary's line length.

**[A 42-day cycle still wants more width than Letter landscape has]** → 21.4px per column against a
`9/28` at roughly 23px. A cycle at the top of the band is already flagged by the engine as out of band, and
the result is elided dates rather than lost days. Not engineered for.

**`L` means both "monitor low" and "mucus low" on the same sheet** → Accepted: they are different rows,
the legend names each row, and the two observations are read in different rows by convention. The
alternative — distinct letters per row — would break the convention that makes L/H/P readable at all.

**Symptoms and notes are no longer aligned to their day columns** → The grid gives up a per-day
correlation for those two observations, and the reader counts days off the prose instead. Accepted, because
the alternative is an unbounded cell width that would break the requirement for every cycle that logged
either.

**Mucus and monitor both reading `L H P` means a mistyped reading is undetectable on paper** → They were
already indistinguishable as "Low" and "High" before this change. Not made worse.

## Migration Plan

No data migration. Nothing is written when the chart is opened or printed, and no stored shape, setting, or
export changes. The rollback is a revert: the two spec edits restore the old wording and the model and
sheet restore the old cells.

## Open Questions

- Whether the elided-date case in Firefox is worth an on-screen note, which can only be answered by
  printing a long cycle in each browser. It does not change the specs, the approach, or the task
  breakdown, so it is deferred.
