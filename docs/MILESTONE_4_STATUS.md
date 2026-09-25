# Milestone 4 — Read-only Status View

Status is a date-selectable, read-only view of the app's derived cycle information. Daily observations are entered from the Calendar instead.

## 1. Files

```
src/features/status/
  index.tsx          # date picker + status-only page
  status-card.tsx    # DayStatus, source, window summary, next-period forecast
  lib.ts             # status labels/tones and date helper re-exports
  __tests__/status.test.tsx
```

## 2. View behavior

- The selected date defaults to today and can be changed with the date picker.
- The selected date resolves to its derived cycle; a date without a cycle shows a no-cycle state.
- `StatusCard` shows the status, cycle day, confirmed/predicted source, fertile-window explanation, and next-period estimate when available.
- When `algorithmEnabled` is false, Status explains that readings are logged without interpretation and does not show computed status.
- Status has no daily-entry, delete, or start-cycle controls.

## 3. Test matrix

- Shows a date picker and derived status for a cycle.
- Allows selecting a date without exposing input controls.
- Shows the no-cycle state on an empty store.
- Shows the logging-only explanation when the algorithm is disabled.
- `pnpm test`, `pnpm lint`, and `pnpm build` remain green.

## 4. Theme-aware presentation

Status badges use the shared fertility visual tokens for the four derived statuses. The source badge uses the shared confirmed/predicted border and text treatment, and the next-period estimate is explicitly styled as predictive. Explanatory and empty-state text uses theme-aware fertility text tokens so the view remains readable in both light and dark themes without changing status labels or read-only behavior.

Contrast and mobile rendering are covered by the manual matrix in [`VISUAL_QA.md`](./VISUAL_QA.md); automated tests cover the token mapping and algorithm-off branch.
