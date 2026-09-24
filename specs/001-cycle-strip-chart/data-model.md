# Data Model — Cycle Strip Chart

> **No schema changes in this feature.** The cycle-chart view is strictly read-only (FR-009): it consumes five existing store emissions and derives an in-memory read-side aggregate (`StripModel`) at render time. Everything here documents *what is consumed* and the *derived aggregate's shape*, not new persisted state.

All persisted entities are owned by `core/store/entities.ts` and hydrated by `useAppStore` (Dexie/IndexedDB). Sync metadata (`version/synced/createdAt/updatedAt`) rides along on every row (constitution II) but is irrelevant to the view.

## 1. Persisted entities consumed

### Cycle — `CycleEntity`
| field | type | use in strip |
|---|---|---|
| `id` | string (UUID) | route param + join key to `DayRecordEntity.cycleId`; band/selector key |
| `cycleNo` | number | selector label "Cycle N" |
| `day1` | `DateKey` | cycle-day algebra via `core/dateKeys.dayInCycle`; x-axis origin day 1 |
| `closedAt` | `DateKey \| null` | open-cycle span decision + "(open)" marker |
| `notes` | string | unused |

### DayRecord — `DayRecordEntity`
| field | type | use in strip |
|---|---|---|
| `id` | string (UUID) | (SyncFuture-proofing; unused) |
| `cycleId` | string | join to `CycleEntity.id` |
| `date` | `DateKey` | day-of-week/tooltip label |
| `dayInCycle` | number | x-coordinate (the strip's only axis) |
| `monitor` | `'none'\|'low'\|'high'\|'peak'` (optional) | band segment color: none ⇒ faint track |
| `mucus` | `'none'\|'low'\|'high'\|'peak'` (optional) | mucus overlay point (D5) |
| `bbt` | `number \| null` (optional) | BBT line point; null/undefined ⇒ gap (D4) |
| `intercourse` | `boolean` (optional) | intercourse overlay marker (D5) |
| `bloodFlow`, `intercourseTime`, `symptoms`, `pregnancyTest`, `notes` | — | **unused** by this view |

### Settings — `SettingsEntity`
Only **`algorithmEnabled: boolean`** is read. `false` ⇒ the view renders raw readings/overlays only, no fertile-window band (FR-004, constitution I). All other settings (`goal`, `postPeakDays`, `historyWindow`, `theme`, …) do not affect the strip.

### EngineOutput (`store.output`) — from `core/engine/engineSdk.ts`
| piece | produced by | use in strip |
|---|---|---|
| `cycles: CycleResult[]` | `computeAll` | per-cycle `CycleResult` looked up via `core/store/selectors.cycleResultsByCycleId` |
| `CycleResult.fertileWindow` | engine | band coordinates + begin/end rule labels |
| `CycleResult.length` | engine | closed-cycle x-span; null while open |
| `CycleResult.peakDay` / `peakSource` | engine | "no Peak yet" legend nuance |
| `DayResult[]` (per day) | engine | `status`/`source` derivations in `StripModel` |
| `forecast` / `warnings` | engine | **unused** by this view |

Source-data relationship: `CycleEntity 1─n DayRecordEntity`, joined on `cycleId`; `CycleResult` joins to `CycleEntity.id` via `cycleId`. All three live in the store snapshot — the view never queries Dexie directly.

## 2. Read-side aggregate: `StripModel`

Pure, derived at render time in `src/features/cycle-chart/lib.ts` (like `calendar/grid.ts` for the calendar). **Never persisted** (constitution I: derived-at-read-time).

```ts
interface StripDay {
  day: number                      // dayInCycle, 1..span — the numeric x
  date: DateKey
  monitor?: MonitorReading         // undefined | 'none' | 'low' | 'high' | 'peak'
  mucus?: MucusLevel
  bbt: number | null               // null = gap in the BBT line
  intercourse: boolean
  status: DayStatus | null         // from CycleResult.days, null if engine absent
  source: 'confirmed' | 'predicted' // from CycleResult.days
}

interface StripWindow {
  begin: number                    // FertileWindow.begin
  end: number | null               // FertileWindow.end (null => pending end)
  source: 'confirmed' | 'predicted' // beginRule === 'first-high-or-peak' ? confirmed : predicted
  beginRule: BeginRule
  endRule: EndRule
}

interface StripModel {
  cycleId: string
  cycleNo: number
  day1: DateKey
  open: boolean                     // closedAt === null
  span: number                      // closed: length; open: max record dayInCycle, min 1
  days: StripDay[]                  // one per 1..span, sparse fields optional
  window: StripWindow | null        // null when algorithmEnabled === false
}
```

Build signature: `buildStripModel(cycle: CycleEntity, result: CycleResult | undefined, records: DayRecordEntity[], algorithmEnabled: boolean): StripModel`.

Derivation rules (the contract the tests pin down):
1. **Span**: `result?.length ?? max(dayInCycle of records, 1)` for open cycles; closed cycles use `result.length`. Records outside the computed span are ignored (belt-and-suspenders).
2. **Days**: built 1..span, each from the record whose `dayInCycle` matches; overlays map directly from that record's `mucus`/`bbt`/`intercourse`.
3. **Per-day status/source**: copied from `result.days` (engine `DayResult`) when present; `null` otherwise (e.g. open beyond current data). No status re-computation in the view.
4. **Window**: `null` iff `algorithmEnabled === false` or no `result`. Otherwise `{ begin, end, beginRule, endRule }` from `FertileWindow`, plus `source` per the confirmed/predicted rule above.
5. **Overlay series** (for charting):
   - `bbtSeries(days) → { day, bbt }[]` — only days with `bbt != null`;
   - `mucusSeries(days) → { day, level }[]` — only days with `mucus` set (incl. 'none' as reported by the user);
   - `intercourseSeries(days) → { day }[]` — only days with `intercourse === true`.

## 3. Validation / invariant rules mapped from requirements

| Rule | Source | How enforced |
|---|---|---|
| Watch out: band only when enabled | FR-004 / constitution I | `window: null` in `StripModel`; view renders no `ReferenceArea` |
| Day slot never collapses | FR-010 + Edge Case | `days` always spans 1..span; `monitor` absent ⇒ faint track, not removed |
| BBT gap, never interpolation | FR-006 | `bbtSeries` drops nulls; `Line.connectNulls=false` (recharts default) |
| No computed-window write | FR-009 / constitution I | No store method called anywhere in `cycle-chart/*` |
| One segment per cycle day | FR-001/FR-002 | `days` length === `span`; band `shape` renders exactly one rect per day |
| Cycle selector newest-first | FR-008 | selector options ordered by descending index of store `cycles` (store is oldest→newest) |
| Out-of-band cycle safety | AGENTS.md domain | View renders any cycle; band math is engine-driven; no 21–42 enforcement in the view (engine `warnings` untouched here) |

## 4. State transitions

None. The view performs zero writes; the aggregate is re-derived on every store change (Zustand selector subscription + recompute-on-write already central).

## 5. What is *not* in the data model (deliberately)

- No `StripModel` table, no cached chart DB, no persisted chart config.
- No route/query state (selection is the URL param `:cycleId` only).
- Overlay toggle state is ephemeral React state in the view (resets on navigation — acceptable for MVP; persisted-preference is a post-MVP Settings item).