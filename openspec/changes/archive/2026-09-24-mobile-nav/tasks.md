# Tasks

## 1. Setup

- [x] 1.1 Confirm baseline: run `pnpm test` from repo root and verify all existing suites pass before any change
- [x] 1.2 Add the shadcn `Sheet` component (`pnpm dlx shadcn@latest add sheet`) and verify `src/components/ui/sheet.tsx` exists with no new npm package added to `package.json`

## 2. Regression guard (write first)

- [x] 2.1 Rework `src/app/__tests__/layout.test.tsx` for dual-render: for each nav label, assert `screen.getAllByRole('link', { name })` returns two matches (desktop row + Sheet), both with the correct `href`; assert the desktop link's className contains `hover:text-foreground` and NOT `hover:text-stone-900`; verify the new test FAILS against the current single-surface layout with `pnpm test -- src/app/__tests__/layout.test.tsx`
- [x] 2.2 Extend `src/app/__tests__/layout.test.tsx` with an active-state case: render at a route (e.g. `initialEntries={['/calendar']}`), assert the matching link carries `aria-current="page"` and others do not; verify it FAILS against the current code

## 3. Implementation

- [x] 3.1 In `src/app/layout.tsx`, add a mobile-only header surface (`md:hidden`): brand + ghost `Button` (lucide `Menu` icon) acting as the `Sheet` trigger, with `SheetContent` listing `NAV_ITEMS` as full-width rows (`py-3`) that close the sheet on click; verify with `pnpm dev` that the sheet opens/ closes and rows are ≥44px tall
- [x] 3.2 Add the active-state link class (per design D2): react-router `useLocation` predicate (`to === '/' ? pathname === '/' : pathname.startsWith(to)`), `aria-current="page"` + `text-foreground` when active else `text-muted-foreground hover:text-foreground`; apply to BOTH surfaces and verify the tests from 2.2 pass
- [x] 3.3 Confirm both surfaces render from the same `NAV_ITEMS` source and the desktop row keeps the theme-aware hover classes; verify the full layout suite from 2.1 passes with `pnpm test -- src/app/__tests__/layout.test.tsx`

## 4. Validate

- [x] 4.1 Run the full gates from repo root: `pnpm test` (all suites green), `pnpm lint` (no new warnings), `pnpm build` (strict tsc + PWA) — all green
- [x] 4.2 Manual QA on `pnpm dev`: at narrow width, open/close the sheet, navigate via rows, confirm the active item is highlighted and tap targets feel comfortable; at wide width confirm the inline bar is unchanged and highlights the current route