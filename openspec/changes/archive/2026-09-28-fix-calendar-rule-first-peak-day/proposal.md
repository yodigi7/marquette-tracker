# Proposal

## Why

**From cycle 7 onward the app's fertile window opens a day late, and the Peak-day ranges it reports are labelled as protocol values while measuring something else.**

A cycle's monitor Peak is not one day. The monitor is specified to give "at least one day of 'high' fertility and **two days of 'peak' fertility**" (Fehring 2013), and ovulation is detected during "the 2 days of CPFM peak fertility" in 91.1% of cycles (Fehring 2008). A cycle therefore normally holds two Peak readings, and the protocol uses a different one for each end of the window:

```
  cycle 3   day 11  12  13  14
                    P   P
                    |   +--> "the last peak reading"  ->  window end  = 16
                    +------ "earliest peak day"       ->  feeds the NEXT cycle's begin rule
```

The engine collapses that pair to a single number — the latest reading — and uses it for both jobs. The end rule is right, because the published rule is "three full days past the last peak reading" (Mu, Fehring & Bouchard, _Linacre Q_ 2022). The begin rule is wrong: the cycle-7+ calendar rule subtracts six from the _earliest peak day_, which is the day the surge started, and the app measures from the day it finished.

```
  six cycles of history, each with a normal two-day Peak run

              first-Peaks:  12  15  12  14  16  13        <- what the rule means
              last-Peaks:   13  16  13  15  17  14        <- what the app measures
                                |         |
  today's window opens:  min(13) - 6 = 7      min(12) - 6 = 6
  "expected Peak day":            13 - 17                12 - 16
```

The begin lands one day late whenever a Peak runs two days and two days late when one runs three. The error is in the safe direction for the end and the unsafe one for the begin: the user is told a day is not fertile when the protocol's own rule makes it fertile. The same last-Peak numbers also produce the "expected Peak day" range on Status and the "Peak day range" on History, so two surfaces present a measurement as though it were the protocol's Peak day.

The same one-number collapse makes the no-Peak-history fallback a day short. The engine composes it as `12 - 6` through `12 + 3`, which ends the window on day 15 — but day 12 is the surge day, the monitor then shows at least one more Peak day, and the end rule measures from the last one. The earliest end the protocol allows is day 16.

The engine spec already flagged the ambiguity and left the question open: "Whether a Marquette teacher would prefer the first reading in a cycle that holds two has not been established, and is not asserted here." It has now been established — **the calendar rule's peak day is the first Peak reading in the cycle** — and the answer splits the number in two. This change makes the engine hold both and stops reporting one of them under the other's name.

## What Changes

- **The engine keeps two monitor Peak values per cycle.** The first Peak reading is the cycle's Peak _day_ for the calendar rule and for reporting; the last is the reading the window _end_ is measured from. A cycle with no monitor Peak has neither.
- **The cycle-7+ calendar begin is measured from first-Peak days.** The end rule is untouched and continues to measure from the last Peak reading of the same cycle.
- **The forecast and projected windows take their two edges from the two values**: the earliest open from the earliest first-Peak in the lookback, the latest close from the latest last-Peak in it.
- **The reported Peak-day range becomes the surge-day range** — the first-Peak days inside the configured history window. Status and History currently label a last-Peak measurement as "Peak day".
- **The no-Peak-history fallback window ends on day 16 instead of day 15**, because the earliest possible _last_ Peak reading is one day after the earliest possible first one. It remains composed from protocol constants rather than a literal.
- **A new requirement states the begin rule's opener and its invariant.** A cycle's first High _or Peak_ reading opens the window whenever it falls before the calendar day, and the window therefore never begins after the cycle's own Peak day. Both are already true in the code; neither is stated in any spec, so the invariant is currently correct by accident rather than by design.
- **Per-cycle readouts name both readings and their jobs**, so no surface presents a single day as the cycle's Peak day. The count of readings is stated alongside.

## Capabilities

### New Capabilities

None. Every behaviour here already exists in the engine; this change corrects which value each rule reads and names.

### Modified Capabilities

- `marquette-engine`: the calendar-range requirement is restated over first-Peak days; the latest-Peak requirement keeps anchoring the end and stops asserting the reported Peak day is the same single value; a requirement is added for the High-or-Peak opener and the never-after-the-Peak invariant; the day-6 fallback requirement notes the composed end.
- `cycle-projection`: the projected window's begin is derived from first-Peak days and its end from last-Peak days, and the composed fallback end moves to day 16.
- `history`: the Peak-day range is the first-Peak range, and the per-cycle Peak day names both readings.
- `status`: the expected Peak-day range is the first-Peak range; the retrospective count keeps measuring from the last reading.
- `instructor-summary`: the summary names the first Peak day as the cycle's Peak day and the last as the reading the end was measured from.

## Impact

- **Engine (`src/core/engine`)**: `CycleResult` and `CycleHistory` gain the first-Peak value alongside the existing last-Peak one; `computeBegin` reads first-Peak days; the history feed in `engineSdk` carries both; `predict` and `projection` consume the correct value per edge; the composed fallback constant is recomposed rather than retyped. The engine stays pure and takes no new kind of input.
- **Surfaces**: display copy on History, Status, and the printable cycle summary. No layout, route, or stored-record change.
- **Tests**: table-driven engine tests are written before the change, per the project's engine convention. The new begin invariant and the two-value split get direct cases rather than being implied by existing ones.
- **Stored data**: unchanged. Everything is derived at read time; no schema version bump and no migration.
- **Dependencies**: none added.
