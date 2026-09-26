# Milestone 2 — Marquette Engine (Pure TS) + Table-Driven Tests

The heart of the project. A framework-agnostic algorithm module that computes the fertile window per the current Marquette Institute protocols, plus a forecasting module. All pure TypeScript — no React, no Dexie, no browser APIs, no enums (`erasableSyntaxOnly`), no `any` (strict).

> Scope rule: all computed statuses are **derived at read time** from raw records, never stored. The engine recomputes on every data change (store calls it on write).

---

## 1. Files

```
src/core/engine/
  types.ts            # domain types (single source of truth for the store layer too)
  dateUtils.ts        # DateKey helpers (parse/diff/add — pure, UTC-based)
  marquette.ts        # computeCycle(): fertile-window rules per cycle
  predict.ts          # cycle stats + next-period/fertile-window forecast
  engineSdk.ts        # computeAll() orchestration: sort cycles, chain history, warnings
  __tests__/
    marquette.test.ts # table-driven rule tests
    predict.test.ts   # stats + forecast tests
    smoke.engine.test.ts (exists)
```

**TypeScript constraints:** `verbatimModuleSyntax` → use `import type` for type-only imports. No `enum`, no `namespace` (erasableSyntaxOnly). Pure functions, no classes needed.

---

## 2. Types (`types.ts`)

```ts
export type MonitorReading = "none" | "low" | "high" | "peak";
export type MucusLevel = "none" | "low" | "high" | "peak";
export type BloodFlow = "none" | "light" | "medium" | "heavy";
export type Goal = "avoid-pregnancy" | "achieve-pregnancy" | "track-only";
export type Theme = "light" | "dark" | "system";
export type DateKey = string; // 'YYYY-MM-DD', UTC
export type PregnancyResult = "negative" | "positive";
```

- `Settings { goal; postPeakDays: number /* default 4 */; historyWindow: number /* default 6 */ }` (only fields the engine needs; UI/theme handled by store).
- Inputs (structural — the store's Dexie records contain extra fields like `id`, `synced`; they satisfy these shapes directly):
  - `CycleInput { id; day1: DateKey; closedAt?: DateKey | null; notes? }` — cycleNo is NOT an input: the engine assigns numbers by sorting `day1` (idempotent, order-proof).
  - `DayRecordInput { id; cycleId; date: DateKey; dayInCycle: number; monitor?; mucus?; bloodFlow?; intercourse?: boolean; intercourseTime?; bbt?: number | null; symptoms?: string[]; pregnancyTest?: PregnancyResult; notes? }` — all optional except identifiers/dayInCycle.
- Derived (`DayStatus`, `BeginRule`, `EndRule`, `FertileWindow`, `CycleResult`, `Forecast`, `EngineWarning`, `DayResult`):

```ts
export type DayStatus = "pre-fertile" | "fertile" | "post-peak" | "post-calendar";
export type BeginRule = "calendar-day-6" | "calendar-earliest-peak-minus-6" | "first-high-or-peak";
export type EndRule = "current-peak-plus-n" | "historic-peak-plus-n" | "earliest-end" | "none";
export interface FertileWindow {
  begin: number;
  end: number | null;
  beginRule: BeginRule;
  endRule: EndRule;
}
export interface DayResult {
  day: number;
  date: DateKey;
  status: DayStatus;
  source: "confirmed" | "predicted";
}
export interface CycleResult {
  cycleId;
  cycleNo;
  day1;
  length: number | null; // null while open
  peakDay: number | null; // latest user-entered monitor peak
  peakSource: "monitor" | "mucus" | "both" | "none";
  fertileWindow: FertileWindow;
  days: DayResult[]; // one per recorded/day present
}
export type EngineWarning =
  { kind: "cycle-out-of-band"; cycleNo; length } | { kind: "no-peak-end"; cycleNo };
```

**Rule semantics** (from AGENTS.md):

1. **Peak day** = max(day of last monitor `peak`, day of last mucus `peak`); both count, whichever later. `peakSource` reflects which marker(s).
2. **Begin**:
   - cycleNo 1–6 → `calendar-day-6`: begin = 6.
   - Any first monitor `high` or `peak` on day d → begin = min(begin, d), `beginRule: 'first-high-or-peak'` when it wins.
   - cycleNo ≥ 7 → calendar begin = (earliest peakDay of the previous `historyWindow` cycles) − 6, defaulting earliest = 12 when history lacks peaks (yields day 6). Combined with the first-high rule via min.
3. **End** (inclusive last day):
   - Peak known, cycles 1–6: end = peakDay + `postPeakDays` (`current-peak-plus-n`); default 4 ⇒ fertile through P+4, first assumed Low at P+5.
   - Peak known, cycleNo ≥ 7: end = min(current end, historic end) — "whichever ends first"; `endRule` records the winner (`earliest-end` when historic is earlier, `current-peak-plus-n` when current wins).
   - No peak, cycleNo ≥ 7: fallback end = latest historic peak + `postPeakDays` (`historic-peak-plus-n`).
   - No peak, cyclesNo 1–6: `end: null`, `endRule: 'none'` (+ warning `no-peak-end`).
4. **Statuses per day** (only for recorded days): day < begin → `pre-fertile`; begin..end → `fertile`; end < day → `post-peak` if peak known else `post-calendar`.
5. **Warnings**: cycle length outside 21–42 and ≥2 such cycles totally → `cycle-out-of-band` (per protocol: consult teacher).

- `postPeakDays` is configurable (default 4); ramp formula day-INCLUSIVE: fertile = begin … peak+postDays. Evidence is monitor-only: mucus is stored/displayed but never Peak, begin, or end evidence, and records with `dataOrigin: 'inferred'` are excluded from all evidence rules.

---

## 3. algorithm operations (`marquette.ts`)

`computeCycle(cycle: CycleInput, records: DayRecordInput[], settings: Settings, history: CycleHistory): CycleResult`

```ts
export interface CycleHistory {
  peaksByCycle: (number | null)[]; // previous cycles, oldest → newest, last N kept
}
```

- Sorts records by dayInCycle, derives `days`.
- computes window per rules above; emits warnings.
- `predict.ts`: `computePredictions(cycles: CycleResult[], settings): Forecast` + `cycleLengthStats(cycles)`. Mean / median / std / min / max of closed lengths, mean & range of peak days.

Forecast — all labeled predicted:

- `expectedPeriodStart`: for the most recent cycle (open or closed): `day1 + meanLength` (round), ± `earliest = day1 + minLen`, `latest = day1 + maxLen`.
- `nextFertileWindow`: `beginDate = day1 + (earliestPeak − 6 − 1)` … `endDate = day1 + (latestPeak + post) − 1` over the last `window` cycles (calendar rule).
- `basedOnCycles: n`.

---

## 4. Test matrix (table-driven, in `(marquette.test.ts`)

Builder helpers: `cy(id, day1, closedAt?)`, `rec(cycleId, day, ovr?)`, `sett(ovr?)`.

| #   | Scenario                                                    | Expect                                                      |
| --- | ----------------------------------------------------------- | ----------------------------------------------------------- |
| 1   | First cycle, Peak day 14                                    | begin 6 (`calendar-day-6`), end 17, `post-peak` from 18     |
| 2   | First cycle, High day 3 (earlier than 6)                    | begin 3 (`first-high-or-peak`)                              |
| 3   | First cycle, peak on day 6                                  | begin 6                                                     |
| 4   | Monitor peak d12, mucus peak d14                            | peakDay 14, `both`, end 17                                  |
| 5   | Muc peak later                                              | peakDay = mucus day; end shifts                             |
| 6   | Mucus-only peak (no monitor)                                | peak counts, `mucus` source                                 |
| 7   | No peak, cycle 1                                            | end null, `none`, `no-peak-end` warning                     |
| 8   | Cycle 9, history peaks [14,16,12,15,13,14]                  | calendar begin = 12−6=6, unless first High d4 → begin 4     |
| 9   | Cycle 9, current peak d20, historic latest 16+3             | end = min(20+3, 19) → 19 (`earliest-end`, historic wins)    |
| 10  | Cycle 9, current peak d10, historic latest 16               | end = min(13, 19) → 13 (current wins)                       |
| 11  | No peak cycle ≥7 with history                               | fallback end = latest+3                                     |
| 12  | Mixed high/peak repeats                                     | last peak used; multiple highs don't change begin after set |
| 13  | 21-day cycle ×2 out of band                                 | 2 out-of-band warnings                                      |
| 14  | Cycle length = next day difference (open cycle length null) | 23                                                          |
| 15  | postPeakDays 2 (settings)                                   | end = peak+2                                                |
| 16  | Records out of order                                        | same result as ordered input                                |
| 17  | Day statuses full sequence                                  | pre F: 1–5, F 6..17, post 18+                               |

`predict.test.ts`:

- mean/median/std exact for fixture [26,28,27,30,29] → 28 median, 28 mean.
- forecast date arithmetic: startDay giv Day1 '2026-01-05' + mean 28 → expected date check; earliest/latest range.
- next fertile window with peaks [13,15,12] in last cycles: begin = day1 + (12−6−1) → verify date offset & end = day1 + (15+3−1) hmm keep exact math in tests.
- no cycles / single cycle → graceful nulls.

---

## 5. Acceptance / Definition of Done rows

- [x] Engine compiles with `tsc -b` (strict)
- [x] `pnpm test` green (engine suites + smoke — 24 tests)
- [x] zero framework/IDB imports inside `src/core/engine/*`
- [x] README "Status" → Milestone 2 complete
