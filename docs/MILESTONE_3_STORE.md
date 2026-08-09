# Milestone 3 — Storage Layer (Dexie) + Zustand Store

Persistence and state for the app. Dexie/IndexedDB is the **single source of truth**; the Zustand store is an in-memory mirror plus an engine-derived cache that recomputes after every write.

> Sync-readiness (AGENTS.md): every entity carries `version`, `synced`, `createdAt`, `updatedAt`. UUIDs from `crypto.randomUUID()`.

---

## 1. Files

```
src/core/store/
  entities.ts        # CycleEntity, DayRecordEntity, SettingsEntity (Dexie rows)
  db.ts              # Dexie instance + schema/migrations
  repositories.ts    # thin typed CRUD over db tables (uuid, version, synced, timestamps)
  useAppStore.ts     # Zustand store: state + actions + engine recompute
  __tests__/store.test.ts   # fake-indexeddb tests
```

Constraints unchanged: engine stays pure; `store → engine` imports are allowed (one direction), never the reverse.

---

## 2. Entities & Dexie schema (`entities.ts`, `db.ts`, `repositories.ts`)

```ts
interface CycleEntity {           // extends engine CycleInput fields + bookkeeping
  id: string                      // uuid
  day1: DateKey                   // requires
  cycleNo: number
  closedAt: DateKey | null
  notes: string
  version: number; synced: boolean
  createdAt: DateKey; updatedAt: DateKey   // ISO datetime, UTC
}
interface CycleRecordEntity extends DayRecordInput { … version, synced, createdAt, updatedAt }
interface SettingsEntity { key: 'main'; goal: Goal; algorithmEnabled: boolean; postPeakDays: number; historyWindow: number; theme: Theme; version; synced; updatedAt }
```

`db.ts`:

```ts
const db = new Dexie('marquette-tracker')
db.version(1).stores({
  cycles:    'id, day1, cycleNo',
  dayRecords: 'id, cycleId, date, dayInCycle, [cycleId+date]',
  settings:  'key',
})
db.version(2).stores({ ... })  // migration seam documented; none needed yet
```

Index notes: `[cycleId+date]` compound unique index makes day-record upsert deterministic; `dayInCycle` indexed for cycle-day lookups.

**Repository surface** (all async, all bump `version`, set `synced=false`, timestamps):
- cycles: `createCycle(input): CycleEntity` (assigns `cycleNo` = max+1), `updateCycle(id, patch)`, `listCycles()` (sorted by day1).
- day records: `getByCycle(cycleId)`, `getByDate(cycleId, date)`, `upsert(cycleId, date, patch)` (update existing or add — never two rows per `[cycleId+date]`), `remove(id)`.
- settings: `getSettings(): SettingsEntity` (returns default row when missing), `updateSettings(patch)`.

**Defaults**: `postPeakDays: 3`, `historyWindow: 6`, `algorithmEnabled: true`, `goal: 'track-only'`, `theme: 'system'`.

---

## 3. Zustand store (`useAppStore.ts`)

```ts
interface AppState {
  hydrated: boolean
  cycles: CycleEntity[]
  dayRecords: CycleRecordEntity[]
  settings: SettingsEntity
  output: EngineOutput | null            // recent computeAll() result
  hydrate(): Promise<void>               // load all + compute; last-writer-wins for settings
  addDayRecord(cycleId, date, patch): Promise<void>
  removeDayRecord(id): Promise<void>
  startNewCycle(day1): Promise<CycleEntity>   // closes open cycle, opens new one
  updateSettings(patch): Promise<void>
  clearAllData(): Promise<void>
}
```

Store ops order: persist → `refresh()` (re-read all tables → `computeAll(cycles, dayRecords, settings)`) → `set`. All writes serial (single state graph; hobby scale — no concurrency concerns).

**startNewCycle(day1)**:
- no cycles yet → create cycleNo 1.
- if the latest cycle is open and `day1 > day1(open)`: set `closedAt = day1 − 1` on the open one, create next cycle `cycleNo = last + 1`.
- `day1 <= latest day1` → no-op (guard against double-taps).

**Derived lookups** (pure helpers exported alongside the store):
- `resultForCycle(output, cycleId)`
- `openCycle(cycles)` — latest without closedAt
- `cycleForDate(cycles, date)` — latest cycle with `day1 <= date`

**algorithmEnabled**: engine still computes (cheap, offline); UI features gate their rendering on `settings.algorithmEnabled` (Milestone 6). Documented, not special-cased in the store.

---

## 4. Providers hydration gate (`src/app/providers.tsx`)

- `useEffect(() => { void useAppStore.getState().hydrate() }, [])`
- render children only when `hydrated === true`, else a minimal splash (centered spinner) — prevents features from flashing empty store.

---

## 5. Test matrix (`store.test.ts`, jsdom + `fake-indexeddb/auto`)

| # | Scenario |
|---|---|
| 1 | hydrate on empty DB → default settings row + no cycles |
| 2 | addDayRecord → row persisted; second call with same date updates (no duplicates) |
| 3 | addDayRecord with monitor `peak` recomputes window end = peak + 3 |
| 4 | startNewCycle closes open cycle (closedAt = day1−1), bumps cycleNo |
| 5 | startNewCycle with truncated start is a no-op for latest open cycle |
| 6 | updateSettings persists; engine recomputes with new postPeakDays |
| 7 | deleteDayRecord removes; output reverts |
| 8 | clearAllData → all tables cleared |
| 9 | hydrate after mutations returns identical rows (persistence round-trip) |
| 10 | two days' observations across cycles land in correct cycle result |

Before each test: `await db.delete()` + fresh store? nie create store via factory or reset via `useAppStore` re-init — simplest: create new Dexie instance per test via `resetDbForTest()`.

---

## 6. Definition of Done

- [x] `pnpm test` green (store suite — 10 tests — + engine suites)
- [x] `pnpm lint` 0 errors; `pnpm build` green
- [x] README status line → Milestone 4 next
- [x] No engine change required