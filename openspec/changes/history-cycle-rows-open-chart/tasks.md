# Tasks

## 1. Row navigation

- [ ] 1.1 Make each `CycleTable` row navigate to `/cycle/<cycleId>` on click, with `useNavigate` from react-router; verify a click on a row changes the route to the cycle chart for that cycle
- [ ] 1.2 Add keyboard activation to the row (`tabIndex={0}`, `onKeyDown` for Enter/Space, `role="link"`); verify the row is focusable and activatable without a pointer
- [ ] 1.3 Add an `aria-label` to each row with cycle number and Day 1; verify the accessible name includes both
- [ ] 1.4 Style the cycle identity cell as the control (link treatment); verify the cycle number is visually identified as the control

## 2. Tests

- [ ] 2.1 Add a test that clicking a cycle row navigates to `/cycle/<cycleId>` and the chart selects that cycle; verify it passes
- [ ] 2.2 Add a test that keyboard activation (Enter/Space) on a row navigates to the cycle chart; verify it passes
- [ ] 2.3 Add a test that rows navigate correctly for both closed and open cycles; verify it passes
- [ ] 2.4 Add a test that rows remain navigable when the algorithm is disabled; verify it passes
- [ ] 2.5 Add a test that an unknown cycle id shows the existing empty/fallback state; verify it passes

## 3. Verification

- [ ] 3.1 Run `pnpm check` and confirm it passes
- [ ] 3.2 Run `openspec validate --all` and confirm it passes
