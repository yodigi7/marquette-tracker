# Design

## Context

`DayCell` renders observation markers in a fixed 8px row, while the Calendar legend repeats those markers beside text. `lucide-react` is already installed and used by the Calendar. See `proposal.md` for motivation and `specs/calendar/spec.md` for behavior.

## Goals / Non-Goals

**Goals:**
- Render the existing intercourse boolean as a small filled red heart in day cells and the legend.
- Preserve the current “Intercourse” title and leave other markers unchanged.
- Add focused rendering coverage.

**Non-Goals:**
- Change stored data, cycle logic, or the cycle-chart overlay.
- Introduce a generalized marker abstraction.
- Redesign day-cell accessibility.

## Decisions

### Decision 1: Use the existing Lucide icon set

Use `Heart` from `lucide-react` with explicit `size-2`, `fill-red-500`, and `text-red-500` classes. A titled wrapper preserves the existing marker identification. Unicode and CSS-only alternatives were rejected because the icon library provides consistent sizing and rendering.

### Decision 2: Keep the legend change local

Render the heart directly beside the Intercourse legend label rather than changing `LegendDot`, which is also used by menses, monitor, and ovulation markers.

### Decision 3: Verify the rendered Calendar

Extend the existing Calendar component test to record intercourse, verify the heart and red fill in both surfaces, and verify an unrecorded day has no heart.

## Risks / Trade-offs

- **Red heart and red menses dot share a color** → Their distinct shapes and legend labels preserve recognition.
- **The marker row is only 8px high** → `size-2` fits the existing footprint without changing cell dimensions.
