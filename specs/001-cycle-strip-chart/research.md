# Research — Cycle Strip Chart (Milestone 6)

Phase 0 output for `specs/001-cycle-strip-chart`. Every decision below resolves a `NEEDS CLARIFICATION` from the Technical Context / spec Assumptions. Format per decision: **Decision / Rationale / Alternatives considered**.

Verification basis: the installed package source (`node_modules/recharts/types/`) was inspected directly for the Recharts v3 API surface (exports + `Line.connectNulls` default), and the existing codebase was read for conventions (calendar test pattern, store selectors, `core/cycleStatus.dayInfo`, shadcn kit contents). No web research was needed — this is a recharts-API-fit question and the package is vendored.

---

## D1. Recharts strip rendering — how to draw the CBPM-style band strip

**Decision**: `ComposedChart` with a **numeric X-axis** (`XAxis type="number", domain [0.5, N+0.5]`) as the single alignment source for everything: monitor bands via `Bar` (constant value, fixed `barSize`, custom `shape` per segment for color + test hooks), overlays via `Scatter`/`Line` keyed by the same numeric day coordinate, and the fertile window via `ReferenceArea x1/x2`.

**Rationale**:
- A numeric axis lets **all** layers (Bar, Line, 2× Scatter, ReferenceArea) share one coordinate system keyed on the day number — nothing to re-align, no category/axis-id juggling.
- `Bar` rectangles give the spec's "one segment per cycle day" forced-scatter/strip look (FR-002) with deterministic equal widths (`barSize`), and a custom `shape` renderer can stamp `data-testid="day-band" data-day data-monitor` for component tests (SC-001 relies on this).
- Verified in the vendored package: `ComposedChart`, `Bar`, `Cell`, `Scatter`, `ReferenceArea`, numeric axes, and dual `YAxis` (`yAxisId`) all exist in recharts 3.10.1.

**Alternatives considered**:
- *Category X-axis + Bar with Cells* — simpler bar placement but overlay `Line`/`Scatter` then need a parallel numeric scale or label-keyed points, and `ReferenceArea` wants coordinates; dual-axis alignment becomes fragile. **Rejected**.
- *Literal `Scatter` with rectangular `shape` points ("forced-scatter")* — faithful to the CBPM scatter look but widths are automatic, gaps can look like missing days, and per-day test hooks are weaker. **Rejected**; the banded Bar look is the strip chart's primary goal.
- *Replacing Recharts* — explicitly out of scope per spec Assumptions / constitution V; Recharts is locked and proven sufficient above.

---

## D2. Fertile-window band — how to draw confirmed vs predicted (FR-003, FR-004)

**Decision**: A single `ReferenceArea` spanning `x1 = begin` to `x2 = end` (inclusive, band-extended ±0.5), translucent rose fill behind the strip. Its **source** is derived once at the window level: `confirmed` when the window was opened by an observed first High/Peak (`beginRule === 'first-high-or-peak'`), else `predicted`. Confirmed ⇒ solid border/fill; predicted ⇒ dashed border (`strokeDasharray`) — mirroring the Calendar's confirmed-vs-predicted language. When `settings.algorithmEnabled === false`, no `ReferenceArea` is rendered at all.

**Rationale**:
- `core/cycleStatus.dayInfo` already classifies in-window days as `confirmed` exactly when `beginRule === 'first-high-or-peak'` — the window-level rule reuses the engine's established logic with zero new interpretation (constitution I).
- One band = one testable decision for SC-002, matching the spec's "band (solid = confirmed, dashed = predicted)" framing.
- FR-004 is naturally satisfied by `algorithmEnabled ? band : null` in the view, keeping derivation in `lib.ts`.

**Alternatives considered**:
- *Per-day band style* (split the shade per `DayResult.source`, calendar-style) — more precise but yields many tiny slivers and a visually noisy band; also the calendar already shows per-day nuance, so the strip benefits from a coarser read. **Rejected for MVP**; noted as a possible post-MVP refinement.
- *Classify by end rule* (Peak-based) — a confirmed-ended window still implies confident maturity; but a calendar-beginning with no confirmed opener is the tentativeness signal users care about. **Rejected**.

---

## D3. Monitor band colors (spec Assumption: sticker-level decision, apply app-wide)

**Decision**: Keep the calendar's established mapping and apply it to the strip: **Low = sky**, **High = amber**, **Peak = violet** (the exact tones used in `day-cell.tsx`). `monitor: 'none'`/unset days render a faint neutral track so the strip reads continuous with no collapsing (spec Edge Cases).

**Rationale**: "One visual vocabulary app-wide" — reusing the exact tones the Calendar already teaches costs nothing and avoids a second legend to un-learn. Upgrading only the strip to CBPM's Low-subtle/High-green/Peak-gray would make the two views contradict each other in the same app.

**Alternatives considered**:
- *CBPM spec colors* (Low subtle / High green / Peak gray) — more faithful to the physical monitor but creates two incompatible vocabularies in the same product; would force a Calendar re-skin too. **Rejected** (flag to user if they prefer it; it's now a one-line palette swap in two files).
- *Reuse Today's `STATUS_TONES`* — those classify *status*, not monitor readings; wrong axis. **Rejected**.

---

## D4. BBT overlay — gaps across missing days (FR-006)

**Decision**: `Line` on a dedicated right `YAxis` (`yAxisId="bbt"`), `connectNulls={false}` (the Recharts 3 default, verified in the vendored `Line.d.ts`), plotted at `x = dayNumber, y = bbt`. Days with `bbt` undefined/null produce a gap — never an interpolation. The right axis + its ticks render only while the overlay is on (hide with the left axis otherwise for a clean strip).

**Rationale**: The overlay's whole purpose is "missing days render gaps rather than connecting across them" — explicit in FR-006. Right-axis placement keeps BBT's absolute scale off the monitor band's frame.

**Alternatives considered**: `connectNulls={true}` with point extrapolation — directly violates FR-006. **Rejected** without discussion.

---

## D5. Mucus & intercourse overlays (FR-005, FR-007)

**Decision**: Two `Scatter` series aligned to the numeric day axis:
- **Mucus** — one point per day with `mucus` set (all of none/low/high/peak), marker color by level in a **fuchsia ramp** (distinct from the monitor band's sky/amber/violet).
- **Intercourse** — one point per day where `intercourse === true`, teal marker (matches the Calendar's teal dot).

Both keyed by `dayInCycle` on the shared numeric X-axis; toggle off removes the series from the chart (props-driven).

**Rationale**: `Scatter` on a numeric axis is the lowest-friction Recharts way to place exact day markers; each overlay toggles independently per FR-005/FR-007. Colors avoid clashing with monitor bands; teal mirrors the established calendar dot.

**Alternatives considered**: A second `Bar` series for mucus levels — reads as an extra band competing with the monitor strip. **Rejected**. Marker characters instead of colors — weaker at a glance. **Rejected**.

---

## D6. Cycle selector & routing (FR-008, US-3)

**Decision**: The route already exists (`/cycle/:cycleId` in `src/app/router.tsx`) — drive selection through **navigation**. The view reads `:cycleId`:
- valid → render that cycle;
- absent/invalid → fall back to the latest cycle (newest first);
- no cycles at all → empty-state CTA to the Today view (spec US-3, FR-010).

The selector is the existing shadcn `Select`, options newest-first, labeled `Cycle N · starts MMM D · 29 days` (+ `(open)` where `closedAt` is null). Switching options calls `useNavigate`.

**Rationale**: Deep-linkable, back-button-friendly, zero local-state divergence, and the router was scaffolded for exactly this in M1. Fallback-to-latest means `/cycle` and `/cycle/bogus` still show something useful.

**Alternatives considered**: Local `useState` for the selected id — dead state that ignores the URL and breaks deep links. **Rejected**.

---

## D7. Open cycle & no-Peak cycles — x-axis span (spec Edge Cases)

**Decision**: X-axis span = **closed cycle: `length`** (engine `CycleResult.length`); **open cycle: the largest `dayInCycle` among its records, min 1** (so the day-1 menses slot always shows). No-Peak cycles: the window band renders from `begin` to whatever `end` fired; when the engine reports `end === null` (`endRule 'none'`), the band extends to the last day and the legend notes "end pending (no Peak yet)".

**Rationale**: Matches the spec exactly ("strip spans through the last recorded day" for open cycles; no-Peak "band may be begin-only with no end"). All rules are already computed by the engine — the view only maps them to chart coordinates.

**Alternatives considered**: Fixed 42-day canvas for open cycles — wastes space and misreads "current position". **Rejected**.

---

## D8. Missing-data degradation & horizontal scroll (FR-010, FR-002, mobile)

**Decision**: The chart renders in an `overflow-x-auto` scroll container with a `minWidth` proportional to cycle length (~`units * 28px`, capped 42) and fixed responsive height; `ResponsiveContainer` fills the width up to the container max. Days with no monitor value get a transparent/faint track segment (slot preserved, no collapse); overlays simply omit missing points. With an empty store, the view renders the empty-state (no chart, no Recharts mount → no console errors; SC-004).

**Rationale**: A 42-day cycle cannot fit a phone width; scroll beats squish. All data-degradation behaviors fall out naturally from the numeric model + filtered series.

**Alternatives considered**: Tiny fixed-width day-units that fit any phone — unreadable labels at 42 days, and "fitting" contradicts FR-010's no-overflow/no-break requirement. **Rejected**.

---

## D9. Testing strategy (US stories' Independent Tests, SC-001…004)

**Decision**: Two test files + no engine change:
- `__tests__/lib.test.ts` — table-driven unit tests of the pure `lib.ts` (`buildStripModel` incl. algorithm gating, `mucusSeries`/`intercourseSeries`/`bbtSeries`, window source classification).
- `__tests__/cycle-chart.test.tsx` — jsdom component tests with the `fake-indexeddb/auto` singleton pattern from `calendar.test.tsx`: seed a cycle via `setNewCycle` + `addDayRecord`, render `CycleChartView`, assert on (a) custom shape `rect[data-testid="day-band"][data-day][data-monitor]` for count/bands, (b) an **sr-only** `data-testid="fertile-window-band"` element carrying `data-source`/`data-begin`/`data-end` for the ReferenceArea (Recharts SVG internals are not stable text hooks), (c) overlay toggle add/remove, (d) algorithm-off ⇒ no band, (e) empty store ⇒ empty-state, (f) selector swap.

**Rationale**: The calendar PR proved this fixture/infra approach; the sr-only element sidesteps fighting recharts' SVG output while staying accessible. Pure helpers keep lib tests cheap.

**Alternatives considered**: Asserting on recharts SVG classes (`recharts-reference-area`) — brittle across Recharts point releases. **Rejected** in favor of the sr-only contract.

---

## D10. Lazy mounting (spec Assumption)

**Decision**: Satisfied by React Router semantics — the matched route component mounts only when `/cycle/:cycleId` is active; no code-splitting `React.lazy` pass is added in M6.

**Rationale**: The app is a tiny offline PWA at hobby scale; eager route imports are the existing convention (router.tsx) and code-splitting adds Suspense plumbing for zero measurable gain now.

**Alternatives considered**: `React.lazy` + `Suspense` per-view; deferred uniformly as a post-MVP perf pass if the PWA grows. **Rejected for MVP**.

---

## Consolidated dependency check (constitution V)

No new dependencies. Everything comes from the locked stack: Recharts (charting), shadcn/ui kit (`Select`, `Button`) already vendored in `src/components/ui`, `date-fns`/`core/dateKeys` for labels, Vitest + @testing-library + fake-indexeddb for tests.