# Design

## Context

See proposal.md — Why. The current header (`src/app/layout.tsx`) is a single inline row: brand + separator + four `Link`s from `NAV_ITEMS`. It squishes on narrow viewports and its ~24px tap targets fail the 44px a11y floor. The project uses shadcn/ui + Tailwind v4 (responsive `md:` variants), `lucide-react` for icons (already a dependency), and react-router v8 (`useLocation` available). The existing hover-fix guard test (`src/app/__tests__/layout.test.tsx`) asserts one link per label via `getByRole` — it breaks the moment a second nav surface exists in the tree.

## Goals / Non-Goals

**Goals:**
- Narrow viewports: nav reachable via a slide-in Sheet with full-width, ≥44px-tall rows (specs: `app-shell` ADDED "reachable on narrow viewports").
- Wide viewports: inline top-row links preserved (labels/destinations unchanged; specs MODIFIED requirement).
- Active nav item visually marked on both surfaces (`aria-current="page"`).
- One `NAV_ITEMS` source feeding both surfaces.

**Non-Goals:**
- No route/URL changes, no main-page/`/calendar` swap (deferred by user).
- No restructuring of the header brand, no other header chrome (no search, no icons on desktop rows).
- No bottom-tab or permanently-visible mobile bar (rejected — see D1).

## Decisions

### D1. Responsive split: Sheet on mobile, inline links on desktop

Render two surfaces driven by Tailwind breakpoints: a mobile header (brand + `Sheet` trigger, `md:hidden`) and the existing inline link row (`hidden md:flex`). Both map over the same `NAV_ITEMS`.

**Rationale**: matches how the user actually uses the app (phone-first, space-hungry for charts/calendar) and scales to future nav growth (one `NAV_ITEMS` entry lights up both). No custom viewport detection — Tailwind breakpoints keep it declarative, and jsdom tests render both surfaces so no media-query mocking is needed.

**Alternatives considered**:
- *Bottom tab bar* — best tap ergonomics, but permanently consumes ~60px of the app's scarcest resource (vertical chart/calendar space) and only scales to ~5 items before iOS-style "More" hiding. Rejected by the user (space + growth).
- *Adaptive single row with CSS re-flow* — links would still wrap/crowd between 360–768px; doesn't fix tap targets.
- *Custom non-shadcn drawer* — unnecessary; a shadcn `Sheet` follows house style and `radix-ui` is already installed.

### D2. Active-state detection via `aria-current="page"`

Use react-router's `useLocation`; a link is active when `item.to === '/' ? pathname === '/' : pathname.startsWith(item.to)`. Mark it with `aria-current="page"` and the theme foreground token (`text-foreground` + font-medium) vs `text-muted-foreground` for rest; hover styling stays from the previous fix (`hover:text-foreground`, no `hover:text-stone-900`).

**Rationale**: exact-match for the index route, prefix-match for section routes — `/history` stays active while its sub-details are shown; `/cycle/:id` correctly matches nothing. `aria-current` is the semantic, screen-reader-visible marker and doubles as the test assertion hook.

**Alternatives considered**: `NavLink` from react-router (auto `isActive`) — considered and rejected for slightly different semantics (it also marks `/` active on all unmatched routes via ancestor matching, which is wrong on `/cycle/:id`). The `useLocation` predicate is explicit and testable.

### D3. Dual-render test strategy

Rework `src/app/__tests__/layout.test.tsx` from single-`getByRole` to `getAllByRole('link', { name })` expecting two matches (desktop + sheet, both always in the jsdom tree). Assert: both present with correct labels/destinations; desktop link carries `hover:text-foreground` and no `hover:text-stone-900`; the active link carries `aria-current="page"` (verify by rendering at a route); the Sheet opens/renders its rows (open via trigger click or assert rows in the tree).

**Rationale**: class-string and presence assertions are cheap, deterministic in jsdom, and directly encode the regression the guard exists for (dark-mode hover classes reappearing, destination changes, active row missing). Scoped queries via `screen.getAllByRole` avoid ambiguity from dual-render.

## Risks / Trade-offs

- Two nav surfaces can drift → Mitigation: single `NAV_ITEMS` constant; tests assert both surfaces carry every item.
- Prefix active-matching may highlight `/calendar` while a future nested `/calendar/…` route is open → Mitigation: acceptable today (no nested routes under nav destinations); revisit if nesting appears.
- Sheet adds a new dependency/component (`shadcn sheet`) → Mitigation: bundled with existing `radix-ui`; no new npm package; house-standard component.
- jsdom doesn't apply Tailwind breakpoints, so "hidden" vs "visible" surfaces aren't tested by media query → Mitigation: tests assert structure/classes, manual QA covers visual breakpoint behavior (tasks 4.x).

## Open Questions

- None material.