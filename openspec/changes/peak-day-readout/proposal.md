# Proposal

## Why

The app reports what today is — cycle number, cycle day, and a derived status — but never the number a
Marquette user is actually thinking in: **where am I relative to the Peak Day?**

The Peak Day is the centre of this method. The whole protocol is built around it: the window ends three
days past it, and the calendar rule for the current cycle is derived from the earliest and latest Peak
of the last six. A user tests every morning to find one specific day. Nothing in the app tells them
how far they are from it, or that they have already passed it — so they reconstruct it by hand from the
strip chart.

## What Changes

- **The Status view reports how many cycle days have passed since the Peak reading.** The count is
  measured from the same `peakDay` value the window-end rule consumes, so it cannot drift from the
  window the same card already explains. It is in cycle days, so a user who misses a day does not see
  the number jump.
- **An explicit empty state when no Peak reading is logged.** "No Peak reading logged for this cycle
  yet" — not a zero, not a guess.
- **The readout is honest about multiple Peaks.** The count names the cycle day of the Peak it measures
  from, and says how many Peak readings the cycle holds, so it never implies a cycle has only one.
- **The Status view surfaces the expected Peak-day range** derived from the configured history window,
  labelled as coming from past cycles. This is a retrospective statement about history, the same
  protocol-derived value History already reports, shown where the user is looking.
- **No forward countdown, anywhere.** A live "N days until your Peak" is the one thing this method is
  defined against, and #17 already removed the confirmed/predicted source axis from every surface. A
  date selected _before_ the Peak shows the Peak's cycle day and no number at all, rather than a
  negative count or a countdown.
- **`marquette-engine` states which Peak anchors the window end.** `computePeak` takes the latest
  monitor Peak because the loop overwrites on each match, and #11 closed without settling whether that
  is the right reading of the method. The spec now says the latest monitor Peak anchors, so the
  behaviour is documented and test-pinned rather than a side effect — while the method-sourced
  justification stays explicitly deferred (`design.md`, Decision 7).
- **The engine stops discarding a value it already computes.** `predictFertileWindow` derives the
  windowed Peak range to build the next fertile window, then throws the range away. It now returns it.
  This corrects one acceptance criterion in #29 that does not hold as written: the _existing_
  `peakDayEarliest`/`peakDayLatest` pair is taken over **all** closed cycles, so reusing it would put a
  range on screen that visibly disagrees with the "earliest Peak − 6 days" rule printed beside it
  whenever the user has more cycles than their history window. See `design.md`, Decision 2.

### Not in this change

- A predicted ovulation date, an averaged or blended Peak day (#18 ruled the average out), or a
  countdown to any future day.
- Any change to the window begin or end rules, or to which Peak anchors the end.
- A new status, colour, or visual token; a new view; a change to the day-entry dialog.
- Introducing mucus as Peak evidence. Mucus stays loggable and visible and is never engine evidence.
- Changing what History's "Peak day range" means. It stays an all-cycles statistic; the new line is
  the history-window-scoped value the calendar rule actually uses.

## Capabilities

### New Capabilities

None. This is existing derived output surfaced in the place the user is already looking.

### Modified Capabilities

- `status`: adds a requirement that Status reports the cycle days elapsed since the anchoring Peak
  reading, with an empty state, multiple-Peak honesty, a date-before-Peak state that shows no number,
  and the expected Peak-day range — and that none of it appears as a countdown or with interpretation
  disabled.
- `marquette-engine`: adds a requirement that the latest monitor Peak in a cycle is the value the
  window end is measured from, and that the engine reports the monitor Peak days its calendar rule was
  derived from, with no averaged Peak day.

## Impact

**Engine** (`src/core/engine/`) — `predictFertileWindow` in `predict.ts` already computes the earliest
and latest monitor Peak inside the configured history window; it returns them alongside the dates
instead of discarding them, and `Forecast` gains one nullable field carrying them. No rule changes, no
new inputs, still pure TypeScript with no framework imports, so the deferred Python port stays
possible. `marquette.ts` is untouched.

**Store** (`src/core/store/`) — no change. `EngineOutput.forecast` already rides to every view, and
`dayRecords` is already read by the Calendar and both chart views.

**UI** (`src/features/status/`) — `index.tsx` reads the selected cycle's `peakDay`, the forecast's
windowed Peak range, and the cycle's monitor `peak` records; `lib.ts` gains two pure copy helpers so
the wording is unit-testable; `status-card.tsx` renders two more lines in the existing body/muted text
tokens.

**Specs** — `status` and `marquette-engine` deltas. `history` is deliberately untouched: its
all-cycles Peak-day range keeps its current meaning.

**Dependencies** — none added. No new package, no new component, no palette change.
