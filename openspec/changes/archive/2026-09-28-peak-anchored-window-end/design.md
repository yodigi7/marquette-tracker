# Design

## Context

See `proposal.md` for motivation and `specs/` for the requirements. What shapes the approach, all
verified against the code as it stands:

**`computeEnd` collapses to a single expression.** `marquette.ts:78-110` takes `(cycleNo, peakDay,
history, settings)`. With the historical branch deleted, `cycleNo`, `history`, and `settings` have no
reader, so the function becomes `peakDay === null ? { end: null, rule: "none" } : { end: peakDay + 3,
rule: "current-peak-plus-n" }`. This is a strict signature narrowing: fewer inputs, no new ones. The
three-day constant stays `DEFAULT_POST_PEAK_DAYS` and is still not configurable.

**The bug is reachable and currently locked in by a passing test.**
`marquette.test.ts:172` is literally named `"cycle 9: historic latest peak 16+3=19 ends before
current 20+3=23 → earliest-end"` and asserts `end: 19`. Nothing in the suite asserts the end is on or
after the Peak day, so the case reads as ordinary coverage. That test is rewritten, and the invariant
gets its own table case so the class of bug cannot return quietly.

**The `earliest-end` end is what made the out-of-window warning misfire.** The audit's "second effect" is
not a separate bug: with `end = 16 + 3 = 19`, a High on day 20 is after the end, so
`computeCycle:204-216` reports `monitor-evidence-outside-window`. Once the end is `20 + 3 = 23`, days
16–18 sit inside the window and the warning stops firing on a merely-late cycle. Its remaining trigger is
exactly the case the audit names — a High after a _confirmed_ Peak — so the warning needs no change at
all. This is worth stating because it means the fix removes a false positive without weakening the real
one.

**The `no-peak-end` warning is no longer an edge case.** It is produced at `marquette.ts:188-189` whenever
`fertileWindow.end === null`, and today that is only cycles 1–6. After this change it is every cycle
without a Peak. Its frequency goes from rare to ordinary, which is why `status` is modified: a signal
that fires for 8–10% of cycles in one range and ~all peakless cycles in another should be visible where
the user looks, not only on the printable summary added by #26.

**Confirmed, not assumed: the `no-peak-end` signal has exactly one display surface today.** `warningBanner`
(`status/lib.ts:66-80`) iterates twice, once per reconciliation kind, and returns `null` for anything
else — pinned by `status/__tests__/lib.test.ts:139-143`. Calendar, History, and both chart views never read
`warnings` at all. The only consumer is `cycle-summary/lib.ts:265-270`, added by #26. The audit's phrase
"no screen displays" is therefore _now_ slightly stale: the printable summary does.

**Confirmed, not assumed: the projection re-derives the open cycle, and there is no merge.**
`projectCycles` (`projection.ts:84-140`) calls `computeCycle` with an **empty records array** at line 126
and a forced cycle number of `Math.max(userCycleNo, 7)` at line 127, and its first iteration uses
`day1 = newest.day1` — so `projected[0]` is a second, record-free derivation of the user's real open
cycle. The merge the issue hoped for is not in `projectCycles`: it is a date comparison in
`calendar/grid.ts:122-135`, where `resolveCell` consults the projected array only when
`dateKey > today` and otherwise falls through to the real `CycleResult`. So real days keep their real
treatment, exactly as the projection spec says — the open question in the issue is answered, and the
answer is that the guarantee holds.

**But the record-free re-derivation would still be visible on future days.** `projected[0]`'s window today
comes from `historic-peak-plus-n` over a history that includes the open cycle's real `peakDay`
(`projection.ts:99-102`) — the very leak the end-rule fix removes. After the fix, `projected[0]` has
`peakDay: null` and therefore `end: null`, so `boundWindow` (`:142-168`) would replace its whole window
with the fallback band. Concretely: a user with six cycles of Peak history whose open cycle has a Peak on
day 20 would see their _future_ days painted to a day 6–15 window while their _past_ days show the real
day 6–23 window. That is the interaction the audit predicted, and it is why projection must compute its
own window rather than inherit the engine's.

## Goals / Non-Goals

**Goals:**

- The end is the cycle's own Peak + 3, or no end. Nothing else.
- The invariant "end is never before the Peak" is asserted by a test, not just by prose.
- Every number a surface can name traces to a published rule, including the projected fallback's end.
- Close the "no screen displays the unresolved signal" gap on the surface users actually watch.

**Non-Goals:**

- The begin rule's arithmetic. Decision 3 keeps it as-is; only its _label_ changes, and only for the
  no-history case where the current label names a rule that was not applied.
- Any treatment of mucus as evidence, or of a Low run in the end rule.
- A `postPeakDays` setting. Retired, and nothing here revives it.
- Changing what the chart, Calendar, comparison view, or backup do with the window, beyond consuming the
  new rule values.
- Averaging or blending a Peak day. Ruled out by #18 and not reopened here.

## Decisions

### 1. The end rule takes only the cycle's own Peak

```
  peakDay === null  ->  { end: null, rule: "none" }
  peakDay  === P    ->  { end: P + 3, rule: "current-peak-plus-n" }
```

No `cycleNo`, no `history`, no `settings`. A cycle 7+ Peak on day 20 ends on 23 whatever the last six
Peaks were.

**Alternative considered: keep the earlier-of-two but never let it beat the current Peak.** Rejected —
it is the same rule with a guard, and a guard can be forgotten. The published rule does not consult other
cycles for the end, so neither does the code.

### 2. `EndRule` keeps two values, and both remaining ones are reachable

`EndRule` becomes `"current-peak-plus-n" | "none"`. The audit removes `earliest-end` and
`historic-peak-plus-n`, whose meaning — "a recorded cycle borrows a date" — no longer exists.

`protocol-default-band` is **renamed** to `protocol-fallback-window` and **survives**, because the
projected fallback is still a real window the app must name. The old name is wrong twice over: the window
is not a band, and "default" hid that it is composed. Its new label names its composition. This is a
narrowing of the type plus one rename, not a new concept.

**Alternative considered: keep `historic-peak-plus-n` for projection only.** Rejected. The word
"historic" is what made it read as "this cycle's window ended on another cycle's date", which is the
confusion being removed. A projection's end is not a recorded cycle's end and should not share its name.

### 3. The begin _day_ is untouched; only the no-history _label_ changes

`computeBegin` already returns day 6 when `cycleNo > 6` and the lookback holds no Peak — it just labels
it `calendar-earliest-peak-minus-6`, a rule it did not apply. That branch now reports
`calendar-day-6-fallback`. The arithmetic is identical, so no scenario about a begin _day_ changes.

**Alternative considered: reuse `calendar-day-6` for both.** Tempting — the day is the same. Rejected: for
cycles 1–6 day 6 is the rule, and for cycle 7+ with no history it is a fallback _to_ that rule. The audit's
point is that a label which does not name the applied rule costs trust in the labels that do, and merging
them re-creates exactly that.

### 4. The nine-consecutive-High signal is a warning, computed over the cycle's own days

New `EngineWarning` kind `{ kind: "high-run"; cycleNo: number; run: number }`, raised when the longest run
of consecutive `high` readings reaches 9. Computed in the engine, where the records already are, and placed
**outside** the `end === null` / `else` split at `marquette.ts:187-217` — a High run is a fact about the
readings and does not depend on whether an end was found. A `peak` ends the run, as does any day without a
`high`. The window is untouched.

**Alternative considered: a field on `CycleResult` rather than a warning.** Rejected. It is not a
contradiction and not a defect; it is an observation, and the warning channel is already the app's
"something about your data the protocol wants you to know" channel, with the surfaces already wired for it.

### 5. Where the High-run signal surfaces: Status and the summary, not a new view

`no-peak-end` gains a Status banner, because it is now the ordinary outcome for a peakless cycle. The
High-run signal is reported on the same two surfaces — Status and the printable summary — and nowhere
else. No new view, no new component, no new colour.

**Alternative considered: Calendar only, since that is where a user watches for a Peak.** Rejected: the
Calendar renders statuses, not prose, and adding a text banner to a month grid is a larger design change
than this warrants. Status is the surface that already answers "what does today mean", and this is
exactly a "what should I do now" question.

**Alternative considered: suppress the High-run signal while a Peak exists in the cycle.** Already
guaranteed structurally — a `peak` ends the run — so there is nothing to suppress.

### 6. Projection computes its own window; the composed band is only the empty-history case

`projectCycles` keeps calling `computeCycle` for structure, but `boundWindow` is replaced by a function
that derives the window from the lookback's Peaks:

```
  lookback has Peaks   ->  begin = earliest - 6,  end = latest + 3
  lookback empty       ->  begin = 6,  end = DEFAULT_EARLIEST_PEAK + 3   (i.e. 6 .. 15)
```

`PROTOCOL_DEFAULT_WINDOW_END` stops being a hand-written `21` and becomes
`DEFAULT_EARLIEST_PEAK + DEFAULT_POST_PEAK_DAYS`, so the number cannot drift again: change the earliest
possible Peak day or the post-Peak interval and the fallback follows. `predict.ts:105` consumes the same
constant, so the forecast and the projection cannot disagree.

**Alternative considered: leave `boundWindow` as a fallback-only path and let `computeCycle` produce the
history-derived window.** That would work for the _end_ only if the historical end rule still existed —
which is the thing being deleted. Computing it in the projection is what keeps the `cycle-projection`
guarantee alive after the engine stops providing it.

### 7. The open cycle's re-derivation is left alone, and here is why that is safe

`projected[0]` re-derives the open cycle from no readings, and its window will now be the calendar rule
over a history that includes the open cycle's own `peakDay`. So its _begin_ is the calendar begin and its
_end_ is the real Peak + 3 — which is the real end, because the open cycle's own Peak is the last element
of the lookback. Where it can still differ from the real cycle is the begin, if the open cycle has a High
reading before the calendar begin. That difference is confined to future days, and a projected future
window differing from the recorded one is the honest state of affairs: it is a projection. The
`cycle-projection` spec already requires real days to keep their real treatment, and `grid.ts` enforces
it by date.

**Alternative considered: give `projectCycles` the real records for `projected[0]`.** Rejected. It would
make a projection a second copy of a real cycle, which is what the synthetic `projected-` id and the
`projectFutureCycles` gate exist to prevent.

### 8. Two legacy scenario headings are kept, because a delta cannot rename one

`#### Scenario: The historical end rule uses the same interval` and
`#### Scenario: A window ending from earlier cycles' Peaks says so` name behaviour this change deletes.
OpenSpec treats a scenario as part of its requirement block, and a `MODIFIED` requirement replaces the
whole block — so a renamed scenario reads as a dropped one and archive refuses. Both headings are kept
with bodies stating the corrected behaviour. This is a known wart in the archived spec text, it is
recorded rather than hidden, and renaming a scenario heading needs an `openspec` capability that does not
exist yet.

## Risks / Trade-offs

**[A peakless cycle 7+ now shades Fertile to the end of the cycle where it previously had an end]** →
This is the audit's decision and it is correct: there is no protocol-defined end, so inventing one is
worse than none. The mitigation is the `no-peak-end` warning now reaching Status, so the absence is
explained rather than silent. Residual: a user who never logs a Peak and rarely opens Status sees an
all-fertile month with no explanation. That is a real cost, accepted, and it is the honest reading of the
protocol.

**[The projected fallback's end moves from 21 to 15, so projected windows on the Calendar get shorter]** →
Direct consequence of composing it from protocol constants; 21 was ~2.5x a real window. Projected cells
will visibly shrink for users with no Peak history. Acceptable, and correct.

**[Renaming `EndRule` values touches the two exhaustive label maps and the summary's basis tables]** → They
are `Record`s keyed on the union, so TypeScript fails the build rather than rendering a blank. The
exhaustiveness is the safety net; the cost is four files to touch.

**[A High-run warning appears in Status and could read as advice]** → The copy states the monitor's own
guidance and the run's length, and asserts nothing about the user's body or what they should conclude.
`status`'s existing no-disclaimer scenario is carried forward unchanged, so a regression there fails the
suite.

**[`no-peak-end` is now the common case, so Status shows it far more often]** → Intended. It is
cycle-scoped, not date-scoped, and non-dismissible like the existing warnings, so it does not flicker per
date the way a date-scoped banner would.

## Migration Plan

None. No stored data changes, no schema change, no persisted setting. Every status is derived at read
time, so the corrected window appears on the next recompute after deploy. Rolling back is reverting the
commit — no user data is affected either way.

## Open Questions

- Whether `status`'s requirement to report "the one warning that most affects the interpretation of the
  selected date" is still the right rule now that three kinds can fire. The reconciliation warnings outrank
  `no-peak-end` because they contradict a computed window; the High-run signal is orthogonal and is shown
  alongside rather than instead. That ordering is implemented, but the spec sentence is inherited from
  before there were three kinds and could be sharpened in a follow-up.
