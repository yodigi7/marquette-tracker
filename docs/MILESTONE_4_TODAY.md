# Milestone 4 — Data Entry + Today View

First real feature slice: the **Today** view (status card + quick-entry form + start-cycle flow). Everything renders from the store; every write hits the engine path already built in M3.

## 1. Files

```
src/features/today/
  index.tsx          # page: wires store → status card, entry form, start-cycle CTA
  status-card.tsx    # today's DayStatus + window summary + next period forecast
  quick-entry.tsx    # all-optional 1-tap logging form (+ date picker for backfill)
  start-cycle-card.tsx  # "Day 1 menses" flow (new cycle or backfill start)
  lib.ts             # todayKey (local tz), form state builder, status → label/color
src/core/engine/marquette.ts    # + export statusForCycleDay (small, engine-side)
```

## 2. Engine addition

`export function statusForCycleDay(window: FertileWindow, peakKnown: boolean, day: number): DayStatus`

- Reuses the internal `statusForDay`; needed by Today to extrapolate status for calendar-excess dates (beyond records) and by the Calendar V in M5.
- **Tests**: extend `marquette.test.ts` — statusfor day < begin → pre-fertile; begin..end fertile; >end → post-peak/post-calendar; end null → fertile.

## 3. View behavior spec

**Date handling** — all date keys are `YYYY-MM-DD` (local calendar date, `lib.todayKey()`):
- selected date (default today); Popover+Calendar to backfill any past date.
- Cycle resolution: `cyclesForDate(cycles, date)` — if `none` → **Start Cycle card** (calls `setNewCycle(date)`).
- For the current cycle → Status card + QuickEntry.

**Status card** (from `store.output`, `cycleForDate`, `statusForCycleDay`):
1. Big status chip: `fertile` / `pre-fertile` / `post-peak` / `post-calendar` with tone (rose/amber/emerald/stone) + `confirmed` vs `predicted` tag.
2. Line: identified window (begin–end as cycle days + dates), stating which rule fired (`beginRule`/`endRule` text).
3. Line: predicted next period from `forecast.expectedPeriodStart` — "estimated" label.
4. `algorithmEnabled === false` → show "Algorithm off — computed windows hidden" notice instead of status.
5. Footer: medical disclaimer (short, AGENTS.md).

**Quick entry** — all fields optional, save = `addDayRecord(cycleId, date, dayInCycle, patch)`:
- Monitor: segmented Low/High/Peak buttons
- Mucus: Low/High/Peak; blood flow none/light/medium/heavy (chips)
- BBT: `input type=number step=0.01` (null when blank)
- Intercourse toggle + optional time `input type=time`
- Symptoms: free-text "Add" → chips list (`string[]`)
- Pregnancy test: neg/pos select; Notes: textarea
- Save button; successful save → toast ("Saved yyyy-mm-dd")
- Form initializes from the existing record for the selected date; selecting a different date resets fields.

**Start cycle card** — CTA "Set Day 1 / start cycle on <date>"; calls `setNewCycle(date)`. The new day1 becomes the cycle start; any earlier prorated backfill is a Milestone 5 concern.

**Layout** — centered `max-w-md` column, mobile-first; status card → segmented form → disclaimers.

## 4. Test matrix

- `lib.test.ts`: todayKey in local TZ (inject clock param); status mapping & labels.
- Component test (`today.test.tsx`, jsdom + singleton fake-IDB):
  1. no data → StartCycle shown; click → cycle created, status card appears
  2. log monitor High → store row + output window begin updates to first-high day
  3. backfill via date popover → row for past date; form shows existing values
  4. clear a field (e.g., BBT) → record updated null
  5. algorithmEnabled false → algorithm notice instead of fertile status
- engine addition tests in `marquette.test.ts`.

## 5. Definition of Done

- [x] today flow loop: start cycle → log → status updates; persists across reload
- [x] backfill works; toasts on save
- [x] `pnpm test` (incl. new), `pnpm lint`, `pnpm build` green
- [x] README status → M5 next