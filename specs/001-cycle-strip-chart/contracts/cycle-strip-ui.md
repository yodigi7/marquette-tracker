# Contract — Cycle Strip UI (component + test-hook contract)

**Files**: `src/features/cycle-chart/index.tsx` (view/shell), `src/features/cycle-chart/strip-chart.tsx` (Recharts rendering).
**Read-only**: neither component may call store writes (`addDayRecord`, `removeDayRecord`, `setNewCycle`, `updateSettings`, `clearAllData`). Selection state lives in the URL (`/cycle/:cycleId`) per research D6.

---

## 1. `CycleChartView` (index.tsx)

No props. Consumes the singleton `useAppStore` via selectors, and `useParams`/`useNavigate` from react-router.

**Route contract**: expected mounted at `/cycle/:cycleId` (already wired in `src/app/router.tsx`).
| `:cycleId` state | behavior |
|---|---|
| valid cycle id | render that cycle's strip |
| absent / unknown | fall back to the **newest** cycle |
| no cycles at all | empty-state (no chart mount) |

**View layout** (top → bottom):
1. **Cycle selector** — shadcn `Select`; options newest-first; item label `Cycle N · starts MMM D, YYYY` + ` · 29 days`, with ` (open)` when `closedAt === null`. Changing selection calls `useNavigate` → `/cycle/:id`.
2. **Overlay toggles** — three labelled controls (buttons/switches): Mucus, Temperature (BBT), Intercourse. Toggle updates ephemeral React state passed to `StripChart`. All default **off**.
3. **Legend** — color key for band levels + window band + overlays (mirrors Calendar's legend style).
4. **Strip chart** or **empty-state**.

**Empty-state contract** (FR-010, US-3-2): message "No cycles yet — start one on the Today view" + a `Button asChild` → `Link to="/"` labelled "Start a cycle". Renders no Recharts → no console errors (SC-004).

**Accessibility contract** (existing shadcn norms + per-phase conventions): the selector and toggles are keyboard-operable with visible focus rings (shadcn defaults); the chart region is `aria-label="Cycle chart"`; the window band is conveyed by an sr-only element (below) so screen-reader users get the confirmed/predicted distinction; contrast of band fills works in light and dark themes.

## 2. `StripChart` (strip-chart.tsx) — props contract

```ts
interface StripChartProps {
  model: StripModel
  showMucus: boolean
  showBbt: boolean
  showIntercourse: boolean
}
```

Rendering guarantees (backed by Recharts primitives verified in research D1):
- Numeric X-axis `1..span`, labels = day numbers, `interval={0}`.
- One band rectangle per `day` via `Bar` numeric-placement + custom `shape` (constant y, fixed `barSize`). Fill per level: **none/absent ⇒ faint neutral track; low ⇒ sky; high ⇒ amber; peak ⇒ violet** (research D3).
- `ReferenceArea` for the window when `model.window != null`: x-span `begin..end`, translucent rose, **solid** border when `source==='confirmed'`, `strokeDasharray` (dashed) when `'predicted'` (research D2). Never rendered when `window === null`.
- Mucus overlay: `Scatter` on the shared day axis, fuchsia-ramp markers per level, only when `showMucus`.
- BBT overlay: `Line` on right `YAxis` (`yAxisId`), `connectNulls={false}`, points supplied by `bbtSeries` (built-in gaps), only when `showBbt`. Right axis rendered only while overlay on.
- Intercourse overlay: `Scatter` teal markers, only when `showIntercourse`.
- Scroll: chart wrapped in `overflow-x-auto`; inner `minWidth` ~ `span × 28px` (max 42×) for phone scrolling; no fixed outer height overflow.

## 3. Test hook contract (the app's own "debug" surface)

Stable, documented hooks the component tests assert on (SC-001/002/003/004). These are the only stable test surface — Recharts' internal SVG structure is **not** contracted.

| selector | attributes | meaning |
|---|---|---|
| `[data-testid="day-band"]` | `data-day`, `data-monitor` ('' when none) | one band rect per day; count === `model.span`; monitor drives fill |
| `[data-testid="fertile-window-band"]` (sr-only `<span>`) | `data-begin`, `data-end` (empty when null), `data-source` (`confirmed\|predicted`) | window presence + style driver; absent when `window === null` |
| `[data-testid="overlay-bbt-point"]` | `data-day`, `data-bbt` | per valid BBT point (when overlay on) |
| `[data-testid="overlay-mucus-point"]` | `data-day`, `data-level` | per mucus point (when overlay on) |
| `[data-testid="overlay-intercourse-point"]` | `data-day` | per intercourse day (when overlay on) |
| `[data-testid="cycle-chart-empty"]` | — | empty-state container |
| `[data-testid="cycle-selector"]` | — | the shadcn `Select` trigger |

Panel elements render their overlays through small, test-seeded scatter/line cells only while the matching prop is true — so toggling on/off is directly observable (US-2 tests).

## 4. Behavior rules encoded at the UI layer

1. Window band and `day-band.data-status` are derived **only** from `StripModel`; `window === null` with `algorithmEnabled === false` matches store state (FR-004).
2. Missing monitor days still produce a `day-band` rect (faint track) — count never collapses (FR-010).
3. Day-band and overlay coordinates all use the same numeric x (day number) produced by the series extractors, so bands and overlays always line up.

## 5. Kept conventions

- Implementation uses the existing `cn()` + shadcn/ui kit; no inline `<style>`; Tailwind classes only.
- The sr-only window element doubles as the a11y description: `${label} window from day X to day Y${predicted ? ' (predicted)' : ''}`.