# Design

## Context

See `proposal.md` for motivation and `specs/` for the requirements. What shapes the approach:

**The count has an engine value to measure from, and it is the right one.** `computePeak` in
`src/core/engine/marquette.ts:35` walks the cycle's records in ascending `dayInCycle` order and
overwrites `monitorPeak` on each match, so `CycleResult.peakDay` is the _latest_ user-entered monitor
Peak. `computeEnd` at `marquette.ts:78` takes that same `peakDay` as its current-cycle input. So the
count `selectedCycleDay - result.peakDay` is measured from precisely the value the window end is
measured from. There is no second notion of "the Peak" to keep in sync, and no risk of the readout
disagreeing with the window explanation printed directly above it.

**Cycle days make the count immune to missed days.** Both terms are cycle-day numbers derived from the
same `day1` anchor, so the difference is the number of cycle days between them whether or not either
day holds a record. Nothing extra is needed to satisfy "unaffected by unlogged days"; it falls out of
measuring in cycle days rather than in calendar dates.

**The Status view is date-selectable, and the count has to follow the selection.** `StatusView`
(`src/features/status/index.tsx:13`) holds a `selected` date and resolves a cycle from it, defaulting
to today. A count computed from `todayKey()` regardless of the selection would contradict the cycle
day printed in the same view the moment the user paged back. So the count is relative to the selected
date, and the copy never says "today".

**The Status view does not currently read raw records.** It reads `cycles`, `output`, and settings.
Reading `dayRecords` from the store is not new to the app — `calendar/index.tsx:45`,
`cycle-chart/index.tsx:25`, and `cycle-comparison.tsx:13` all subscribe to it — and the values are
derived at read time and never stored, which is the project's rule.

**`Forecast.peakDayEarliest` / `peakDayLatest` are not the range the window is built from.** In
`predict.ts:45` `peaks` is every closed cycle's `peakDay`, and the pair is `Math.min`/`Math.max` over
all of them. The window, by contrast, comes from `predictFertileWindow`, which slices
`peaks.slice(-settings.historyWindow)` at `predict.ts:86`. With 10 closed cycles and a window of 6,
the two disagree, and they disagree in the direction that matters: the all-cycles pair is always at
least as wide, so the minimum is earlier and the maximum is later than what produced the window.

**The windowed range is already computed and thrown away.** `predictFertileWindow` derives
`beginDay = Math.min(...lastWindow) - 6` and `endDay = Math.max(...lastWindow) + DEFAULT_POST_PEAK_DAYS`
at `predict.ts:96-97`, then returns only `addDays(day1, ...)` for each. The range exists in the
function and is discarded at the return.

**The #11 / #17 anchoring question is genuinely open.** #11 closed as `not_planned` and said so in as
many words: latest-Peak-wins is pinned by tests but has no method-sourced justification, and the
`marquette-engine` capability "does not say **which** Peak anchors the window end when there are two".
#29 requires the question be settled or explicitly deferred in writing before this ships.

## Goals / Non-Goals

**Goals:**

- Make the count and the expected Peak-day range the user is already looking for reachable from the
  Status card, with no new view and no new visual token.
- Make it structurally impossible for the count to disagree with the window the same card explains.
- Settle the Peak-anchoring question in the spec, and record the part that is not settled.
- Correct the acceptance criterion in #29 that says no new engine output is needed, because reusing
  the existing all-cycles range would put a number on screen that contradicts the rule beside it.

**Non-Goals:**

- Any forward-looking statement. See Decision 1.
- Changing which Peak anchors the end, or the begin/end rules themselves.
- Changing what History's "Peak day range" means. See Decision 2.
- Deriving new per-day statuses, or touching `dayInfo`, `statusForCycleDay`, or `computeCycle`.

## Decisions

### 1. Retrospective count and historical range; no countdown in any form

`CycleResult.peakDay` is a fact the user entered, so a count from it is a restatement of their own data.
A future Peak day does not exist yet, and the Boland Institute app's central claim is non-predictive
charting — the app asserts no day, so it has no honest countdown to offer. #17 also removed the
confirmed/predicted source axis from every surface, and `status` already forbids rendering a predicted
source cue.

The awkward case is a date selected _earlier_ in the cycle than the Peak. `cycleDay - peakDay` is
negative there, and every way of presenting a negative number is either a countdown, an error, or a
lie about the sign's meaning. So the readout has three states, not one number:

```
+-------------------------------------------------------+
|  selected date >= Peak day                             |
|    n > 0 -> "n days since your Peak reading on         |
|              cycle day P."                             |
|    n = 0 -> "Your Peak reading is on cycle day P       |
|               - the same day."                         |
|                                                       |
|  selected date <  Peak day                             |
|    -> "Your Peak reading is on cycle day P             |
|         - this date is before it."                    |
|        (no number in either direction)                |
|                                                       |
|  no monitor Peak reading in the cycle                 |
|    -> "No Peak reading logged for this cycle yet."     |
+-------------------------------------------------------+
```

**Alternative considered: show "3 days until your Peak" on a pre-Peak date.** Rejected — it is
precisely the thing the method is defined against, and it is the hardest kind of claim to label
honestly because it changes every day. If a countdown is ever wanted it should argue the
non-predictive position on the record in its own issue, as #29 itself says.

**Alternative considered: hide the readout entirely before the Peak.** Rejected — it would make the
line flicker in and out as the user pages the date picker, and the Peak's cycle day is useful
information before the date arrives. Naming the day without counting is the honest middle.

### 2. The range is the one the calendar rule used, which means exposing a value the engine discards

#29 asks for the range "derived from the configured history window" and also asserts "no new engine
output is required; every value shown already exists as derived output". Those two cannot both hold.
The only Peak range that already exists on `Forecast` is the all-cycles pair, and it is not the
windowed one.

The concrete failure, with `historyWindow = 6` and ten closed cycles peaking on days
`11,12,13,14,16,18,19,20,21,22`:

```
  all-cycles pair          = (11, 22)
  windowed peaks (last 6)  = [16,18,19,20,21,22]   -> range (16, 22)

  Status would print:  "Fertile from cycle day 16 - 6
                            until day 22 + 3"
  and then:           "expected Peak day 11 to 22"
```

Two numbers from the same card, derived from the same protocol, disagreeing in front of the user. The
all-cycles range is the wrong number for this line; it is the right number for History, which is
labelling the user's whole record rather than the current cycle's rule.

So the engine stops discarding what it computes. `predictFertileWindow` already has the windowed
minimum and maximum in hand at `predict.ts:96-97`; it returns them plus the count of contributing
cycles, and `Forecast` gains one nullable field carrying them. No rule changes, no new input, no new
iteration. History's all-cycles pair is left exactly as it is, because its requirement is about the
user's whole history and is unaffected.

`null` rather than a `0` sentinel when the window holds no Peak, because `0` is not a cycle day and the
existing pair already has to guard on `> 0` at its one call site. A nullable field makes "no range"
unambiguous at the type level.

**Alternative considered: compute the windowed range in the Status view from `output.cycles`.** Rejected
— it would put a copy of the calendar rule's slicing and windowing logic into a view, where the two
copies would drift the first time either changed. The engine is the one place that already holds the
rule.

**Alternative considered: reuse the all-cycles pair and label the line "across all your cycles".**
Rejected — honest, but it answers a different question from the one the user asked. The issue's own
framing is the tiebreaker: the range is worth showing because it tells the user "the window your Peak
is expected to fall inside", and that window is the one the app computes from the windowed range.

### 3. The range is a standing fact, so it is not gated to the current cycle

`StatusCard` is already handed `output.forecast.expectedPeriodStart` and renders it whatever cycle is
selected — the next-period estimate has exactly this property today. Gating the Peak range to the
newest cycle while the next-period line above it is ungated would make the card internally
inconsistent, and the label "based on your last N completed cycles" makes no claim about the selected
cycle in the first place.

The issue's "shown for the current cycle" describes the normal case, where Status opens on today and
today is in the current cycle. It does not require the line to disappear when a user pages back.

### 4. "Last of N Peak readings" is what makes the multiple-Peak case non-misleading

Naming the cycle day of the Peak is not by itself enough. A user with Peaks on days 12 and 15 reading
"2 days since your Peak reading on cycle day 15" learns which reading was used, but nothing tells them
the cycle holds another one — and the same card elsewhere treats `peakDay` as though cycles have one.

So the line appends the count, read from the cycle's stored monitor `peak` records:

```
  1 Peak   ->  "2 days since your Peak reading on cycle day 15."
  2 Peaks  ->  "2 days since your Peak reading on cycle day 15.
                Last of 2 Peak readings this cycle."
```

The clause states which reading the count is from and how many exist, and deliberately does **not** claim
which one set the window end. After six cycles `computeEnd` takes the _earliest_ of the current and
historical ends (`earliest-end` at `marquette.ts:100`), so the latest reading in the cycle can lose to
the historical rule. "The one that sets your window end" would be false in that case; "last of 2" is
true in every case.

### 5. The count and the peak tally live in `lib.ts` as pure helpers, not inline in the component

`status/lib.ts` already holds this view's copy — `STATUS_LABELS`, `BEGIN_RULE_LABELS`,
`END_RULE_LABELS`, `warningBanner`, `windowDescription` — and `lib.test.ts` unit-tests the wording. Two
pure functions keep the branching out of JSX and make the exact sentences assertable, which is the only
practical way to test that no countdown and no safety claim slipped into the copy.

### 6. Copy and placement

Two lines, below the window explanation and above the next-period estimate, so the card reads as
badge → window → where you are relative to the Peak → what the next period looks like.

| Case           | Text                                                                                   |
| -------------- | -------------------------------------------------------------------------------------- |
| Counted        | `2 days since your Peak reading on cycle day 15.`                                      |
| Same day       | `Your Peak reading is on cycle day 15 — the same day.`                                 |
| Pre-Peak date  | `Your Peak reading is on cycle day 15 — this date is before it.`                       |
| No Peak        | `No Peak reading logged for this cycle yet.`                                           |
| Multiple       | append ` Last of 2 Peak readings this cycle.`                                          |
| Range          | `Based on your last 6 completed cycles, your expected Peak day is cycle day 12 to 17.` |
| Range, partial | `…cycle day 12 to 17. 4 of those cycles have a Peak reading.`                          |

"0 days since" reads as a measurement failure, hence the separate same-day phrasing. "this date"
rather than "today" because the view is date-selectable. The partial-range sentence exists because
the window is six cycles wide but only the cycles that actually carry a Peak contribute, and saying
"based on your last 6" when four of them had none would overstate the evidence.

### 7. The Peak-anchoring question: reporting is settled, justification is deferred

#29 requires the question be settled or explicitly deferred in writing. Both halves are done, in the
places that will still be read:

- **Settled — the latest monitor Peak anchors, and the spec now says so.** The new
  `marquette-engine` requirement states that the latest reading in a cycle is the cycle's Peak, that
  the end is measured from it, and that a surface reporting elapsed days measures from that same
  reading. The behaviour is unchanged and was already test-pinned by #11's review; what changes is
  that it is a documented requirement rather than a side effect of a loop that overwrites. That also
  removes the reason the question was urgent here: the readout cannot be built against an
  unspecified anchor, and now it is specified.
- **Explicitly deferred — whether the method prefers the first reading.** Still not established, and
  this change neither invents an answer nor quietly forecloses one. The requirement says so in its own
  text, so the deferral lives in the spec rather than only in this file.

Recording it here, because a deferral recorded only in an artifact is the kind of thing that reads
later as an oversight. It is a deliberate deferral: changing the anchor is a behavioural change to the
window, and it needs a method source, not a preference. If it is ever decided the other way, the
requirement and `computeEnd` change together, and because the count is measured from `peakDay`, the
readout follows automatically with no edit in `src/features/`.

### 8. Reuse the existing text tokens; the range deliberately does not take the forecast token

`FERTILITY_TEXT_VISUALS.body` for the count, which is a statement about the user's own records and
belongs at the same weight as the window line above it. `FERTILITY_TEXT_VISUALS.muted` for the range,
which is a background statistic and should not compete with the status for attention. The forecast
token (`FERTILITY_FORECAST_VISUAL.text`, already used on the next-period label) means "projected
date" in this app, and the expected Peak range is deliberately _not_ framed as a projection — it is a
statistic about past cycles. Painting it with the forecast token would signal exactly the predictive
reading #29 argues against. No new token, no new colour, no palette change.

## Risks / Trade-offs

- **The range is a new field on `Forecast`, so the deferred Python port has one more shape to mirror**
  → it is a nullable data object, not a rule, and the logic already exists in the function being ported.
- **Reading `dayRecords` in the Status view is new for this view** → mitigated by Decision 5: the
  component does not filter records itself, `lib.ts` does, and it is the same store field three other
  views already subscribe to. It is also the only way to answer "how many Peaks does this cycle hold"
  without adding engine output the issue says not to add.
- **"Last of N" is one more clause on a line that already names a cycle day** → accepted. Without it
  the multiple-Peak case is exactly the misleading presentation #29's acceptance criteria rule out, and
  a tooltip would hide the very fact a user needs while scrolling.
- **The count follows the selected date, so paging the date picker moves it** → intended. The card
  already reports a cycle day for the selected date; a count frozen on today would contradict the line
  above it. The copy avoids "today" for the same reason.
- **The range line is a retrospective statistic sitting on a card that also carries a predictive
  next-period line** → the label names past cycles explicitly, and it takes the muted/body treatment
  rather than the forecast treatment, so the two read differently at a glance.
- **A cycle holding many Peaks makes the clause long** → the count saturates in usefulness long before
  the sentence becomes unreadable, and the clause is the thing that keeps it truthful.

## Migration Plan

No stored data changes. The count, the peak tally, and the range are all derived at read time and never
persisted, so every cycle re-derives on next load. No backup format change and no
`CURRENT_BACKUP_VERSION` bump.

`Forecast` gains a nullable field, which is additive: an older build reading the same settings row is
unaffected, and nothing persisted depends on the shape. Rollback is a revert.

## Open Questions

None. Decision 7 settles the part of the Peak-anchoring question that blocks this change and records
the part that does not block it as a deliberate deferral; the rest are recorded above as assumptions
and are reversible by editing one function or one conditional.
