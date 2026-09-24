# Milestone 5 — Calendar View

Month grid showing every day's derived status (menses, monitor readings, fertile-window shading) with predicted vs confirmed windows visually distinct.

## 1. Files

```
src/core/dateKeys.ts          # shared local-calendar helpers
src/core/cycleStatus.ts       # dayInfo(window, peakKnown, day) → { status, source } (single source of truth)
src/features/calendar/
  index.tsx                   # CalendarView: month nav, grid, legend, daily entry
  grid.ts                     # monthGrid(year, month) → 42 dateKeys (Monday-first), month label helpers
  day-cell.tsx                # one day: shading by status, menses dot, monitor dots, forecast ring
  quick-entry.tsx             # shared all-optional daily entry form
  auto-open.ts                # today's-entry eligibility and session marker
  __tests__/calendar.test.tsx # grid, entry, and auto-open component tests
```

Status consumes `core/cycleStatus.dayInfo` and the shared date helpers; Calendar remains responsible for all daily input.

## 2. Behavior spec

**Grid** — 6 weeks × 7 columns, Monday-first. Empty cells outside the month render as blank. Month title "August 2026", ‹ › nav, "Today" reset button.

**Daily entry** — tapping any date up to today opens the shared QuickEntry dialog. Calendar is the only input surface; the first eligible opening of a browser session may open today's dialog automatically when today has no record and its derived cycle has no Peak.

**Per-day resolution** (`resolveDay(cycles, records, output, dateKey)`):
1. `cycleForDate` → null (before first cycle): unshaded.
2. Day beyond a closed cycle's length: unshaded (no data).
3. Otherwise `dayInfo(result.fertileWindow, peak != null, dayInCycle)` → status + source.
4. Forecast overlay: date inside `output.forecast.nextFertileWindow` (and no shading) → dashed rose ring, `predicted`.

**Cell visuals:**
- Fertile: rose bg (solid → confirmed, lighter → predicted)
- Pre-fertile: amber bg · Post-peak: emerald bg · Post-calendar: stone bg
- Menses: red dot under day number (record bloodFlow ≠ none, or the cycle's day 1)
- Monitor: dot(s) in sky@Low / amber@High / violet@Peak ("none" → no dot)
- Today: day number bold + ring

**Legend** below the grid: status chips + menses + monitor dots + forecast note.

## 3. Test matrix

- `grid test`: 2026-08 grid starts Mon 2026-07-27; every cell roundtrips dateKey.
- `cycleStatus.test.ts`: pre/mid/post per dayInfo; predicted-vs-confirmed source matrix.
- Component (`calendar.test.tsx`, jsdom + singleton fake IDB):
  1. cycle seeded with day1 = today-3 (in this month): the 3 status bands appear (amber day, fertile day, average-emerald), menses dot on day 1, High dot on a logged day.
  2. cycle 1–6: day-6 pre-fertile has "predicted" source → dashed style present.
  3. month ‹ › navigation updates title; Today resets to current month.
  4. forecast ring cell exists when forecast window overlaps the month — covered at unit level in `grid.test.ts` (`resolveCell` forecast mapping), since a `forecast` object is only produced by the engine with 2+ cycles.
  5. auto-open opens today's dialog only when today's record and the current cycle Peak conditions allow it, and only once per date per browser session.

## 6. Definition of Done

- [x] Calendar shows statuses from store (read-only, no new writes)
- [x] confirmed vs predicted visually distinct (incl. forecast ring)
- [x] `pnpm test` (incl. new), `pnpm lint`, `pnpm build` green
- [x] README status → M6 next