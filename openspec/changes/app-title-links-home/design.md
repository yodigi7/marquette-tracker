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
- The title is a real, focusable link, with its appearance left untouched.
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

### 3. The title gets no visual treatment at all

The primary navigation uses `hover:text-foreground` over a `text-muted-foreground` rest state. The
title is **already** at full foreground colour, so applying `hover:text-foreground` to it would be a
visually indistinguishable no-op.

That leaves two options: substitute a different affordance (an underline was the first proposal, since
it is this project's own link convention in the shadcn `Button`/`Badge` `link` variants), or change
nothing visually. **The owner chose no visual change** on review: the title becomes a link and
nothing else. The top bar looks exactly as it did before.

The consequence is stated rather than papered over: with no visual cue, the title is discoverable
only by trying it. That is an accepted trade for this change, and it is cheaper on touch than it
sounds — an underline is a pointing-device cue and would not have appeared on a phone anyway, which
is the surface the request was motivated by.

Alternative considered: muting the title at rest to `text-muted-foreground` so the existing
`hover:text-foreground` would brighten it. Rejected — it would visibly de-emphasise the app's brand
mark to solve a styling problem, and it is a visual change of exactly the kind that was declined.

The class constant is kept anyway, pinned to a single value with a test, so that reintroducing a
hover treatment later is a conscious decision rather than a drift.

### 4. Touch tap target left at its current size

The title keeps its current size and padding. The shell's 44px tap-target requirement applies to the
narrow-viewport **menu items** (an existing spec requirement), not to the header title. Growing the
title into a large touch target would change the top bar's appearance, which the owner's ruling
against visual changes rules out here.

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

Recorded because they were not settled by the issue and were not derivable from the code. A1 and A2
were flagged on the pull request and have since been **answered by the owner**; they are kept below
with the ruling recorded rather than deleted, because the reasoning is what explains the final
styling.

### A1 — The title's visual treatment _(load-bearing — RESOLVED)_

**Originally proposed:** the title underlines on hover, since the navigation's brighten-on-hover
cannot apply to a title that already rests at full contrast.

**Owner's ruling:** no visual change at all. The title becomes a link and keeps exactly the
appearance it has always had — no underline, no colour shift, no size change.

**Why it was ambiguous:** the issue asked for "the same hover feedback as the other navigation
items", which cannot literally apply to this element, so some substitute cue was needed if the title
was to be visibly interactive at all.

**Affects:** what the user sees at the top of every screen — by ruling, nothing. **How hard to
reverse:** trivial; the test that pins the class value will fail loudly if anyone adds styling back.

### A2 — The title is not enlarged into a larger touch target _(load-bearing — RESOLVED)_

**Owner's ruling:** the title keeps its current size. Enlarging it would itself be a visual change,
so the ruling against visual changes settles this too.

**Why it was ambiguous:** the issue's motivation is explicitly mobile ("on a phone it is the obvious
place to tap"), which argues for a bigger target, while no acceptance criterion asked for one. The
two pulled in opposite directions.

**Affects:** how easy the title is to hit on a phone. **How hard to reverse:** trivial — padding and
size classes on the same element. Recorded as a known limitation rather than a defect.

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
- **With no visual treatment, the title is discoverable only by trying it** → Accepted, per the
  owner's ruling. There is no hover cue, no underline, and no size change to signal interactivity.
  The keyboard and screen-reader path is unaffected — it is a real link with a real accessible name
  either way. Accepted as the cost of leaving the top bar visually untouched.
- **A future change might reintroduce a hover treatment or mark the title as current** → Mitigation:
  one test pins the title's class to exactly its resting value with no `hover:`/`focus:`/`active:`
  variant, and another asserts it never carries `aria-current` even on `/`. Both fail loudly if
  either decision is quietly reversed.

## Open Questions

None. A1 and A2 were both raised on the pull request and answered; the owner's ruling closes them.
