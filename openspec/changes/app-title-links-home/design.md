# Design

## Context

See `proposal.md` — Why. The engineering facts that shape the approach:

The app shell (`src/app/layout.tsx`) renders one `<header>` containing two viewport-exclusive
surfaces. The narrow-viewport surface is a `div` holding the title text and a menu button; the
wide-viewport surface is a `<nav>` that currently holds **the title text, a separator, and the four
destination links**. The title is therefore inside the primary `<nav>` element on wide viewports and
outside it on narrow viewports.

Routing is `HashRouter`, so a react-router `<Link to="/">` renders `href="#/"`. There is no
separate home/landing route: `openspec/specs/app-shell` already pins the Calendar as the root
destination and forbids a separate `/calendar` route.

Two existing behaviours constrain the work:

- `src/app/__tests__/layout.test.tsx` asserts the wide-viewport `<nav>` contains exactly the anchors
  `["Calendar", "Status", "History", "Settings"]`. Its intent is to keep document routes (cycle
  summary, instructor chart) out of the primary navigation.
- The `app-shell` spec requires the shell to suppress its navigation when printed. The header is
  already `print:hidden`, so the title never reaches paper.

## Goals / Non-Goals

**Goals:**

- The title navigates to `/` on both surfaces, in-app, with no reload.
- The title is a real, focusable link, distinguishable from a static label.
- The shell's existing invariants (four primary destinations; one current-page marker) survive
  unchanged.

**Non-Goals:**

- A distinct home/landing page. The Calendar remains the root.
- Adding a "Home" entry to the menu or the primary navigation. The title is a shortcut, not a
  destination.
- Any change to the engine, the data model, forecasts, protocol warnings, or printed documents.
- Enlarging the title's tap target on touch devices (see Decision 4 / Assumption A2).

## Decisions

### 1. Use react-router `<Link to="/">`, not a raw anchor

Rationale: `<Link>` performs a client-side transition, so the app keeps its SPA behaviour and the
URL fragment is handled by the existing `HashRouter` — the same mechanism every other navigation
link already uses. A raw `<a href="#/">` would hand-write the fragment and would drift from the
router.

Alternative considered: a `SheetClose`-wrapped link on narrow viewports, mirroring how the menu
entries dismiss the sheet. Rejected — the title sits outside the sheet, and there is no open sheet
to dismiss. Adding the wrapper would be inert code.

### 2. Move the wide-viewport title out of the `<nav>` element

The title is a brand/home link, not a primary destination. Leaving it inside the `<nav>` would make
it a fifth link inside the navigation landmark, which forces the "exactly four destinations" test to
be rewritten — and that test is the guard that keeps document routes out of the nav. Moving the
title into a sibling wrapper inside the same `<header>` keeps the navigation element semantically
honest and lets the existing test keep passing **unmodified**, which is the strongest signal that the
invariant still holds.

```
  before                              after
  <header>                            <header>
    <div class="... md:hidden">         <div class="... md:hidden">   (title | menu button)
      <span>title</span>                  <Link>title</Link>
      <Sheet .../>                        <Sheet .../>
    </div>                              </div>
    <nav class="... md:flex">            <div class="... md:flex">    (title | separator | nav)
      <span>title</span>                  <Link>title</Link>
      <Separator/>                        <Separator/>
      <div>{4 links}</div>                <nav class="flex gap-3 text-sm">{4 links}</nav>
    </nav>                              </div>
  </header>                            </header>
```

The rendered layout is identical: the outer flex row keeps `gap-4` for title/separator/nav spacing,
and the links keep their own `gap-3`.

Alternative considered: keep the title inside the `<nav>` and widen the existing assertion to
exclude it. Rejected — it weakens a test that exists to protect a real invariant, and a site-title
link inside a navigation landmark is the wrong semantics.

### 3. Affordance is an underline, not the nav links' colour shift

The primary navigation uses `hover:text-foreground` over a `text-muted-foreground` rest state. The
title is **already** at full foreground colour (`font-semibold` with no colour class), so applying
`hover:text-foreground` to it would be a visually indistinguishable no-op — the affordance would
simply not exist, and the "distinguishable from a static label" requirement would fail on every
device.

`hover:underline` with `underline-offset-4` is chosen instead. It is already this project's link
convention: the `link` variant of the shadcn `Button` and `Badge` components in
`src/components/ui/` is exactly `text-primary underline-offset-4 hover:underline`, and
`src/features/history/index.tsx` uses the same pair. So the title adopts the app's established
appearance for "this is a link" rather than inventing a new cue.

Alternative considered: muting the title at rest to `text-muted-foreground` so the existing
`hover:text-foreground` would brighten it. Rejected — it would visibly de-emphasise the app's brand
mark to solve a styling problem, which is a regression traded for a feature.

### 4. Touch tap target left at its current size

The title keeps its current size and padding. The shell's 44px tap-target requirement applies to the
narrow-viewport **menu items** (an existing spec requirement), not to the header title. Growing the
title into a large touch target would change the top bar's appearance, which is beyond what the
issue asks for. Recorded as assumption A2 rather than decided silently.

### 5. No `aria-current` on the title, ever

The title is a shortcut home, not a location indicator. The Calendar nav item keeps sole ownership of
the current-page marker, so the Calendar screen shows exactly one highlighted entry. This is
implemented by simply never setting `aria-current` on the title — there is no code path in which it
could be set.

### 6. Accessible name stays the visible text

The title's accessible name remains `Marquette Tracker` — the same text that is on screen. No
`aria-label` override is added, so the accessible name matches the visible label (WCAG 2.5.3
"Label in Name") and screen-reader users hear the same string sighted users read. This also keeps
role/name queries in tests unambiguous.

## Assumptions

Recorded because they were not settled by the issue and were not derivable from the code.

### A1 — The hover affordance is an underline, not a colour shift _(load-bearing)_

**Decision:** the title underlines on hover (and shows the same emphasis on keyboard focus) instead
of adopting the navigation's brighten-on-hover treatment.

**Why ambiguous:** the issue asked for "the same hover feedback as the other navigation items",
which is literally impossible here — the navigation links brighten because they rest at a _muted_
colour, and the title already rests at full contrast. The two surfaces have different rest states, so
"the same feedback" has to be read as "an equally visible affordance", not "the same class name".

**Affects:** what the user sees on hover at the top of every screen. **How hard to reverse:** trivial
— one class name on one element; the tests assert the affordance is present, not which one.

### A2 — The title is not enlarged into a larger touch target _(load-bearing)_

**Decision:** the title keeps its current visual size; no extra padding or minimum tap size is added.

**Why ambiguous:** the issue's motivation is explicitly mobile ("on a phone it is the obvious place
to tap"), which argues for a bigger target, but no acceptance criterion asked for one, and enlarging
it changes the top bar's appearance. Scope discipline and the mobile motivation pull in opposite
directions and the issue does not settle it.

**Affects:** how easy the title is to hit on a phone, and the top bar's appearance. **How hard to
reverse:** trivial — padding/size classes on the same element.

### A3 — "Home page" means the Calendar at `/` _(routine, but recorded)_

**Decision:** the title links to `/`, which renders the Calendar. No new landing route is introduced.

**Why ambiguous:** "home page" could imply a distinct landing screen. It is not ambiguous in fact —
`app-shell` already pins the Calendar as the root destination and forbids a separate `/calendar`
route — but the resolution is worth stating so the target is not re-opened later.

**Affects:** the navigation target. **How hard to reverse:** easy, but it would contradict an existing
spec requirement.

### A4 — The title is not added to the narrow-viewport menu _(routine)_

**Decision:** the menu still offers exactly the four destinations; the title link is not repeated
inside the sheet.

**Why ambiguous:** the issue named two surfaces (phone top bar, desktop nav) and did not mention the
menu. Repeating the title inside the menu would make it a navigation destination, which the
`app-shell` spec and the existing nav-contents test both exclude.

**Affects:** nothing on screen today — the menu is unchanged. **How hard to reverse:** trivial.

### A5 — The wide-viewport title is restructured out of the `<nav>` element _(routine)_

**Decision:** see Decision 2. The visible layout is byte-for-byte equivalent; only the DOM nesting
changes.

**Why ambiguous:** the title could have stayed nested inside the navigation element with the test
updated instead. Both satisfy the issue.

**Affects:** no user-visible change. **How hard to reverse:** trivial.

## Risks / Trade-offs

- **The wide-viewport layout could shift if the wrapper is not given the same flex classes** →
  Mitigation: the wrapper keeps `hidden items-center gap-4 px-4 py-3 md:flex` and the inner `<nav>`
  keeps `flex gap-3 text-sm`, so the box model is unchanged; the existing print test still asserts
  the header/`main` classes are untouched.
- **Two elements share one accessible name** ("Marquette Tracker" appears on both surfaces, as
  `Calendar`/`Status`/… already do) → Mitigation: this mirrors the existing convention for the four
  nav links, which the test suite already queries with `getAllByRole` and a length assertion. New
  tests follow the same pattern rather than assuming a single match.
- **The underline is a mouse affordance and will not appear on touch** → Accepted. The link's
  behaviour is the discovery path on touch; enlarging the tap target is deliberately out of scope and
  recorded as A2 for the owner to decide.
- **A future change might accidentally mark the title as the current page** → Mitigation: the spec
  delta states "at most one entry SHALL be marked as the current page", and a test asserts the
  title carries no `aria-current` even on `/`.

## Open Questions

None that change the approach. A2 (tap target) is the one item the owner may want to answer
differently; it is isolated to one element and does not affect the spec delta.
