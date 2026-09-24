# Design

## Context

See proposal.md — Why. The app shell's nav (`src/app/layout.tsx`) hardcodes light-first classes on its `Link`s: `text-stone-500 hover:text-stone-900`. The project already defines semantic theme tokens in `src/index.css` — `--muted-foreground` (`oklch(0.556)` light / `oklch(0.708)` dark) and `--foreground` (`oklch(0.145)` light / `oklch(0.985)` dark) — that other components (tabs, buttons, dialog descriptions) already use for theme-aware text. Test setup: Vitest + Testing Library (jsdom), react-router v7 (`react-router`), existing feature tests wrap routed views in `MemoryRouter`.

## Goals / Non-Goals

**Goals:**
- Nav links readable at rest and on hover in light and dark modes (specs: `app-shell`).
- Preserve the existing labels/destinations and the light-mode visual.
- Guard against regression with a component test.

**Non-Goals:**
- No active/selected nav-state styling (not requested; YAGNI).
- No broader stone-* color sweep across feature views — only the hover interaction that breaks (other stone usages are static text, legible in dark mode).
- No design-system/token changes.

## Decisions

### D1. Use semantic tokens for nav link colors

Change the nav `Link` className from `text-stone-500 hover:text-stone-900` to `text-muted-foreground hover:text-foreground`.

**Rationale**: `--muted-foreground` in light is near-`stone-500` (almost identical gray), so the rest state is visually unchanged; `--foreground` maps to near-black in light (same as `stone-900` hover today) and near-white in dark — hover now *brightens* against the dark background. One class change resolves both themes with zero new CSS.

**Alternatives considered**:
- *Add `dark:` variants* (e.g., `hover:text-stone-900 dark:hover:text-stone-200`) — works but duplicates token values that already exist, drifts from the project's semantic-token convention used by every other interactive component.
- *Custom CSS rule* — overkill for one link group.
- *Global anchor styling in `index.css`* — too broad; links elsewhere (dialog underline rule) already handle themselves.

### D2. Guard with a component test

Add `src/app/__tests__/layout.test.tsx` rendering `<RootLayout />` inside `MemoryRouter` and asserting each nav link's className contains `hover:text-foreground` and does NOT contain `hover:text-stone-900`.

**Rationale**: CSS-class assertions are brittle, but here they directly encode the regression (the dark-breaking class reappearing) and mirror the house component-test style. Guards the contract that presentation-only fixes stay presentation-only.

**Alternatives considered**: computed-style checks against CSS vars — requires loading real Tailwind output in jsdom; not worth it for a class-string guard.

## Risks / Trade-offs

- Class-string assertions are implementation-coupled → Mitigation: assert the two exact classes that matter (`hover:text-foreground` present, `hover:text-stone-900` absent); drop if Tailwind v4 class synthesis ever changes how these render.
- `text-muted-foreground` is imperceptibly different from `stone-500` in light mode → acceptable; near-identical gray, and hover stays near-`stone-900`-dark in light via `--foreground`.