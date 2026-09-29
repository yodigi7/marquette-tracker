# Tasks

## 1. Tests first — shell title link (`src/app/__tests__/layout.test.tsx`)

Tests are written before the implementation in this group, per the project's tests-first convention.

- [x] 1.1 Add a failing test asserting the app title is a link to `/` on BOTH viewport surfaces
      (narrow top bar and wide-viewport bar), found by role/name, and that it resolves to exactly two
      elements. Verify it fails against the current `<span>` implementation.
- [x] 1.2 Add a failing test asserting the title is a real link element with an `href` (so it is
      keyboard-operable and exposed to assistive tech as a link). Verify it fails.
- [x] 1.3 Add a failing test asserting the title carries a visible hover/focus affordance class
      (`hover:underline` per design Decision 3). Verify it fails.
- [x] 1.4 Add a failing test asserting the title NEVER carries `aria-current`, including when the
      app is rendered on `/`, and that the Calendar nav item is the one marked on `/`. Verify it fails.
- [x] 1.5 Add a failing test asserting the wide-viewport `<nav>` still contains exactly
      `["Calendar", "Status", "History", "Settings"]` with the title excluded (design Decision 2).
      Verify it fails today, since the title currently lives inside the `<nav>`.
- [x] 1.6 Add a failing test under `src/app/__tests__/hash-router.test.tsx` asserting that activating
      the title from `#/settings` navigates to `#/` and renders the Calendar without a reload. Verify it
      fails.
- [x] 1.7 Run `pnpm test` and confirm ONLY the new tests from 1.1–1.6 fail, with no unrelated
      pre-existing test newly broken.

  **Verified:** `pnpm vitest run` on the two shell test files gives 6 failed / 18 passed. The 6
  failures are exactly the new tests; every pre-existing test still passes. Two of the new tests
  needed strengthening during this step and were fixed: the 1.5 anchor-count assertion passed
  trivially against the current `<span>` title, so it was extended to assert the title text is
  absent from the `<nav>` subtree entirely; and the 1.5 test initially referenced a `desktopNav`
  helper scoped to the other `describe` block, which threw a `ReferenceError` instead of testing
  behavior.

## 2. Implement the title link (`src/app/layout.tsx`)

- [x] 2.1 Replace the narrow-viewport `<span className="font-semibold">Marquette Tracker</span>` with
      a react-router `<Link to="/">`, keeping `font-semibold` and adding the `hover:underline
underline-offset-4` affordance. Do not add `aria-current`. Verify test 1.1's narrow-surface
      assertion passes.
- [x] 2.2 Restructure the wide-viewport branch: move the title into a sibling wrapper
      `div` with classes `hidden items-center gap-4 px-4 py-3 md:flex` placed alongside a
      `<nav className="flex gap-3 text-sm">` that holds only the four destination links. Keep the
      `<Separator>` between title and nav, and keep the header's `print:hidden` and the `<main>`
      classes untouched. Verify test 1.5 passes and the existing print test still passes.
- [x] 2.3 Make the wide-viewport title a `<Link to="/">` with the same `font-semibold` plus the
      `hover:underline underline-offset-4` affordance as 2.1, and no `aria-current`. Verify tests 1.1,
      1.2, 1.3, and 1.4 all pass.
- [x] 2.4 Extract the shared title className into a single module-level constant so the two
      surfaces cannot drift apart, and verify both surfaces still render identically (test 1.1).

  **Verified:** both surfaces render `<AppTitle />`, so 2.1, 2.3, and 2.4 are satisfied by one
  shared component rather than two call sites — drift is structurally impossible. The wide-viewport
  wrapper keeps `hidden items-center gap-4 px-4 py-3 md:flex` and the inner nav keeps
  `flex gap-3 text-sm`, so the box model and rendered layout are unchanged. `pnpm vitest run` on
  both shell test files: 24 passed / 0 failed, covering all six new tests and every pre-existing
  test (nav destinations, active item, hash routes, print suppression) unmodified.

## 3. Verification

- [x] 3.1 Run `pnpm test` and confirm the whole suite is green, including the pre-existing
      `layout.test.tsx` nav, active-item, and print tests, which must still pass unmodified.
- [x] 3.2 Run `pnpm check` and confirm format:check, lint, test, and build are all clean.
- [x] 3.3 Run `openspec validate --all` and confirm no validation errors.
- [x] 3.4 Confirm the diff touches only `src/app/layout.tsx`, the two shell test files, and the
      `openspec/changes/app-title-links-home/` artifacts — no engine, data, or feature files.

  **Verified:** `pnpm test` = 1062 passed / 48 files, 0 failed. `pnpm check` exit 0 (format:check,
  oxlint, test, `tsc -b` + `vite build`) after running `pnpm format`, which reformatted only the
  three new/edited files and left everything else alone. `openspec validate --all` = 19 passed,
  0 failed. `git diff --stat origin/main` (excluding `.opencode/`) shows exactly
  `src/app/layout.tsx` +31/-7 plus the two test files; no engine, data, or feature file changed.

  Acceptance criteria from issue 49 map to tests as follows: phone bar and desktop bar links →
  `layout.test.tsx:176`; keyboard-operable and announced as a link → `layout.test.tsx:187`; hover
  affordance → `layout.test.tsx:202`; never marked current page, with the Calendar item marked on `/`
  → `layout.test.tsx:214`; works from any view without a reload and updates the fragment → the new
  `hash-router.test.tsx:83` (activated from `#/settings`, lands on `#/`); title is not a nav
  destination → `layout.test.tsx:225`; printable documents unchanged → the pre-existing print test
  passes and `print:hidden` / `print:p-0` are untouched in the diff.

  Not covered by automated tests, and stated plainly in the pull request: the visual result of the
  underline on hover, and the real-device size of the tap target (assumption A2).
