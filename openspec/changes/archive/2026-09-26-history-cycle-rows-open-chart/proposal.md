# Proposal

## Why

The History view lists cycles in a table, but the rows are display-only. A user who wants to see a specific cycle's chart has to navigate to the Cycle chart separately and pick the cycle again. The app already has a `/cycle/:cycleId` route and a cycle selector; the History table simply does not connect to them.

## What Changes

- Each cycle row in the History table becomes a navigable control that opens that cycle's chart at `/cycle/<cycleId>`.
- The row is keyboard-focusable and activatable (Enter/Space), with an accessible name carrying cycle number and Day 1.
- The cycle identity cell is visually identified as the control.
- Works for closed and open cycles, and when the algorithm is disabled (derived columns hidden).
- The existing cycle-chart route, selector, and empty/fallback behavior are unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `history`: The cycle table gains a navigation requirement — rows are interactive controls that open the cycle chart, with an accessible name and keyboard activation.

## Impact

- `src/features/history/index.tsx` — the `CycleTable` component gains row navigation.
- `src/features/history/__tests__/history.test.tsx` — new tests for navigation, keyboard activation, algorithm-disabled, and open/closed cycles.
- No changes to the Marquette engine, persistence model, routing table, or cycle-chart view.
