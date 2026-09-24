# Contract — Strip Model (pure derivation layer)

**Module**: `src/features/cycle-chart/lib.ts`
**Layered boundary**: the only place cycle-chart turns store data into chart data. Pure functions — no React, no Recharts, no Dexie imports (browser-safe; constitutional spirit of III applied at feature scope). Fully unit-testable.

Imports allowed: types from `@/core/engine/types`, `DayRecordEntity`/`CycleEntity` from `@/core/store/entities` (`import type` only), `CycleResult`/`EngineOutput` types from `@/core/engine/engineSdk`. No write-path store access.

---

## 1. Build entry point

```ts
buildStripModel(
  cycle: CycleEntity,
  result: CycleResult | undefined,
  records: DayRecordEntity[],
  algorithmEnabled: boolean,
): StripModel
```

Preconditions implied by callers (validated by callers, not re-validated here): `result` is the `CycleResult` whose `cycleId === cycle.id` (caller uses `cycleResultsByCycleId`), and `records` are already filtered to `cycleId === cycle.id` (caller filters; the function tolerates strays by dayInCycle).

Postconditions — invariants every caller may rely on:
1. `model.days.length === model.span` and `days[d-1].day === d` for `d` in `1..span`.
2. `span` = `result.length` when provided and `closedAt` non-null fallback; else `max(1, maxDayInCycle)` for open cycles. Closed cycle ignores stray records beyond `length`.
3. `days[d-1].status`/`source` are the verbatim engine `DayResult` values for that day, or `null` when no engine day exists.
4. `window === null` **iff** (`algorithmEnabled === false` XOR `result` undefined).
   - `algorithmEnabled === false` ⇒ `window === null` (constituent FR-004, constitution I).
   - `result === undefined` ⇒ `window === null` (nothing to derive from).
   - Otherwise `window` has `begin`/`end` copied from `result.fertileWindow` verbatim and `end` may be `null`.
5. `window.source === 'confirmed'` iff `beginRule === 'first-high-or-peak'`; everything else ⇒ `'predicted'` (mirrors `core/cycleStatus.dayInfo`).
6. `open === (cycle.closedAt === null)`.

## 2. Series extractors (overlay inputs)

```ts
bbtSeries(days: StripDay[]): { day: number; bbt: number }[]
mucusSeries(days: StripDay[]): { day: number; level: 'none' | 'low' | 'high' | 'peak' }[]
intercourseSeries(days: StripDay[]): { day: number }[]
```

Invariants:
- `bbtSeries` includes a day **iff** `days[d-1].bbt != null`. Null days must therefore gap in the chart layer.
- `mucusSeries` includes a day **iff** `days[d-1].mucus !== undefined` (a stored `'none'` is still reported — it is user-signaled data).
- `intercourseSeries` includes a day **iff** `days[d-1].intercourse === true`.
- Output order follows `days` ascending; empty series are `[]`, never `undefined`.

## 3. Type surface (exported)

```ts
export interface StripDay { day: number; date: DateKey; monitor?: MonitorReading; mucus?: MucusLevel; bbt: number | null; intercourse: boolean; status: DayStatus | null; source: 'confirmed' | 'predicted' }
export interface StripWindow { begin: number; end: number | null; source: 'confirmed' | 'predicted'; beginRule: BeginRule; endRule: EndRule }
export interface StripModel { cycleId: string; cycleNo: number; day1: DateKey; open: boolean; span: number; days: StripDay[]; window: StripWindow | null }
```

Type-only fixtures exported for tests: `buildStripModel` is the only function contract the component layer depends on; the series extractors are the overlay-data contract.

## 4. What this contract forbids

- **No Marquette logic here**: the window is copied from engine output verbatim; the confirmed/predicted classification reuses `core/cycleStatus.dayInfo`'s established `beginRule` rule. This layer must never compute a fertile window itself (constitution I).
- Mutating inputs: all returns are fresh arrays/objects.
- Importing anything from `recharts`, `react`, `dexie`, `fake-indexeddb`, or the browser DOM.
- Returning `null`/`undefined` where `[]` is specified (stable charting inputs).