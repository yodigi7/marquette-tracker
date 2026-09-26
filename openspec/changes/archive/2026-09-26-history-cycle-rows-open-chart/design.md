# Design

## Context

The History `CycleTable` renders one `TableRow` per cycle with `result.cycleId` as the React key, but the rows have no interaction. The app already has a `/cycle/:cycleId` route (`src/app/router.tsx`) and `CycleChartView` reads `cycleId` from `useParams()` and resolves it via `resolveSelectedCycle` — a param match wins, else the newest cycle, else the empty state. The cycle selector in `CycleChartView` already navigates with `navigate(\`/cycle/${id}\`)`. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**

- Make each History cycle row a keyboard-accessible control that navigates to that cycle's chart.
- Visually identify the cycle identity cell as the control.
- Preserve the existing route, selector, and empty/fallback behavior.

**Non-Goals:**

- No new route or cycle-detail view.
- No change to cycle-chart data, calculations, or the selector.
- No change to History columns, sorting, filtering, or derived statistics.
- No change to the Marquette engine or persistence model.

## Decisions

**Decision: whole-row clickable, cycle identity cell styled as the control.**

The issue asks for both "clicking a cycle row" to work and "the cycle identity is clearly identified as the link/control." Making the entire `TableRow` the click target satisfies the first; styling the cycle number cell with link treatment (primary color, underline on hover) satisfies the second. A dedicated link-only cell would fail the "clicking a cycle row" criterion; a bare clickable row with no visual cue would fail the "clearly identified" criterion.

_Alternative considered:_ a `<Link>` wrapping the cycle number only. Rejected — it satisfies the accessible-name criterion but not the whole-row click criterion, and a link inside a clickable row creates nested interactive elements, which is an accessibility anti-pattern.

**Decision: `role="link"` on the row with `tabIndex={0}` and `onKeyDown` for Enter/Space.**

A clickable table row is not natively keyboard-focusable. Adding `tabIndex={0}` makes it focusable; `onKeyDown` handling Enter and Space makes it activatable; `role="link"` communicates the outcome to assistive technology. This is the standard pattern for interactive table rows and avoids nesting a real `<Link>` inside the row.

_Alternative considered:_ `role="button"`. Rejected — the outcome is navigation, so `link` is the correct role.

**Decision: `useNavigate()` to `/cycle/${cycleId}`.**

Matches the existing selector navigation in `CycleChartView`. No router changes needed.

**Decision: accessible name via `aria-label` on the row.**

The row's visible text already contains the cycle number and Day 1, but a single `aria-label` gives a clean, predictable accessible name: `Open cycle chart for Cycle ${cycleNo}, Day 1 ${day1}`. This satisfies "an accessible name that includes useful cycle context, such as cycle number and Day 1."

**Decision: no mobile layout change.**

The `Table` component already wraps in `overflow-x-auto`. Row clickability is width-independent. The issue's mobile criterion is that the interaction remains usable, not that the table be redesigned — and changing columns is an explicit non-goal.

## Risks / Trade-offs

- **[Risk]** A clickable row with `role="link"` and a styled cycle cell could read as two separate controls to a screen reader. → The `aria-label` on the row overrides the cell content for the row's accessible name, and the cycle cell has no independent role, so it is presented as part of the row.
- **[Risk]** `onKeyDown` on a `<tr>` may conflict with future row-level interactions. → Only Enter and Space are handled; no other keys are intercepted.
- **[Trade-off]** The whole row is clickable, which means clicking anywhere — including the status badge — navigates. This is the intended behavior per the issue.
