# Proposal

## Why

The top-level navigation in `src/app/layout.tsx` renders brand + four text links ("Today", "Calendar", "History", "Settings") in a single row. On narrow viewports this row squishes: links crowd, text hampers readability, and the ~24px-tall tap targets fail the 44px accessibility minimum. Users of this app are phone-first (mobile PWA, added to home screen) yet value vertical space for cycle charts and the calendar, and expect to grow the nav beyond four items — so the right fix is a tucked-away menu on mobile, not a persistent bar or more inline crowding.

## What Changes

- Mobile (`< md`): replace the inline top-bar links with a brand row + hamburger button that opens a slide-in Sheet listing the nav items as full-width rows (44px+ tap targets).
- Desktop (`md+`): keep the current inline top-bar links and layout (wide screens have space); hamburger/Sheet stay hidden.
- Both surfaces: highlight the active nav item (`aria-current="page"` + theme-aware token) so users can see where they are.
- `NAV_ITEMS` stays the single source of truth for both surfaces; adding future items is one line.
- Nav labels and destinations are unchanged — the change is presentation/responsive behavior only.
- **Dependency**: add shadcn/ui `Sheet` component (radix-ui already present; no new package in `package.json`).

## Capabilities

### New Capabilities
- (none)

### Modified Capabilities
- `app-shell`: top-level navigation gains responsive behavior (narrow viewports render through a Sheet), and the active nav item is visually marked.

## Impact

- `src/app/layout.tsx` — responsive header: mobile brand row + `Sheet` (lucide `Menu`/`X`), desktop links unchanged, active states via `aria-current="page"`.
- `src/components/ui/sheet.tsx` — new shadcn/ui component (**new dependency: `shadcn sheet`**, radix-ui already installed).
- `src/app/__tests__/layout.test.tsx` — rework for dual-render (two "Today" links exist in the tree): `getAllByRole`/scoped queries; assert both surfaces render, labels/destinations preserved, active item marked, no `hover:text-stone-900` regression on the desktop links.
- No engine, store, or routing changes. No DB schema change.