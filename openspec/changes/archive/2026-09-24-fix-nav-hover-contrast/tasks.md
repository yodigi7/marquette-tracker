# Tasks

## 1. Baseline

- [x] 1.1 Confirm baseline: run `pnpm test` from repo root and verify all existing suites pass before any change

## 2. Regression guard (write first)

- [x] 2.1 Write `src/app/__tests__/layout.test.tsx`: render `<RootLayout />` inside a `MemoryRouter` and, for each nav link (Today, Calendar, History, Settings), assert its `className` contains `hover:text-foreground` and does NOT contain `hover:text-stone-900` (per design D2); verify the test FAILS against the current code with `pnpm test -- src/app/__tests__/layout.test.tsx`

## 3. Fix

- [x] 3.1 In `src/app/layout.tsx` (nav `Link` className, line 20), replace `text-stone-500 hover:text-stone-900` with `text-muted-foreground hover:text-foreground` (design D1); verify the layout test from 2.1 now passes

## 4. Validate

- [x] 4.1 Run the full gates from repo root: `pnpm test` (all suites green), `pnpm lint` (no new warnings), `pnpm build` (strict tsc + PWA) — all green
- [x] 4.2 Manual dark-mode check on `pnpm dev`: set theme to dark in Settings, hover each nav link — text brightens and stays readable against the dark background; in light mode the rest/hover appearance is unchanged from before the fix