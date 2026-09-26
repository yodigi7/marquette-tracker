# Design

## Context

See `proposal.md` for motivation and `specs/` for the requirements. What shapes the approach:

`computeCycle` is the only function that holds both the computed window and the cycle's `records`,
which makes it the natural place for a reconciliation check. `dayInfo` and `statusForDay` cannot
carry the check: `dayInfo(window, peakKnown, day)` in `src/core/cycleStatus.ts:9` is called from
`status/index.tsx`, `calendar/index.tsx`, and twice in `calendar/grid.ts`, none of which hold a
`DayRecord`. Threading a record through all five call sites to fix a reporting concern would widen
the change for no benefit, so the check belongs in the engine where the data already coexists.

`EngineWarning` is a **dead channel**. `collectWarnings` in `engineSdk.ts` builds the array,
`EngineOutput.warnings` carries it, and no feature reads it — `rg` for `warnings` across
`src/features` and `src/core/store` returns only two test fixtures passing `warnings: []`. The
out-of-band protocol warning does reach users, but through `forecast.outOfBandCount` rendered in
`history/index.tsx:101`, not through this channel. So "consistent with existing warning treatment"
has two readings, and the ticket's acceptance criteria require surfacing either way.

Per-cycle warnings already ride on `CycleResult.warnings` (`no-peak-end` is pushed there today), so
the Status view can read the selected cycle's warnings without any new plumbing. The History
forecast has no per-cycle array to draw on, so a count is the shape that fits there — which is
exactly what `outOfBandCount` already does.

## Goals / Non-Goals

**Goals:**

- Make monitor evidence that contradicts the computed window visible instead of silently absorbed.
- Keep the computed window protocol-exact.
- Stop presenting the remainder of an in-progress cycle as settled.
- Make the relationship between recorded evidence and derived status explicit in the specs.

**Non-Goals:**

- Moving the window end in response to trailing evidence. See Decision 1.
- Introducing mucus or BBT as engine evidence — #12 owns that, and this change must not widen it.
- Modelling the monitor's three-consecutive-Low confirmation. That is a separate feature with its
  own daily-use value; this change only needs to notice contradictions.
- Retroactive relabelling of historical windows.

## Decisions

### 1. Warn; do not move the window — _assumption recorded, please confirm_

The protocol defines the end solely through the last Peak and is silent on trailing evidence, so
this is a design choice rather than a lookup. **Warn** was chosen: the window end stays
`last monitor Peak + 3`, and a new warning reports the contradiction.

**Alternative considered: extend the end to cover trailing evidence.** Rejected, but it is a real
option and the reasoning is worth recording. It is symmetric with the begin rule, which already
pulls the window earlier when a High arrives ahead of the calendar begin, and it is more
conservative for a user avoiding pregnancy. Against it: no published source extends the window this
way, and doing so would make the app's central output non-protocol — the exact property
`fix-protocol-post-peak-and-status-honesty` just established by deleting the configurable
interval. Warning keeps the window auditable against the source and still tells the user their data
disagrees with it.

**If this assumption is wrong**, the change is a different one: `computeEnd` would take the records
and grow the end to cover any later `high`/`peak`, and the warning would be dropped rather than
added. That is a smaller engine diff but a larger claim, and it should be made deliberately.

### 2. The check lives in `computeCycle`, not in `dayInfo`

`computeCycle` already receives `records` and produces both the window and `warnings`, so the
reconciliation is a few lines there with no signature change to any consumer. The alternative —
making `dayInfo` accept the day's record — would touch `status/index.tsx`, `calendar/index.tsx`, and
two `calendar/grid.ts` call sites, and would drag a record into a function whose contract is
deliberately "a function of the window and the cycle day alone"
(`marquette-engine`: _Recorded monitor evidence and derived status are related but independent_).
Keeping the derivation pure and putting reconciliation beside it preserves both properties.

### 3. `low` outside the window is not a contradiction

A `low` is the absence of a fertility signal, so it is consistent with a closed window. Warning on
it would fire on every ordinary post-window day the user logged, which is most of them, and would
train the user to ignore the warning. Only `high` and `peak` assert fertility, and only those
contradict the window.

### 4. The earliest offending day is reported, once per cycle

A cycle can hold several out-of-window readings. Reporting the earliest is the actionable one — it
is where the data and the window first disagree — and it keeps the warning a single stable fact
rather than a count that grows as the user backfills. One warning per cycle also means
`CycleResult.warnings` stays a short list a view can render directly.

### 5. Warnings surface on Status, as a count in History

`CycleResult.warnings` gives the Status view the selected cycle's warnings for free, which is the
right place: the user is looking at one cycle and asking about it. History has no per-cycle array
to iterate, so a count mirroring `outOfBandCount` is the shape that fits its forecast panel.

Surfacing on both is required by the ticket's acceptance criteria, and it is what makes wiring up a
previously dead channel worth doing at all.

### 6. Warnings are derived output, so the algorithm toggle suppresses them

The toggle's contract is that no derived interpretation appears anywhere when off. A warning is
derived — it is computed by the engine, not recorded by the user. Showing it while everything else
is suppressed would be inconsistent and would leak a conclusion the user asked not to be given.

### 7. The warning is a cycle-level banner placed above the status badge

Two coupled choices, both settled with the user rather than inferred.

**Cycle-scoped, always shown for that cycle.** The Status view is date-selectable but the warning is
a property of the cycle: a monitor High on day 15 contradicts the model no matter which day is
being inspected. Gating it to days at or after the offending reading would mean a user looking at
day 8 never learns their day-15 reading is High — which defeats the purpose, and is worst exactly
when it matters most for someone avoiding pregnancy. The banner therefore names the offending cycle
day explicitly rather than leaving the day implicit.

**Placed above the status badge, not inline below the window line.** The badge and the warning are
in tension by construction: the card asserts "After (post-peak)" from the model while the warning
reports that a recorded reading contradicts it. Inline placement puts the correction underneath the
claim it corrects, so a skimming reader takes away the model's answer. Above the badge, the
contradiction is what registers.

**Alternative considered: inline under the window line.** Rejected — it reads as commentary on the
window text rather than as a correction to the status, and it is visually subordinate to the badge
it should be qualifying.

### 8. No dismiss control, and reuse the existing warning visual language

`FERTILITY_TEXT_VISUALS.warning` (`text-fertility-warning`, amber-700 light / amber-400 dark) is
already in use for the History out-of-band notice at `history/index.tsx:102`, so the warning
treatment already exists and this change extends it rather than inventing a palette. It is a text
token only, so the banner needs a border and spacing of its own to read as a block above a badge.

**No dismiss.** The warning is derived and recurs on every load; a dismiss would either reappear
anyway or start asserting something untrue. It stays until the underlying data changes.

The spec requires the warning be identifiable without relying on colour, consistent with how the
`calendar` capability already treats status and monitor cues. Text carrying the reading, the day,
and the computed end satisfies that, and it is what makes the treatment testable.

The Calendar deliberately gets no treatment. A per-day warning on the month grid would be new
derived clutter on a surface the `calendar` capability already keeps quiet, and #15 exists because
that grid is under pressure. Worth revisiting only alongside that issue.

## Risks / Trade-offs

- **Warning fatigue if the check is too broad** → mitigated by Decision 3; `low` is excluded, so
  only readings that actually assert fertility fire it.
- **The warning is advisory, so a user avoiding pregnancy can still be caught out** → accepted and
  stated plainly. The app does not claim the window accounts for their data; it tells them when it
  does not. Anyone wanting a conservative answer has #21's extend option available as a deliberate
  follow-up.
- **Wiring up `EngineWarning` means the existing `no-peak-end` and `cycle-out-of-band` warnings
  become renderable** → they are not rendered by this change unless a view chooses to. Scope is the
  two new kinds; if surfacing the older ones looks better on the same panel, that is a follow-up,
  not a silent expansion here.
- **`EngineWarning` gains a variant, which is a public engine type change** → the deferred Python
  port must handle it. The variant is a plain data shape, consistent with the existing two.

## Migration Plan

No stored data changes. Windows are derived at read time and never persisted, so every cycle
re-derives with the new warning on next load. No backup format change and no
`CURRENT_BACKUP_VERSION` bump.

Rollback is a revert. The new warning kind is additive: an older build reading a settings row is
unaffected, and no persisted shape depends on it.
