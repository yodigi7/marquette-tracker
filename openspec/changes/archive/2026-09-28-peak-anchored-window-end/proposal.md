# Proposal

## Why

**The fertile window can close before the Peak day that defines it, and the app then labels the most
fertile days possible as post-window.**

For cycle 7 and later the engine picks the _earlier_ of two dates: this cycle's own Peak + 3, or the most
recent historic Peak + 3. When a cycle runs late — its Peak lands after every Peak in the last six — the
historic date wins, and it lands _before_ this cycle's Peak. The Peak day and the three days after it
are then rendered "After (post-peak)".

```
  your last 6 cycles, Peak days:  12  16  13  14  16  15
                                          latest = 16
  cycle 9 (today):  ... H H H P(20)
  end = min(20 + 3, 16 + 3) = 19        <-- three days before your own Peak

  day   6 . . . . . . . . . . . . . 19  20  21  22  23
  |----------- fertile window --------|   ^   ^   ^   ^
                                         all four render "After (post-peak)"
```

A monitor Peak means the LH surge; ovulation follows 24–36 hours later. So this fails in the worst
possible direction — telling the user they are past the window immediately before ovulation. It also
contradicts the app's own spec, which states the window for a Peak on day P is P through P+3, and it
misfires the "reading outside the window" banner onto perfectly normal Highs on a late cycle.

**It survived because a passing test pinned it.** Nothing asserted the window end is ever at or after
the Peak day, so the earlier-of-two rule looked like a normal edge case to the table that covered it.

## What Changes

All six decisions in the audit are settled and are implemented as written.

- **The window end is the cycle's own Peak + 3, in every cycle.** The earlier-of-two rule is deleted. A
  cycle with no monitor Peak has **no end at all**, in every cycle number — the protocol defines the end
  only through a Peak, so a cycle without one is unresolved rather than resolved by borrowing a date.
  Cycles 1–6 already behaved this way; cycle 7+ no longer invents an end.
- **The begin rule is unchanged.** Day 6 for the first six cycles, then earliest Peak − 6 or the first
  High, whichever comes first. Validated against the Institute's own wording and left alone.
- **The begin _label_ is corrected** for the case where there is no Peak history at all: it currently
  claims "earliest Peak − 6 days" when there is no earliest Peak. The day is right; the label names a
  rule that was not applied.
- **A new signal reports 9 or more consecutive High readings.** The monitor's guidance is to stop
  testing at that point, so the app can finally answer "am I still waiting for a Peak?".
- **The projected window is recomposed from protocol constants**: day 6 through day 15, being the
  earliest possible Peak day minus 6 through that day plus the post-Peak interval. Every digit traces to
  a published rule instead of a number that drifted in from the cycle-length band. Its label is updated
  to describe what it is rather than a "band".
- **Projection computes its own window from the user's actual Peak history** and uses the day 6–15
  window only when there is nothing to work from. Without this, deleting the historical end rule would
  silently flatten every projected cycle to day 6–15 even for a user with six cycles of Peak data — and
  would contradict the projection spec as written.
- **The invariant is written down**: the window end is never earlier than the Peak day. One
  requirement, one test, and the class of bug cannot return.
- **The dead warning becomes live.** The engine already computed a "no end yet" signal that only the
  printable cycle summary displayed. It now also appears in the Status view, because after this change
  it is the _ordinary_ outcome for a cycle without a Peak rather than an edge case.

### Not in this change

- Any change to the begin rule, the post-Peak interval of 3, or the treatment of a Peak as final.
- Any treatment of mucus as evidence, or of a Low run in the end rule — the protocol's end rule never
  depends on one.
- Introducing a `postPeakDays` setting, which the project retired and this change does not revive.
- Any change to what the cycle chart, Calendar, comparison view, or backup format do with the window
  beyond consuming the new values.

## Capabilities

### New Capabilities

None. Every value here is a rule the engine already computed, changed.

### Modified Capabilities

- `marquette-engine`: the post-Peak interval requirement loses the historical end rule it describes; the
  calendar-range requirement no longer claims the end is derived from the range; and three requirements
  are added — the end is never earlier than the Peak, a cycle without a Peak has no end in any cycle,
  and a run of nine or more High readings is reported.
- `cycle-projection`: a projected cycle's window is the calendar rule over the user's own Peak history,
  with the recomposed day 6–15 window as a fallback only when that history is empty.
- `status`: the "no end yet" signal is reported on the Status view rather than only on the printable
  summary, because it is now the ordinary outcome for a cycle without a Peak.
- `instructor-summary`: one scenario asserted that a window can end on an earlier cycle's Peaks, which
  the new end rule makes impossible, and the long-run-of-Highs note is added to the document's warnings.

## Impact

**Engine** (`src/core/engine/`) — `computeEnd` collapses to "own Peak + 3, or no end"; `cycleNo`,
`history`, and `settings` stop mattering for the end. `EndRule` loses `"earliest-end"` and
`"historic-peak-plus-n"`; `BeginRule` gains one value for the no-Peak-history fallback. A new
`EngineWarning` kind reports a long run of Highs. `projection.ts` composes the fallback window from
constants and derives a projected cycle's window from history. Still pure TypeScript with no framework
imports, so the deferred Python port stays possible.

**Pure refactor of the end computation, no new inputs** — `computeEnd` takes strictly fewer arguments.
`predict.ts` needs no change: its calendar rule already used latest Peak + 3, so it becomes consistent
with the engine instead of contradicting it.

**UI** — `END_RULE_LABELS` and `BEGIN_RULE_LABELS` in `src/features/status/lib.ts` gain and lose
entries; the cycle summary's basis tables follow them; Status gains a warning line. No new colour,
token, view, or component.

**Specs** — deltas for four capabilities. Two scenarios elsewhere assert behaviour this change removes
and are corrected rather than left to fail.

**Docs** — `AGENTS.md`'s end-rule table and its line about falling back to the calendar rule for a
Peak-less cycle are superseded and are updated.

**Dependencies** — none added.
