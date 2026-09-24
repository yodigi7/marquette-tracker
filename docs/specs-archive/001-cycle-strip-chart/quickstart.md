# Quickstart — Cycle Strip Chart validation guide

How to prove the feature works end-to-end. This is a run/verify guide — implementation details live in `plan.md`, shapes in `data-model.md`, contracts in `contracts/`.

## Prerequisites

- Dev environment already set up (see README): pnpm, Node matching the repo.
- Milestones 1–5 merged (engine, store, Today, Calendar). The git working tree at baseline.
- `src/features/cycle-chart/index.tsx` is still the `FeaturePlaceholder` until implementation lands.

## Setup

```bash
pnpm install
pnpm test            # baseline: must stay green before touching anything (58 tests)
```

## Automated validation (primary gate)

```bash
pnpm test
pnpm lint
pnpm build
```

All three must be green after the feature lands (SC-005). The full suite includes the new files:

| file | what it proves |
|---|---|
| `src/features/cycle-chart/__tests__/lib.test.ts` | `buildStripModel` invariants (span, day count, status/source copy, `window === null` when algorithm off); `bbtSeries`/`mucusSeries`/`intercourseSeries` gaps + empty arrays |
| `src/features/cycle-chart/__tests__/cycle-chart.test.tsx` | component rendering against the test-hook contract ([contracts/cycle-strip-ui.md → §3](contracts/cycle-strip-ui.md)) |

## Component test fixture (hand-computed, no engine reliance)

Fixture contract the component tests seed through the store (graph matches `calendar.test.tsx`):

- **Cycle A** (closed, 28 days): `day1`, menses on day 1, `monitor: high` on day 8, `monitor: peak` on day 14, mucus peak day 14, `bbt` on days 8–15 (gap-free), `intercourse` day 14+4.
- **Cycle B** (open, current): few recorded days, latest `dayInCycle` = e.g. 6.

Expected assertions derived from the contracts:
1. **Day count**: `[data-testid="day-band"]` count === `model.span` (28 for A, 6 for B) — proves one-segment-per-day (FR-001/002).
2. **Bands**: `data-day`/`data-monitor` on each segment; sky/amber/violet classes match `data-monitor` (D3).
3. **Window**: `[data-testid="fertile-window-band"]` present with `data-begin`/`data-end` (calendar-rule predicted for a cycle-1 fixture ⇒ `data-source="predicted"`), dashed style in the SVG (`stroke-dasharray`) — SC-002.
4. **Algorithm off**: after `updateSettings({ algorithmEnabled: false })`, band element absent while day-bands remain — SC-003.
5. **Empty store**: `clearAllData()` ⇒ `[data-testid="cycle-chart-empty"]` + "Start a cycle" link, no console errors — SC-004.
6. **Selector swap**: pick Cycle B ⇒ day-band count becomes 6, band data reflects B — US-3.
7. **Overlays**: toggle BBT on ⇒ `[data-testid="overlay-bbt-point"]` markers with correct `data-day`, and a seeded null-BBT day has no marker (gap); toggle off ⇒ markers gone — US-2. Same trio for mucus/intercourse.

## Manual validation (PWA)

```bash
pnpm dev            # or: pnpm build && pnpm preview (offline check)
```

Demo data auto-seeds on startup (`providers.tsx` → `seedDemoData`, 5 closed cycles + open cycle) — no typing needed.

1. Open *Cycle chart*. The view has no nav link yet (History/Stats is M7), so load it directly: `http://localhost:5173/cycle` (falls back to the newest seeded cycle) — then browse the other cycles with the in-view **Cycle selector**. Confirm: the strip (the row of equal-width day-band columns) reads left→right day 1→N; monitor bands sky/amber/violet; the fertile window shaded behind; **predicted** band dashed.
2. Toggle mucus, BBT (right axis appears, gaps where no temperature), intercourse — each adds/removes its marks while the strip (day-band columns + window band) stays unchanged.
3. FR-004 (algorithm OFF ⇒ no window band) is covered by the automated view test — Settings' "Algorithm" toggle is Milestone 7 and can't be flipflop'ed manually yet. Skip this step.
4. Deep link `/cycle/<id>` for two different seeded ids — each renders its own strip; an invalid id (e.g. `/cycle/bogus`) falls back to the newest cycle.
5. On a phone-width viewport (devtools): strip scrolls horizontally, no vertical overflow; 42-day cycle still legible.
6. A11y sweep: tab through selector + toggles (visible focus), sr-only band text announces the window.
7. `pnpm build && pnpm preview`: reload offline (SW cache) — chart still renders.

## Out of scope (do not validate)

Edits from the chart (entry stays in Today/calendar dialog) — the view must not write (FR-009). History/Stats and Settings full UI are Milestone 7.

## References

- Data consumed: [data-model.md](./data-model.md)
- Pure layer contract: [contracts/strip-model.md](./contracts/strip-model.md)
- UI + test-hook contract: [contracts/cycle-strip-ui.md](./contracts/cycle-strip-ui.md)
- Rendering decisions: [research.md](./research.md) (D1–D10)