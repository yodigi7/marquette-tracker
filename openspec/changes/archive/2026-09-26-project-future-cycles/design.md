# Design

## Context

See `proposal.md` — Why. The current state that matters for the approach:

`computeCycle` in `src/core/engine/marquette.ts` already produces the Marquette calendar rule when it is handed a cycle with no records and a cycle number past the protocol's history threshold. `computeBegin` takes `min(lookback peaks) - 6` and `computeEnd` takes `max(lookback peaks) + postPeakDays`; both branches are already written and table-tested. The capability this change needs exists and is unused for future cycles.

`predict.ts` computes the same arithmetic independently, but returns a single `{begin, end}` date pair for the next cycle, anchored on the newest cycle's `day1`, and projects `nextStart` from the **mean** of all closed lengths. Because the range is anchored on the current cycle it can only ever span that one cycle, so how much of it lands after today is a function of how late her historical Peaks were rather than a property of the design.

`cycleSpan` bounds an open cycle's day results at `today`, which is why the derived band stops there. A projected cycle needs a concrete length to be spanned, and that length does not exist yet.

`resolveCell` in `src/features/calendar/grid.ts` resolves a date through `cycleForDate` over stored `CycleEntity` rows, and the grid's `onSelectDate` returns early with a toast for any date after `today`. Future cells are therefore never selectable and never route to Status. The `menses`, `monitor`, and `intercourse` markers all read from a stored record, so none of them can currently reach a future date; `ovulation` is the sole forward-facing marker and it is the one being removed.

The shared vocabulary has no "projected day" treatment. `FERTILITY_FORECAST_VISUAL` supplies `fill` and a dashed `cellBorder`, and the archived `derive-fertile-band-from-rules` change deliberately removed the `-predicted` and `-source-` token families, so no dormant "less certain" styling remains to reuse.

## Goals / Non-Goals

**Goals**

- Reuse the engine's existing calendar rule rather than adding a second window rule. The single exception is bounding a projected window that would otherwise have no end; the rule itself is never restated.
- One length estimator, shared by the History forecast and the Calendar chain, so the two surfaces cannot disagree.
- Keep the engine pure and table-testable; the estimator and the chain belong in `src/core/engine` with no React, Dexie, or browser imports.
- Keep projections entirely derived. No new persisted record, no new table, no backup shape change.
- Reuse the existing forecast cue for projected days so the visual language gains no new certainty token.

**Non-Goals**

- A precision model for cycle length. The projection is a median, not a fitted distribution, and no confidence interval is computed or displayed.
- Any display of prediction accuracy, missed predictions, or how the estimate compares to what happened. The user has stated this feedback is not needed, and it would require persisting past projections.
- A horizon. The user has chosen no fade and no cap; the chain runs as far as the user pages.
- Any single-day ovulation estimate on any surface.
- Touching the fertile-window begin/end rules, the monitor-only Peak evidence boundary, or cycle placement. The projection reads those rules; it does not modify them.

## Decisions

### The projection reuses `computeCycle` with a synthetic cycle

A projected cycle is handed to `computeCycle` as a `CycleInput` carrying only an id and a synthetic `day1`, with an empty record array, a `length` equal to the projected length, a cycle number past the history threshold, and the real `CycleHistory`. It returns a full `CycleResult` whose `fertileWindow` is the calendar rule and whose `days` are per-day statuses.

**Alternative considered — compute the projected window directly in `predict.ts`.** Rejected: it is a second implementation of a rule the engine already encodes, and it is what `predict.ts` does today, which is precisely why the History forecast and the calendar can drift apart. Reusing `computeCycle` makes the projected window the same object the derived window is.

**Alternative considered — synthesize `CycleEntity` rows for projected cycles and let `cycleForDate` find them.** Rejected: it puts non-existent cycles into the type that means "a cycle the user's data establishes," and it is the shape the archived change just removed. It also risks a projected row reaching Dexie through any path that iterates the cycle collection.

### An unbounded projected window is bounded

`computeCycle` reports `end: null` when the lookback window holds no Peak, because the calendar rule has no edges to work from. For a recorded cycle that is correct and load-bearing: the protocol genuinely leaves the window open until a Peak closes it. For a projected cycle it is not, because a band with no end would paint every remaining day of that cycle fertile indefinitely — a wide, confident, wrong band on exactly the dates the user is least able to check.

A projected cycle therefore substitutes the protocol's standard first-cycle band, matching the no-peaks fallback the next-window forecast already uses, and recomputes its days with the engine's own exported `statusForCycleDay`. The rule itself is untouched: a recorded cycle with no Peak history still reports an undetermined end, and this substitution is scoped to the projection.

This is the one place the projection does not simply hand back what `computeCycle` produced, so it is worth naming rather than leaving in the code. It adds one member to the `EndRule` union, which forces an entry in the Status view's exhaustive `END_RULE_LABELS` map. That label is unreachable today — Status resolves cycles through `cycleForDate` over stored rows, and a projected cycle is never in that list — so it is a type-level consequence waiting on a future change rather than a Status behavior change now.

**Alternative considered — leave the projected window open.** Rejected: it is the "wide band reads as safe, so nobody checks it" failure, and it contradicts the requirement that a projected window always have a determinate end.

**Alternative considered — suppress projection entirely when there is no Peak history.** Rejected: the user still has closed cycles, so a length estimate is available, and dropping the whole chain over a missing Peak would be a larger loss than substituting a conservative band.

### Projected cycles are a separate derived collection, derived per visible range

Projected cycles are never added to the cycle collection that placement, history, or stats iterate — that collection means "a cycle the user's data establishes." They are a separate derived list that the Calendar resolves per date, consulting the real collection first via `cycleForDate` and falling back to a projected cycle only when no stored cycle covers the date. The two agree by construction because the projected chain starts exactly where the last real cycle ends.

A selector in `src/core/store/selectors.ts` performs that derivation: it reads the engine output and the settings, and returns the projected cycles covering a caller-supplied range, or an empty list when the setting is off. The Calendar memoizes it on the range it is displaying.

**The store does not own this derivation, which breaks the pattern elsewhere in the app.** `computeAll` runs in the store and every feature reads its result, so projection is the one thing derived outside that single pass. The reason is the horizon: "no fixed maximum number of projected cycles" is a spec requirement, and the store does not know which month the Calendar is showing. Computing in the store would force one of two things the spec forbids — a hardcoded cycle count, which silently stops the projection a year out, or mutable per-view state threaded through the store purely to carry the range. The range is a view concern, so the derivation follows it.

**Alternative considered — compute to a fixed horizon in `computeAll`.** Rejected: it would put the projection alongside every other derived output where the pattern is uniform, at the cost of the "no fixed horizon" requirement. A year is also an arbitrary place for the feature to stop, and one the user would have to file a bug about rather than a knob they could reason about.

**Alternative considered — a parameterized store selector taking the range.** Rejected: it keeps derivation in the store, but a selector that returns a freshly built array for a caller-supplied argument needs shallow comparison at every call site to avoid re-render churn. Since the Calendar already derives locally (its summary, cell resolution, and month math are all computed in the component), a memoized selector is the smaller change.

### The chain is computed to a requested range, not materialized without limit

`projectCycles` takes an `untilDate` and returns the consecutive projected cycles needed to cover it. The Calendar asks for the visible month grid's range. Nothing is computed for a month the user is not looking at, and nothing caps how far the user may page, so "no fixed horizon" is a property of the interface rather than a limit on the chain. This is the decision the previous section depends on.

**Alternative considered — eagerly compute a large fixed batch of cycles.** Rejected: it makes work proportional to a guessed constant, and it introduces a number someone will eventually tune as if it were a horizon. Asking for the range on screen keeps the work bounded without a magic constant.

### The length estimator is the survival-conditioned median, in one place

Given the open cycle has reached cycle day `d`, the estimator considers only closed cycle lengths of at least `d`, because a cycle that already ended could not still be running. It takes the median of that eligible set. If fewer than two cycles are eligible it falls back to the unconditioned median over the same lookback window.

The conditioning is a correctness requirement, not a refinement. With lengths `26, 28, 29, 29, 30, 45` and an open cycle at day 30, the unconditioned median of 29 projects a cycle end that has already passed. The app would display a period start in the past. The conditioned set is `30, 45`, whose median lands ahead.

**Alternative considered — always use the unconditioned median.** Rejected for the reason above; it is a real defect, not a missed refinement.

**Alternative considered — condition but require no minimum sample size.** Rejected: at day 36 the eligible set is a single length, and a median of one value produces a point that is as confident as a median of six. The two-sample floor is what keeps a thin sample from masquerading as a confident answer.

**Alternative considered — report a range alongside the point.** Rejected by the user's decision to display a point. Worth recording what that costs: the spread of remaining days does not narrow as `d` advances, because subtracting `d` from every value preserves spread. The estimator's real gain is the rising lower bound and the fact that the date stays in the future, neither of which needs a range to be communicated.

### One estimator, two call sites

`computePredictions` currently projects `expectedPeriodStart` from the **mean**. If the chain uses the median and History keeps the mean, the two surfaces print different dates for the same event, and the History panel shows both an average and a median with nothing connecting either to the projected date — the exact reconciliation burden the estimator-disclosure requirement exists to remove.

Both call sites therefore use the same conditioned median. The newest cycle is always open by the placement rule, so `computePredictions` is predicting the end of that open cycle, which is the chain's first link, and the two agree by construction once the estimator matches.

**Alternative considered — have History read the projection directly.** Rejected: History must keep showing a next-period estimate when the projection setting is off, because the setting governs the Calendar projection only. Sharing the estimator is what keeps the surfaces consistent; sharing the output would have coupled the setting to History.

### The forecast cue is reused; no "projected" token is added

A projected day keeps its **phase fill** and gains the **dashed forecast border**. The two carry different questions: the fill answers "what is this day?" and the border answers "has this day happened yet?". `FERTILITY_FORECAST_VISUAL.fill` remains only the fallback for a future day that has no status yet, which is the case the next-window overlay paints.

`DayCell` previously let `forecast` replace the fill outright, which worked only because a future date never had a status to lose. Projected days do have one — their window — so overriding it would have made every projected day in a cycle look alike and erased the fertile band the projection exists to draw. The phase therefore takes precedence over the forecast fill.

The only new visual is the projected day 1's menses stripe, which reuses `FERTILITY_MARKER_VISUALS.menses.stripe` and is distinguished from a recorded stripe by its cell's dashed treatment.

This follows from the user's decision that nothing fades. If projected days were visually graded by distance, they would need their own scale; at a single uniform strength, "projected" is the same distinction "forecast" already draws, and reusing it keeps the vocabulary from growing a second certainty treatment.

**Consequence worth stating plainly.** Because the treatment is uniform, paging far enough forward makes every visible cell projected. The solid-versus-projected contrast then stops functioning as a contrast, because there is no solid left to contrast with. The month title and the day number already communicate distance, so the information is not lost — it is simply carried by position rather than by styling. If that trade is later judged wrong, the fix is a hard horizon, not a fade: stop projecting after N cycles so blank means "beyond the projection."

### No point ovulation estimate, anywhere

`peakDayMean` loses its last consumer and is removed from the `Forecast` type along with the Calendar dot, the `?? 14` no-data fallback, and History's average-Peak-day statistic. The min/max range remains in both the band and History.

The protocol's calendar rule takes only the earliest and latest Peak; it never computes a central Peak. Of the values available, the minimum and maximum are both days that actually occurred, while the mean of a set like `12, 13, 16, 17` is a day that never did. On top of that, a dot inside a 16-day band conveys nothing the band edges do not.

**Alternative considered — keep the dot but show it only when the Peak range is tight.** Rejected by the user's decision to delete it. It was a defensible option and is recorded here because it is the one a reader is most likely to propose again.

### Status and the Cycle chart are excluded deliberately

A projected cell is not clickable: `onSelectDate` returns early for any date after `today` with a toast, so a projected day never routes to Status. A future date selected directly in Status still resolves to no stored cycle and shows the existing no-cycle state, which remains true. The Cycle chart plots monitor readings; a projected cycle holds no readings, so charting one would render an empty strip.

Both exclusions are consequences of existing behavior rather than omissions to be closed later.

## Risks / Trade-offs

**Nothing fades, so the projected treatment becomes the app's appearance at distance.** → Accepted per decision. The date is printed on every cell and the month in the title, so distance is legible without a gradient. A hard horizon is the cheap reversal if it is later judged wrong.

**Conditioning on survival assumes cycle lengths are independent of how long the cycle has already run.** → Reasonable for a hobby tracker and conservative in the right direction: conditioning only ever raises the estimate, so it cannot produce an earlier-than-plausible date. The real biology is more likely to include a compensatory-short-cycle effect, which would make the unconditioned estimate too *late* in some cases. That would need a fitted model, which the proposal excludes.

**Drift compounds across a long chain.** Each link adds its own error, so a projected cycle many months out can be materially wrong even though every individual link is defensible. → Mitigated by the point-only presentation, which does not claim a tight answer, and by the fact that predictions age out of view as dates pass. A user who pages back a year sees that month's actual cycle, not the original guess.

**The projection is computed on every read for the visible range.** → The chain is a handful of date additions and one median per link, so the cost is negligible at month-grid scale. It is recomputed rather than memoized because caching would reintroduce the stale-projection problem the "derived, never stored" contract avoids.

**A user with fewer than two eligible cycles sees the unconditioned median applied to a late cycle.** → This is the explicit fallback in the estimator, and it can only occur late in a cycle when the sample has genuinely thinned. It is preferable to refusing to project.

**A projected band can be wrong for a user with no Peak history at all.** With no Peak to anchor the calendar rule, the projected window is the protocol's standard first-cycle band rather than one fitted to her data, so it may sit early or late relative to when she actually ovulates. → Accepted: the band is still a conservative default rather than an unbounded one, and the user with no Peak history is also the user least able to check it, which is precisely why the bounded band matters more than an accurate one. Anyone past the protocol's six-cycle threshold has Peak history, so this narrows to early-cycle use. A user who has never recorded a Peak should be told the band is the default; the Status view's rule label carries that wording if the value ever becomes reachable there.

**The Calendar and History display dates produced by different code paths.** → Mitigated by the shared-estimator decision; a test asserts the History next-period date equals the projection's first cycle boundary so the two cannot drift apart silently.

**The baseline calendar spec still contains a stale requirement.** `Requirement: Day-entry dialog is a logging surface` promises "inferred-record provenance" and a scenario about an inferred Low record, both of which the archived `derive-fertile-band-from-rules` change removed. → Not this change's to fix, and it does not affect the deltas here, which target other requirements. Flagged for a separate cleanup.

## Migration Plan

No migration. There is no stored data change, no schema change, and no backup format change.

- The only persisted addition is one boolean setting. A user without it resolves to off, which matches the default, so no backfill is needed.
- Existing stored cycles, day records, and settings are untouched, and the engine's existing behavior for real cycles is unchanged.
- Rollback is a revert. Because nothing about the projection is stored, a reverted build leaves the user's data exactly as it was, and the next-window forecast overlay that exists today is unaffected in either direction.

## Open Questions

None. The estimator, the conditioning rule and its sample-size floor, the point-only presentation, the absence of a horizon or a fade, the removal of the point ovulation estimate, and the exclusion of Status and the Cycle chart were each decided with the user before this document was written, and each one changes the specs if it changed, so none of them is deferred.
