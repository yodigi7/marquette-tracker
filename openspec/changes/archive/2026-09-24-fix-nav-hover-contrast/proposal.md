# Proposal

## Why

In dark mode, hovering a top-level navigation link makes its text nearly black on the near-black app background, so the label becomes unreadable. The nav hardcodes `text-stone-500 hover:text-stone-900` (light-first classes) and never adapts to the `.dark` theme that the Settings feature now makes reachable.

## What Changes

- Replace the light-only hardcoded nav link colors in the app shell with semantic theme tokens — `text-muted-foreground hover:text-foreground` — so the rest/hover text resolves correctly in both light and dark mode (lighter foreground on hover in dark; unchanged appearance in light mode).
- Add a component guard test asserting the nav links do not carry the dark-breaking `hover:text-stone-900` class and do carry the responsive token.

No other UI is affected: Selects, tabs, buttons, and calendar cells already use semantic/dark-aware tokens and are readable on hover.

## Capabilities

### New Capabilities
- `app-shell`: the application shell's top-level navigation — links must stay readable when resting and when hovered in both light and dark themes.

### Modified Capabilities
- (none — no specs exist yet; this is the project's first capability spec)

## Impact

- `src/app/layout.tsx` — nav `Link` className: `text-stone-500 hover:text-stone-900` → `text-muted-foreground hover:text-foreground` (one-line change, no behavior change to routing/labels).
- `src/app/__tests__/layout.test.tsx` — new component test (react-router `MemoryRouter` wrapper, house style).
- No new dependencies. No engine/store/schema changes.