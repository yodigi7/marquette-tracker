# Proposal

## Why

The app can log a cycle, compute the window, and chart it, but it cannot hand any of that to a person.
The only output a user can produce is the JSON backup, which is a machine-restoration format — nobody
reads one. And the reader this method genuinely requires is a second person: the Boland Institute's own
app is built around exporting a chart to share with a Marquette-certified instructor, because accuracy in
this method is conditional on correct use as taught. A user who wants to ask a question mid-cycle has
nowhere to send the evidence.

Everything the document needs already exists as derived output. Only the rendering-for-a-human is missing.

## This reopens a settled decision, deliberately

`AGENTS.md` carries **"Fully digital — no printed chart/export features. No PDF/CSV export for now."** This
change interprets that as being about _the app producing a file_, not about _the user printing what is on
their screen_. A browser print stylesheet produces no export: nothing is generated, nothing is downloaded,
nothing leaves the device, and the app gains no PDF writer. The output is a page the user can read on
screen, print, or save from their own browser as they choose.

That is a judgment call, not a fact, so it was put to the owner rather than assumed. **The owner has
confirmed it** — asked whether printing straight up or exporting to PDF was acceptable, the answer was
both. Browser print is what ships, as the smaller of the two. A true PDF/PNG/CSV export remains out of
scope and stays a separate decision.

## What Changes

- **A single-cycle summary document** at `/summary/:cycleId`, reached from the Cycle chart. One cycle, one
  page, readable by someone who has never seen the app.
- **It states what the window is and what produced it.** Cycle number, Day 1, cycle-day range, length, the
  Peak day, the window's begin and end cycle days, and — in plain language — whether each end was set by
  the calendar rule or by a recorded reading. The rule itself is quoted from the vocabulary Status already
  uses, so the document cannot drift from the app's own explanation.
- **The monitor reading strip is a table, not a chart.** One row per cycle day with the reading named in
  words. It is legible on a black-and-white printout, which a colour-banded chart is not, and it doubles as
  the raw log when interpretation is off.
- **Logged context appears only where it exists.** Mucus, temperature, intercourse, pregnancy tests,
  symptoms, notes, and menses each gain a column only when the cycle actually holds one, so a bare cycle
  stays a three-column sheet.
- **Protocol warnings the app raised for that cycle are printed on the document**, including out-of-band
  length, which no surface currently reports per cycle.
- **Predictions and projected cycles are excluded, and the document says so.** The forecast and the
  future-cycle projection are not shown, and one line states that they are not included, so their absence
  is explained rather than ambiguous.
- **Interpretation off produces a document, not a refusal.** The raw log, cycle identity, and length
  still print; the window, the Peak day, and the protocol notes do not, with a line saying why.
- **An open cycle is labelled in progress** and its length is stated as not yet known, rather than
  presented as a settled number.
- **The Cycle chart drops two legend keys** that are leftovers from the removed confirmed/predicted axis.
  The `cycle-chart` spec already forbids distinguishing a confirmed window from a predicted one by "any
  other source cue", and the legend is exactly that — and this change would otherwise build a document
  that is explicitly forbidden from reproducing the same two labels.

## Capabilities

### New Capabilities

- `instructor-summary`: A single-cycle, human-readable summary document the user can hand to an
  instructor — what it contains, how it states the window's basis, how it handles the algorithm toggle,
  open cycles, warnings, predictions, and the snapshot label, and how it behaves when printed.

### Modified Capabilities

- `cycle-chart`: the legend no longer advertises a "Predicted window" / "Confirmed window" pair, because
  the chart renders one window treatment and the source axis has been removed from the model.
- `app-shell`: the shell's navigation and page padding are suppressed in print, so a document route can be
  printed on its own.

## Impact

**New** — `src/features/cycle-summary/` (view, document, pure model/copy helpers) and the
`/summary/:cycleId` route.

**UI** — one link on the Cycle chart view; `print:hidden` on the shell header and main padding; a
`@media print` block in `src/index.css` that re-declares the theme tokens on the document sheet so a
dark-theme session still prints black on white, and unclips the shadcn table's scroll container.

**Data** — none. Nothing is written, stored, or migrated. The document reads the same store snapshot every
other view reads.

**Engine** — untouched. No rule changes, no new inputs, no new derivation. `src/core/engine/` and
`src/core/store/` are not edited. The first consumer of `EngineOutput.warnings` is this change, which is
existing engine output, not new output.

**Backup** — untouched. `data-backup` and the JSON format are unchanged, and a scenario pins that.

**Dependencies** — none added. No new package, no new colour, no new visual token, no shadcn component
beyond the existing `Table`.

**Not a change to** the engine, the Cycle chart view's data, the comparison view, the Calendar, the
History view, or the JSON backup format.
