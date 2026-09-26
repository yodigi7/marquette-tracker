# Proposal

## Why

The engine resolves a day status without reference to what the user recorded on that day, so a
monitor reading can contradict the computed fertile window and the app never says so.

`dayInfo(window, peakKnown, day)` in `src/core/cycleStatus.ts:9` and `statusForDay` in
`src/core/engine/marquette.ts:107` take the window, whether a Peak is known, and the day number.
The day's `DayRecord` is not a parameter. At `marquette.ts:177` the engine iterates the cycle and
calls `statusForDay(day, fertileWindow, ...)` with the `records` array in scope but unused for
status. Two consequences follow, both resolved in the wrong direction for a user avoiding
pregnancy:

```
  cycle 7, history peaks [11,12,13,14,16,18], historyWindow 6
  calendarBegin = 11 - 6 = 5        calendarEnd = 18 + 3 = 21

  day 10: monitor PEAK
  day 15: monitor HIGH

  computeEnd -> earliest of (10+3 = 13) and 21  =  13,  rule earliest-end
  statusForDay(15, { begin: 5, end: 13 }, true)  ->  "post-peak"
```

Day 15 carries a user-entered `high` and resolves post-window. The begin rule is already
evidence-sensitive — `computeBegin` pulls the window _earlier_ when a High arrives ahead of the
calendar begin, which is the "whichever comes first" clause working correctly — so the window
**opens on evidence and closes on assumption**, and the two halves disagree about whether a
reading is allowed to matter.

The same failure needs no High at all. An open cycle whose Peak is early is painted `post-peak`
through the current day while the user is still actively logging into it.

Decision (1) of #21 shipped in `fix-protocol-post-peak-and-status-honesty`: the Status view no
longer labels these days "Safe", so the app no longer _asserts_ safety it never established. What
remains is that it silently absorbs contradictory data. Decisions (2) and (3) are open, and the
capability specs are still silent on how recorded evidence relates to derived status.

The published protocol does not settle this. Fehring defines the end solely through the last Peak
— "three full days past the Peak day of cervical mucus or the last Peak reading of the monitor –
wh ever came last" — and says nothing about a High arriving afterwards. On a real device the case
is reachable: the user keeps testing until the monitor confirms three consecutive Low readings, and
a High during that phase can land past `Peak+3`. This app has no concept of that confirmation, so
a High can be logged on any day.

## What Changes

- **The engine reports monitor evidence that falls outside the computed window** instead of
  absorbing it. A new `EngineWarning` kind fires when a user-entered monitor `high` or `peak` is
  recorded on a cycle day after the computed window end.
- **The window end is not moved.** It stays exactly `last monitor Peak + 3`. This change invents no
  rule the Institute has not published, and it preserves the protocol fidelity that
  `fix-protocol-post-peak-and-status-honesty` established by removing the configurable interval.
- **The long-open-cycle case is covered explicitly.** An open cycle whose computed end precedes the
  current day is reported, so the app stops presenting the remainder of an in-progress cycle as
  settled.
- **The warning becomes visible.** `EngineWarning` is currently a dead channel — computed by
  `collectWarnings` in `engineSdk.ts` and read by no surface. The new warning surfaces on the Status
  view as a cycle-scoped banner above the status badge, so the correction is not buried underneath
  the model claim it qualifies, and the History forecast reports a count in the same shape as the
  existing `outOfBandCount` treatment.
- **`marquette-engine` and `status` state how recorded monitor evidence relates to derived status.**
  The specs currently describe the window as a function of the cycle day alone and are silent on
  what happens when a reading disagrees.

### Not in this change

- Moving the window end in response to trailing evidence. Rejected as the primary behaviour
  because no published source sanctions it and it would make the app's central output
  non-protocol. Recorded as an alternative in `design.md`; revisit if a Marquette teacher or the
  Institute documents a rule.
- Introducing mucus or BBT as engine evidence — #12.
- A single-day ovulation estimate, or any change to the calendar begin rule, which is already
  correct.
- Retroactive relabelling of historical windows.
- `days-remaining-in-window`, and backlog #18, #19, #20.

## Capabilities

### New Capabilities

None. This change makes existing behaviour honest about contradictory data; it adds no new
capability surface.

### Modified Capabilities

- `marquette-engine`: adds a requirement that monitor evidence falling outside the computed window
  is reported as an engine warning, and that the computed end is unchanged by it. Adds a requirement
  covering the open-cycle case where the computed end precedes the current day. Adds a requirement
  stating the relationship between recorded monitor evidence and derived day status, which the
  capability does not currently describe in either direction.
- `status`: adds a requirement that the Status view reports a protocol warning affecting the
  selected cycle, and that the window explanation is not presented as settled while a cycle's
  computed end precedes the current day.

## Impact

**Engine** (`src/core/engine/`) — a new `EngineWarning` variant carrying the cycle number and the
offending cycle day; the check lives where `computeCycle` already holds both the window and the
records, so it needs no signature change to `dayInfo` or `statusForDay`. Pure TypeScript, no new
imports, still portable to Python.

**Store** (`src/core/store/`) — no change. `EngineOutput.warnings` already carries the array, and
per-cycle warnings already ride on `CycleResult.warnings`.

**UI** (`src/features/`) — `status/index.tsx` renders the warning for the selected cycle;
`history/index.tsx` reports a count alongside the existing out-of-band notice. `status/lib.ts` may
need a label helper for the new warning kind.

**Specs** — `marquette-engine` and `status` deltas. `app-settings` is untouched: no preference is
added or removed, which is the point of the design.

**Dependencies** — none added. No new package, no new component, no charting change.

**Scale** — the engine change is small and confined; the larger cost is the two surfaces plus their
tests, because the warning channel has never been rendered anywhere.
