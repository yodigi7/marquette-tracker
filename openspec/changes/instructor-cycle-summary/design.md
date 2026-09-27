# Design

## Context

See `proposal.md` for motivation and `specs/` for the requirements. What shapes the approach, all verified
against the code as it stands:

**Every number the document needs already exists as derived output.** `CycleResult`
(`src/core/engine/types.ts:73`) carries `cycleNo`, `day1`, `length`, `peakDay`, `peakSource`,
`fertileWindow{begin, end, beginRule, endRule}`, `days[]`, and `warnings[]`. `length === null` is the
only open/closed signal, and `days[].day` runs 1..N across the whole cycle whether or not a record exists
on a day. So the cycle-day range, the day count, and the window all come straight off the result. The
engine is not edited and nothing is recomputed.

**`EngineOutput.warnings` is a superset of `CycleResult.warnings` and has no consumer today.**
`engineSdk.ts:74` concatenates every result's warnings and then appends a `cycle-out-of-band` entry per
out-of-band cycle — but only once at least two cycles are out of band, because the protocol says consult a
teacher. Every surface reads `CycleResult.warnings` instead, so `cycle-out-of-band` is currently
unreachable from any view. The summary needs it, which makes this the field's first consumer. It is
existing engine output; nothing is added to the engine.

**The rule vocabulary is already written and already pinned.** `src/features/status/lib.ts:24-36` holds
`BEGIN_RULE_LABELS` and `END_RULE_LABELS` as `Record`s keyed on the engine's own unions, with a
`endRuleLabel` helper so the rule text always carries the literal `3` and never an `N` placeholder. Its
tests forbid error/invalid/malfunction and disclaimer wording in anything Status produces. Reusing those
tables means the document cannot say something the app does not also say.

**`WARNING_LABELS` covers only two of the four warning kinds.** It is typed
`Record<Extract<EngineWarning["kind"], "monitor-evidence-outside-window" | "open-cycle-past-window-end">>`
on purpose — Status is date-selectable and reconciles one contradiction at a time. `no-peak-end` and
`cycle-out-of-band` have no label and `warningBanner` returns `null` for both, each pinned by a test.

**The confirmed/predicted axis is gone from the model but still in the chart's legend.**
`src/features/cycle-chart/index.tsx:159-170` renders `"Predicted window"` and `"Confirmed window"` legend
keys, while `strip-chart.tsx:181-192` draws exactly one `ReferenceArea`. `openspec/specs/cycle-chart/spec.md`
already says the chart "SHALL NOT distinguish a confirmed window from a predicted window by outline style
or **any other source cue**". The legend is that cue, and it advertises a treatment the chart never
draws. Existing tests only assert those two labels are absent when the algorithm is off, so nothing blocks
removing them.

**There is no print styling anywhere in the repo.** No `@media print`, and `src/index.css` is the only
stylesheet. The dark theme is a `.dark` class on `<html>` driven by `next-themes`
(`src/app/providers.tsx:41`), so dark tokens are inherited from the root and can be overridden nearer the
document. shadcn's `Table` wraps its `<table>` in a `relative w-full overflow-x-auto` div, which clips
wide content in print.

**A note on scope, from reading the data model:** `AGENTS.md` lists `medications` on `DayRecordEntity` and
it does not exist in `entities.ts:21-35`. Nothing to do here, but the document is built from the stored
fields, so the field list is the code's, not the doc's.

## Goals / Non-Goals

**Goals:**

- A single-cycle document that a person can read without knowing the app, produced by printing.
- Make the window's _basis_ legible — the calendar rule versus a recorded reading — using the app's own
  rule text wherever the app has it.
- Keep every derived value on the document traceable to a value the app already computes.
- Make the document honest about what it is: a snapshot, of a cycle that may not be finished, with
  predictions deliberately absent and said to be absent.

**Non-Goals:**

- Any engine change, new derivation, or recomputation. `src/core/engine/` and `src/core/store/` are not
  edited.
- A PDF/PNG/CSV writer, or any file the app generates. See Decision 1.
- Changing the cycle chart's data, the comparison view, the Calendar, History, or the backup format.
- A second way in. One entry point, from the per-cycle view. See Decision 8.
- Any new colour, visual token, or status. The document uses existing theme tokens and words.

## Decisions

### 1. Browser print, not a rendered document or a file the app writes

**Settled by the owner, not assumed.** Asked directly, the answer was that exporting to PDF or printing
straight up are both fine. Browser print is what is built here, because it is the option the issue itself
recommended and the smaller of the two: a `@media print` block plus `window.print()`, with nothing
generated, nothing downloaded, nothing leaving the device, and no dependency. The user prints or saves
from their own browser, so the app still produces no export file — if the browser offers "save as PDF",
that is the browser's doing, on the user's terms.

This reinterprets a settled decision, so it is worth being explicit about what changed. `AGENTS.md` says
"**Fully digital** — no printed chart/export features." Read literally that forbids a print stylesheet
too. The distinction drawn here is _sharing_, not _printing_: a JSON backup is a private machine artifact,
and an instructor summary is a communication document whose whole purpose is to be looked at by a second
person. The owner has now confirmed that reading. A true PDF or PNG writer inside the app stays out of
scope — if it is wanted later it is a separate decision and a separate dependency, and nothing here would
need undoing to add one.

**Alternative considered: a rendered document the user saves.** Rejected. It is the export the project
originally ruled out, it needs either a dependency or hand-rolled serialisation, and it loses the
theme-aware tokens the document relies on for legibility. **Alternative considered: closing the issue as
out of scope.** The owner wrote the acceptance criteria and recommended browser print, so building what
was recommended — and flagging the boundary rather than assuming it — is more useful than not building it.

### 2. A dedicated route, not a print stylesheet over an existing view

```
   History ──click row──> /cycle/:cycleId  (chart)  ──"Instructor summary"──> /summary/:cycleId
                                                                                    │
                                                                     Print / Save as PDF
```

A document is a different artifact from the chart, and only a route of its own can print without the
chart's selector, overlay toggles, and compare link. A print stylesheet over `/cycle/:cycleId` would have
to hide more than it shows, and the document's content is not the chart's content.

**Alternative considered: a dialog or sheet over the chart.** Rejected — a modal is chrome, and chrome is
exactly what Decision 1 says must not reach the paper.

### 3. The monitor reading strip is a table, not a chart

`openspec/specs/cycle-chart/spec.md` requires the summary to stay legible in black and white. A CBPM band
chart carries its reading in hue and height; strip that and the days are indistinguishable. One row per
cycle day with the reading _named_ — "Low", "High", "Peak", "No reading logged" — survives a photocopier,
a monochrome printer, and colour-blindness, and it costs nothing in Recharts.

It also collapses two requirements into one artifact: the same table is the reading strip when
interpretation is on and the raw log when it is off, so there is one table to get right rather than two.

**Alternative considered: reuse `StripChart` for the on-screen document and print it.** Rejected for the
B&W criterion above, and it would pull Recharts' `ResponsiveContainer` into a document that must be
deterministic on paper.

### 4. Warnings come from `EngineOutput.warnings` filtered by cycle number

`result.warnings` carries three of the four kinds. `cycle-out-of-band` is added by
`engineSdk.collectWarnings` into the flattened list only, and it is only added at all when at least two
cycles fall outside the band. The document needs it, so the summary reads
`output.warnings.filter((w) => w.cycleNo === result.cycleNo)` and does **not** also read
`result.warnings` — the flattened list already contains them, so concatenating both would print each
warning twice.

Reading the flattened list means the document shows the warnings the app has actually raised and
reinterprets none of them. It also means a single out-of-band cycle prints no length warning, because the
app raised none: the two-cycle threshold is the protocol's "consult a teacher" rule, and the document
reproduces the app's flags rather than applying a threshold of its own.

**Alternative considered: filtering `result.warnings` and dropping the length warning.** Rejected — the
issue asks for out-of-band length on the document, and this is the only place it exists.

### 5. New copy for two warning kinds lives in the summary, not in Status's vocabulary

`WARNING_LABELS` is deliberately narrowed to the two kinds Status reconciles, and `status/lib.ts` tests
pin that `warningBanner` returns `null` for the other two. Widening that type would loosen a shipped
module's contract for a document with a different audience that lists every warning rather than the one
most relevant to a selected date.

So the summary's own `lib.ts` reuses `WARNING_LABELS` for the two kinds it covers — no second wording for
those — and owns the `no-peak-end` and `cycle-out-of-band` sentences. The out-of-band sentence reuses
History's framing (`history/index.tsx:118-123`), including pointing at a Marquette-certified instructor,
because that is the app's existing user-facing treatment of that warning and a document addressed to an
instructor should not invent a softer variant of it.

**Where the reused labels are imported from.** From `@/features/status/lib`, which makes this the first
feature-to-feature import in the repo. The alternative home for genuinely shared vocabulary is
`src/lib/` — `fertility-visuals.ts` is exactly that for the visual language — so the rule and warning
labels arguably belong there. Moving them would touch `status/lib.ts` and every test that imports it, in a
change whose subject is a document; that is a refactor wearing a feature change's clothes, and it widens
the blast radius onto a module the Status view depends on. `status/lib.ts` is already a pure leaf — engine
types, the visual table, and date helpers, no store and no router — so the coupling is to a leaf and
cannot cycle. Import it, and leave the move for a change that is actually about the vocabulary.

### 6. The chart's two stale legend keys are removed

The requirement already forbids a confirmed/predicted source cue, and the document is required not to
reproduce one. Shipping a document that says "never print these two labels" while the app's own chart
legend prints them is a trap for whoever touches it next. Two `LegendItem`s go; nothing else in the chart
changes. Recorded as load-bearing because two things disappear from the screen.

**Alternative considered: leaving them, since the issue lists the cycle chart view as a non-goal.**
Rejected: the non-goal is about the chart's _data_, and leaving a spec violation in place next to a
document that is forbidden to repeat it is worse than the two-line fix.

### 7. The basis of each window end is two new sentences on top of the existing rule labels

`BEGIN_RULE_LABELS`/`END_RULE_LABELS` already say the rule precisely ("current monitor Peak + 3 days").
What they do not say is the thing the issue asks for — whether the end came from the calendar or from a
recorded reading. So the document prints both: a plain-language basis sentence, and the rule label under
it. The mapping is a `Record` over the engine's unions, not a `switch` with fallthrough, so a new rule
value fails the type check instead of silently rendering nothing.

```
  begin  calendar-day-6 | calendar-earliest-peak-minus-6  ->  "Set by the calendar rule, not by a reading."
         first-high-or-peak                              ->  "Set by your own reading: the first High or Peak."

  end    current-peak-plus-n | earliest-end  (peakDay)    ->  "Set by a recorded Peak: three full days after
                                                              your monitor Peak on cycle day N."
         historic-peak-plus-n                 (no peak)   ->  "Set by Peaks you recorded in earlier cycles;
                                                              this cycle has no Peak reading of its own."
         none                                           ->  "No end can be set: the protocol ends the window
                                                              three full days after a Peak reading."
```

`protocol-default-band` is the fifth `EndRule`, produced only by `projection.boundWindow`. The document
never sees it, because Decision 9 excludes projection. It still needs a mapping for the `Record` to type,
and it gets one that is honest if it ever appears.

### 8. One entry point, on the per-cycle view

The link goes on the Cycle chart, beside "Compare cycles". History rows already navigate to
`/cycle/:cycleId`, so the chart is on the path from History to any cycle; a second link per History row
would double the table's link count for a document most users produce occasionally.

**Alternative considered: also link from History rows.** Rejected as clutter. Recorded so it is a
deliberate omission, not an oversight.

### 9. The forecast and projected cycles are excluded, and their absence is disclosed

`Forecast` and `projectCycles` output are both future-tense. The document shows neither, and says so in
one line — "Predictions and future cycles are not included in this document." That line is doing real
work: without it, an instructor looking for the app's own forecast finds nothing and cannot tell whether
the app withheld it or lacks it.

Projected cycles cannot reach the document even by accident, because the summary reads `output.cycles`
and projection is produced separately by `selectors.projectedCyclesThrough`, which the summary never
calls. Rather than add a guard against a value that cannot arrive, the invariant is pinned
behaviourally: turning `projectFutureCycles` on renders byte-identical output.

### 10. Print theming re-declares the theme tokens on the document, not per element

`.dark` sits on `<html>`, so its custom properties are inherited by everything below. A `print-sheet`
class that re-declares `--background`, `--foreground`, `--muted-foreground`, `--border`, and the card
tokens inside a `@media print` block makes every descendant resolve to black-on-white automatically:

```
  html.dark ──> .print-sheet  (re-declares the tokens it needs)
                   │
                   ├── text uses  --foreground      -> #000
                   ├── muted text  --muted-foreground -> #444
                   └── table rule --border          -> #999
```

The alternative — a `print:` variant on every text and border element — loses to any descendant that
carries its own colour class, which is most of them. And the shadcn table's `overflow-x-auto` wrapper is
unclipped by one rule keyed on its `data-slot`, since the class cannot be reached from JSX.

On screen the sheet uses the ordinary tokens, so it is legible in both themes without a second code path.

### 11. The generation date is today's date at render

`todayKey()` at render time, matching how `status/index.tsx` and `calendar/index.tsx` already read it.
Nothing is persisted and no timestamp is recorded, because the document is a snapshot of _now_ and the
app has no clock beyond the local date.

The engine's `output` is recomputed on every data change and at hydrate, so a stale `output` and a fresh
`todayKey()` can disagree only if the app sits untouched across local midnight — a stale open cycle would
report a day range one day short of the printed generation date. Recorded as a known limitation under
Risks rather than solved with a persisted timestamp, which would add a store field for a case worth one
row of an audit trail.

### 12. The Peak-reading count is counted from records, as Status already does

`status/index.tsx:38` counts monitor Peak records in the view rather than asking the engine, because the
engine keeps only the last one. The document needs the same count: with two Peaks, the end is measured
from the later one, and an instructor who does not learn there were two cannot tell which reading the
window came from. It is a count of logged records, not a derivation, and it is needed whether or not the
document is handed to anyone.

### 13. The document sets `document.title` while it is open

`window.print()` → "Save as PDF" names the file from the page title, so the owner gets
`Marquette cycle summary - cycle 3 - 2026-01-29.pdf` rather than the app's title. Set on mount, restored
on unmount. Small, reversible, and it is the difference between a file you can find and a file you cannot.

## Risks / Trade-offs

**[A dark-theme printout could come out white-on-white]** → Mitigated by Decision 10: the sheet
re-declares the tokens it needs inside `@media print`, so the printout does not depend on the session's
theme, and there is a test asserting the print rules target the sheet.

**The document is a snapshot that looks live until it is printed** → Mitigated by the generation date,
the word "snapshot", the no-prediction disclosure, and the in-progress labelling. Residual: nothing stops
someone reading a stale _printout_ as current. No app can; the generation date is the honest answer.

**Real pagination cannot be verified in jsdom** → jsdom has no layout, so "fits on one page" is not
testable here. The sheet is sized for it in print (`@page` margins, a compact table type size, sections
that avoid breaking) and the acceptance criterion is checked by hand in a browser pass. A 42-day cycle
with every optional column is the worst case and is the layout that was checked.

**[A single out-of-band cycle prints no length warning]** → Intended, per Decision 4: the app raised none
at one cycle. If the owner wants the document to be stricter than the app, that is a real behaviour
change and belongs in its own issue rather than being smuggled in here.

**[Wider tables could still clip on very narrow paper]** → The `overflow` rule removes the scroll
container's clipping, but a table wider than the paper will still wrap. The optional columns are
presence-gated precisely so the common case stays at three columns.

**`AGENTS.md` still says "no printed chart/export features"** → Not edited by this change. The
interpretation is recorded here and in the pull request, and reconciling the line in `AGENTS.md` and
`openspec/config.yaml` is the owner's call, not the agent's.

## Migration Plan

None. No data model change, no migration, no stored setting, no persisted artefact. Rolling back is
reverting the commit: the new route disappears and the two legend keys come back.

## Open Questions

- Whether the document should ever be reachable from History rows as a second entry point (Decision 8).
  Adding it later is one link and no spec change.

Decision 1 is no longer open — the owner confirmed the print/export reading. What remains is purely
editorial: `AGENTS.md` and `openspec/config.yaml` still say "no print/PDF export", which now describes the
app accurately (the app generates no file) but no longer describes what the app _lets the user do_.
