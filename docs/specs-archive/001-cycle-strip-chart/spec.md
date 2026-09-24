# Feature Specification: Cycle Strip Chart

**Feature Branch**: `001-cycle-strip-chart`

**Created**: 2026-09-24

**Status**: Draft

**Input**: Converted from the project's milestone workflow (docs/MILESTONE_*); this is Milestone 6. Behavior source: IMPLEMENTATION_PLAN §6.3 + AGENTS.md view 3.

## User Scenarios & Testing

### User Story 1 - View a MBPM-style strip for one cycle (Priority: P1)

The user opens the Cycle chart view, picks one cycle, and sees that cycle's days as a horizontal strip. Each recorded day shows the CBPM-style monitor reading as a band (Low / High / Peak), and the computed fertile window is drawn as a shaded background band over the strip so she can see where readings landed relative to the window.

**Why this priority**: This is the core purpose of the view — reading a cycle at a glance against the engine's computed window. Without it the view is empty.

**Independent Test**: Can be fully tested by seeding one cycle with monitor readings in a Vitest component test and asserting the strip renders the correct day count, reading bands, and window shading, delivering a functional read-only strip chart.

**Acceptance Scenarios**:
1. **Given** a closed cycle with monitor readings on several days, **When** the Cycle chart view loads for that cycle, **Then** a horizontal strip renders one segment per cycle day with Low/High/Peak bands matching the monitor records.
2. **Given** the same cycle, **When** the view renders, **Then** the computed fertile window is drawn as a shaded background band (solid = confirmed, dashed = predicted window), and days outside it are visually distinct.
3. **Given** `algorithmEnabled === false`, **When** the view renders, **Then** the monitor/mucus/BBT strip still renders but NO fertile-window band is drawn (raw readings only), consistent with the "algorithm off — computed windows hidden" rule.

### User Story 2 - Overlay optional signals (Priority: P2)

The user toggles overlays to see cervical mucus level, BBT line (right axis), and intercourse markers aligned to the same day axis as the monitor strip.

**Why this priority**: Turnkey value of the CBPM strip; critical for pattern review but secondary to the core strip itself.

**Independent Test**: Can be fully tested by seeding a cycle with mucus/BBT/intercourse records and asserting the overlay toggles render/remove their marks at the correct day positions while the strip stays stable.

**Acceptance Scenarios**:
1. **Given** a cycle with mucus records, **When** the mucus overlay is enabled, **Then** mucus High/Peak marks appear aligned to their day; disabling the overlay removes them.
2. **Given** a cycle with BBT values, **When** the BBT overlay is enabled, **Then** a line/points chart appears on the right axis aligned to the same days; missing days render gaps rather than connecting across them.
3. **Given** a cycle with intercourse records, **When** the intercourse overlay is enabled, **Then** a marker appears on the recorded days.

### User Story 3 - Select between cycles (Priority: P2)

The user switches between cycles (latest first) via a dropdown to compare one cycle's strip against another.

**Why this priority**: Needed for review across cycles; low effort, high value once the strip exists.

**Independent Test**: Can be fully tested with two seeded cycles and asserting the selector lists them and swaps the rendered strip.

**Acceptance Scenarios**:
1. **Given** two or more cycles, **When** the user picks a different cycle in the dropdown, **Then** the strip re-renders for that cycle with its own readings and window.
2. **Given** no cycles exist, **When** the view loads, **Then** it shows an empty-state message guiding the user to the Today view to start a cycle.

## Requirements

### Functional Requirements

- **FR-001**: The Cycle chart view MUST render a per-cycle horizontal strip chart of daily monitor readings (Low / High / Peak), one segment per cycle day, using Recharts.
- **FR-002**: The strip MUST be a step/band style (CBPM forced-scatter look) rather than a continuous interpolated line.
- **FR-003**: The computed fertile window (from `store.output` `CycleResult.fertileWindow`) MUST be drawn as a background band: solid for `confirmed` resolution, dashed for `predicted` (mirroring the Calendar view's visual language).
- **FR-004**: The view MUST gate the window band on `settings.algorithmEnabled`; when off, ONLY the raw readings/overlays render (per constitution principle I).
- **FR-005**: Mucus overlay (Low/High/Peak day marks) MUST be toggleable on/off.
- **FR-006**: BBT overlay (line, right axis, `bbt: number`) MUST be toggleable on/off and MUST NOT connect across days with no recorded BBT.
- **FR-007**: Intercourse overlay (day markers) MUST be toggleable on/off.
- **FR-008**: A cycle selector MUST list cycles newest-first and switch the rendered strip.
- **FR-009**: The view MUST render entirely from the store (`useAppStore` — cycles, dayRecords, output) and MUST NOT write anything.
- **FR-010**: Missing-data degradation is required: day segments and overlays must handle absent monitor/mucus/BBT/intercourse values without errors or phantom marks; empty store shows an empty-state with a path to start a cycle.

### Key Entities

- **Cycle** (`cycles` table + `CycleResult` from engine): supplies `day1`, `length`, `fertileWindow`, `peakDay` per cycle; the strip x-axis spans `dayInCycle` 1..length (or last recorded day for an open cycle).
- **DayRecord** (`dayRecords` table): supplies per-day `monitor`, `mucus`, `bbt`, `intercourse` for the strip + overlays.
- **Settings**: `algorithmEnabled` gates the window band (FR-004); no other settings affect this view.
- **EngineOutput** (`store.output`): supplies `fertileWindow` + per-day `DayResult` (`status`, `source: 'confirmed' | 'predicted'`) for the band.

## Success Criteria

### Measurable Outcomes

- **SC-001**: For a seeded cycle (fixture with hands-computed expectations), the rendered strip day count, reading-band positions, and fertile-window band match the fixture exactly (asserted in component tests).
- **SC-002**: `confirmed` vs `predicted` window rendering is visually distinguishable at a glance (solid vs dashed), verified by an assertion on the component's CSS/testid.
- **SC-003**: With `algorithmEnabled: false`, no fertile-window band renders but the readings strip does.
- **SC-004**: With an empty store, the view renders an empty-state and no console errors (covered by a component test).
- **SC-005**: `pnpm test` (incl. new), `pnpm lint`, `pnpm build` all green; README status line → Milestone 7 next.

## Edge Cases

- Open cycle (no `closedAt`): strip spans through the last recorded day, not a fixed length.
- Cycle with no Peak at all: window band still renders from `begin` to whatever `end` rule fired (`none` → hmm, band may be begin-only with no end).
- Day with `monitor: 'none'` (or unset): no reading band for that segment — but day still occupies its slot (no collapsing).
- BBT `null`/blank days: rendered line must gap across them, never interpolate a bogus value.
- Very short (21-day) and very long (42-day) cycles: strip must not overflow/break its container.
- No cycles: empty-state with a call-to-action to the Today view.
- Two cycles with identical `dayInCycle` sets differ only by readings: selector is by cycle, strip is per cycle — no cross-contamination.

## Assumptions

- Monitor band colors reuse the calendar's established mapping (sky@Low / amber@High / violet@Peak) so the app keeps one visual vocabulary; if the CBPM spec (Low subtle / High green / Peak gray) is preferred, that is a sticker decision for plan review — pick one and apply it consistently app-wide.
- Recharts remains the charting dependency (locked in the stack); if the strip proves awkward with Recharts, propose the minimal alternative explicitly (constitution principle V) rather than silently adding a dependency.
- Read-only view: no edits from the chart (edits stay in Today's quick-entry / calendar dialog).
- The view is lazy-mounting and mobile-first; the strip fits a portrait phone width by scrolling horizontally if needed.
- This feature completes Milestone 6; History/Stats remains the next feature after this one.