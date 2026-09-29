# Design

## Context

See `proposal.md` for the motivation. What shapes the approach technically:

The comparison view renders one small Recharts chart per cycle. Colour is read in three places, and they currently disagree about what "this cycle's index" means:

| Consumer          | Reads index from                                      |
| ----------------- | ----------------------------------------------------- |
| Row label swatch  | the full `models` prop                                |
| Legend swatch     | the full `models` prop                                |
| Plotted band fill | `visibleModels`, the set left after the legend filter |

Only the third is wrong, which is why the legend reads as correct while the data contradicts it.

`buildComparisonData`, `ComparisonBand`, and `ComparisonDayDatum` in the cycle-chart lib are unreferenced and encode the same positional assumption, so they are a standing invitation to reintroduce it.

The store returns cycles via `db.cycles.orderBy("day1").toArray()`, so "newest first" is a well-defined order with no extra state to carry. Nothing computed is persisted anywhere in this app, so a derived colour introduces no migration, no backup-format change, and no sync concern.

Constraints carried from the project rules: no new dependency, no engine change, feature code stays in `src/features/**`, and the comparison view is not a document surface.

## Goals / Non-Goals

**Goals:**

- One place resolves a cycle's colour, and every consumer reads that resolved value.
- The anchor is the full logged set, so all three controls that change the selection behave identically without special-casing any of them.
- The "first six are distinguishable" requirement is enforced by a measurement rather than left as a comment about the colours.
- The positional-index assumption cannot survive in unreferenced helpers.

**Non-Goals:**

- Changing what the comparison view displays, or the day-axis behaviour on hide. Both are deliberate non-decisions recorded in the spec delta and `proposal.md`.
- Making colour the primary channel for anything. Monitor reading is already encoded as block height, which is the load-bearing cue; colour is a redundant second cue and the row label is the textual equivalent.

## Decisions

### Resolve colour once, from the full logged set, and pass it down

Colour is resolved for a cycle against the full logged list and carried on the data the bars already receive, so the band fill, the row label, and the legend all read the same value rather than each re-deriving it.

**Alternative — point the band fill at `models.indexOf(model)` like the other two.** This is the smallest possible diff and does fix the reported bug. It is rejected because it makes the palette a function of _which_ cycles were passed in, which leaves the custom picker and the cycle-count control still repainting. Those are the same defect reached by a different door, and the fix would be to re-open this change the first time someone noticed.

**Alternative — pass a `colorByCycleId` map down as a separate prop.** Cleaner separation than an index, and it removes any possibility of a positional index leaking into the data. Taken: the chart receives the map and resolves each row's colour from it by `cycleId`, which is the identity the whole decision rests on. The rendered band also exposes the resolved colour as an attribute, which is what makes the invariance assertable without reading a computed style.

### Anchor on the full logged set, newest first, accepting the repaint on a new cycle

The alternative considered at length was pinning each cycle to a permanent colour derived from its cycle number. That is strictly more stable, and it loses on two counts: the cycles on screen then hold arbitrary hues with no ordering meaning, and two hand-picked cycles can land on the same hue. Recency order means the comparison looks the same every time it is opened, and hue then carries real information — rank by recency — instead of being decoration.

The cost is accepted deliberately: logging a cycle re-anchors the chart and every cycle's colour changes. This was confirmed by the user on the basis that the comparison view is not opened often enough for the churn to matter.

A consequence worth stating plainly: this repaints the current chart once, because the palette itself is being replaced. That is a one-time visible change, not a recurring one.

### Measure the palette instead of asserting it

"Distinguishable" was being carried as a comment. It is now a number. Colour separation is computed with CIEDE2000 — the standard perceptual difference metric — and the first six entries are required to clear a floor, so a future edit that swaps in two similar colours fails a test rather than shipping.

The floor is **25**. Published guidance treats roughly 23-25 as the point at which two colours are reliably told apart, and 28.8 is comfortably above it while still being reachable by a hand-edited palette.

Measured, in CIEDE2000:

| Set                                                         | Weakest pair                 | Value    |
| ----------------------------------------------------------- | ---------------------------- | -------- |
| Current first six (blue, green, orange, pink, teal, indigo) | blue ↔ indigo, orange ↔ pink | **12.0** |
| Replacement first six                                       | teal ↔ lime                  | **28.8** |

This is the evidence for the issue's claim that two of the current pairs are genuinely weak, and for the decision to rebuild rather than tidy.

The first six were found by exhaustive search over the candidate hues, maximising the weakest pairwise distance and then maximising the weakest consecutive distance. The tail was chosen jointly rather than greedily, because a greedy extension put violet beside indigo at 7.2 — worse than the palette it was meant to improve.

**Load-bearing assumption.** The issue recorded that "the first six must be maximally distinguishable from their neighbours" is ambiguous between _consecutive rows_ and _all six against each other_, and proposed the second without it being confirmed. It is implemented as the second, because with six rows stacked every one is visible against every other. Reversing this means reordering the first six, and nothing else. Flagged in the PR for confirmation.

**Load-bearing assumption.** The twelve hex values are this agent's choice, made by measurement, not the user's. They are visible on screen. One entry, `lime` `#84cc16`, is noticeably more acidic than the rest; it is there because the optimiser needed a lightness/green slot that nothing else occupied, and it can be swapped for a less aggressive green at some cost to the 28.8 floor. Flagged in the PR for confirmation.

### Delete the unreferenced comparison-data helpers

`buildComparisonData`, `ComparisonBand`, and `ComparisonDayDatum` are removed rather than re-pointed. They are referenced by nothing, including tests, and they encode the positional-index assumption this change exists to remove. Re-pointing them would leave a helper that looks like the supported way to build comparison data while disagreeing with the chart.

## Risks / Trade-offs

- **Beyond six cycles, some colours are necessarily close.** Twelve mutually distinct hues are not achievable; the best achievable weakest pair across all twelve is 12.3, which is below the floor the first six are held to. The requirement is deliberately scoped to the first six, which are the ones on screen together at the default history window. → The scenario is written to cover the full selectable range only as "no two share a colour", which is achievable, and the pairwise floor is scoped to the default size.

- **A future edit could reintroduce the split index by adding a fourth colour call site.** → Colour is resolved in one place and passed as a value, so there is no index left to re-derive; a new call site that wants a colour has to ask for it.

- **The stored-data layer is untouched, so this cannot be tested through persistence.** → Invariance is asserted at the render boundary across all three controls, which is where the defect was observable.

- **Measuring CIEDE2000 in the test suite adds colour-space code to the repo.** → It is a pure function with no dependency, kept beside the palette it guards, and it is what makes the requirement checkable. `pnpm check` is the gate.

## Migration Plan

None. No stored value changes, no schema change, no backup-format change. Rollback is reverting the commit; the previous behaviour needs no data repair.

## Open Questions

None that would change the specs, the approach, or the task breakdown. The two ambiguities above are recorded as load-bearing assumptions to be confirmed, not deferred — either can be acted on by reordering the palette alone.
