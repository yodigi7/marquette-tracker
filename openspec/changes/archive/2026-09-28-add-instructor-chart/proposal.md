# Proposal

## Why

Issue #26 shipped a single-cycle summary for a Marquette instructor. It states, in words, what was
recorded and what the app derived from it — and an instructor is explicit that this is the harder
artifact to receive. A certified Marquette Method instructor writes: _"I can answer your questions MUCH
faster if you send me your chart. If you give me a summary in words of your test results and subjective
descriptions of what is going on, I have to translate all of that into objective data to help you
determine when you're fertile and when you're not."_ The summary is a good document for "tell me about
this cycle" and the wrong one for "here is my method, check my work."

The chart instructors are actually trained on has a shape the app does not produce anywhere. Cycle days
run **across** as columns, each kind of observation is a **row**, and the cycles stack back to back. The
ClearBlue monitor's own manual, the instructor handouts, and the chart software shared between users all
use that layout. A reader trained on it has to re-rotate the app's vertical per-day table in their head
before they can read it.

There is a second, sharper gap. For cycle 7 and beyond, the fertile window's begin day is _the earliest
monitor Peak of the lookback window, minus six days_. The summary asserts that result and shows nothing
that supports it. An instructor who cannot check a claim on the page is worse off than one given no
claim, and the underlying rule is exactly the part a teacher would want to verify.

## What Changes

- A new **instructor chart** — a printable document in the shape instructors read. Cycle days run across
  as columns; rows carry the date, menses, monitor reading, cervical mucus, basal temperature,
  intercourse, pregnancy test, and notes; the computed fertile window is banded across the grid. Cycles
  stack back to back, up to a configurable count.
- **The cycle count is adjustable, defaulting to 6.** Six is not arbitrary: the ClearBlue monitor stores
  the current cycle plus the previous six, the protocol's calendar rule consumes the previous six, and
  the recommended follow-up cadence with an instructor is after 1, 3, and 6 cycles.
- The chart is reached from **History**, alongside the existing cycle table. It covers a run of the most
  recent cycles; the single-cycle summary at `/summary/:cycleId` is unchanged and keeps covering one
  cycle in words.
- **Printed claims stay checkable.** When the chart shows fewer cycles than the app's lookback window
  actually consumed, the chart still states the Peak day of each earlier cycle that fed the calendar
  rule, so a claim on the page is never unfalsifiable.
- The chart is **print-only**. Like the summary, it renders in the app and is handed to the browser's own
  print or save action. The app generates no file, uploads nothing, and writes nothing.
- Observation rows appear **only where the cycle has that data**, so a lightly logged run stays narrow
  while a fully logged one shows everything.
- **Nothing moves in Settings.** The existing JSON backup, CSV, and restore actions stay where they are.
  The new surface is named and labelled as printing, not exporting, so it is not confused with the file
  exports that already sit in that row.

## Capabilities

### New Capabilities

- `instructor-chart`: the printable multi-cycle chart — its landscape grid layout, the observation rows
  it carries and when each appears, the adjustable cycle count, the checkability rule for calendar-rule
  claims, its print-only handover, and its relationship to the single-cycle summary.

### Modified Capabilities

- `history`: the History view gains an entry point that prints the instructor chart over a run of the most
  recent cycles, defaulting to the protocol's six-cycle window.

## Impact

- **New code**: a print-oriented chart feature under `src/features/instructor-chart/` (route, grid
  document, and the cycle-count control), plus a small pure model builder beside the existing
  `cycle-summary` model builder so the grid can be built and tested without a DOM.
- **Existing code**: `src/features/history/index.tsx` gains the entry point. The new action must be
  operable without colliding with the existing whole-row navigation to the cycle chart, which is a
  keyboard-accessible control in its own right and must keep working unchanged.
- **Engine**: `src/core/engine` already exposes the earliest and latest Peak day inside the configured
  lookback window. It does **not** expose which cycle each contributing Peak day came from, which the
  checkability rule needs when the chart covers fewer cycles than the window consumed. That is a small
  additive field on the engine's cycle output, with table-driven tests, and the only engine change here.
- **Persisted data**: untouched. Nothing is written, migrated, or re-derived, and no computed value is
  stored.
- **No new dependency**, no network access, no new setting, and no change to the JSON backup or CSV
  formats.
- **Docs**: `README.md` gains the chart alongside the existing summary in its feature and data-portability
  notes.
- **Overlap to be aware of when archiving**: the in-flight `add-csv-export` change also carries a delta
  for `instructor-summary`. This change deliberately does not touch `instructor-summary` — the
  relationship between the two instructor documents is stated inside the new capability instead — so the
  two deltas do not collide.
