# Tasks

## 1. Palette guard (tests first)

- [x] 1.1 Rewrite `scripts/__tests__/fertility-palette.test.mjs` to read the monitor colours, the status fills, the status bands, the status outlines, and the theme surfaces out of `src/index.css` for both `:root` and `.dark`, including `oklch` for the surfaces, and delete the hand-copied `CELL_FILLS` table. Verify it reports the new tokens as missing against today's stylesheet.
- [x] 1.2 Assert per theme that every monitor reading clears 3:1 against every surface a Calendar day cell can present, reading each surface from the stylesheet. Verify a marker pushed below the ratio fails.
- [x] 1.3 Assert per theme that the three monitor readings stay mutually distinguishable at the existing `0.25` floor, so a future attempt to lighten them together to free the fills fails.
- [x] 1.4 Assert per theme that each band's contrast against its own fill and against the surface behind the element clears 3:1, and that the bands are mutually distinguishable against a per-theme floor. Verify a band darkened toward its own fill fails.
- [x] 1.5 Assert per theme that the window's outline clears 3:1 against the fill it encloses and against the surface behind the cell, and that it is not read as either quiet phase's band. Verify an outline moved onto its own fill fails.
- [x] 1.6 Add a check on the test file's own source asserting it contains no rule requiring status fills to be mutually distinguishable, and that the reason is stated in a comment. This is what stops a future maintainer re-adding an unsatisfiable rule.

## 2. Palette values

- [x] 2.1 Add per-phase band and outline tokens in both themes, with their theme aliases. Reuse the existing border values in dark; darken the light values so the marks clear 3:1 on white and against their own fills. Verify tasks 1.4 and 1.5 pass.
- [x] 2.2 Settle the dark outline on rose-400 rather than rose-300. Rose-300 is a step further from the amber `Before` band, but at 0.169 it no longer clears the 0.2 floor the dark theme holds its bands to, and the window shares its own band's hue by design, so shape is what tells them apart. Verify the guard's separation rule passes in both themes.
- [x] 2.3 Align the cycle-chart fertile band fill hue to the window's hue, leaving its border and alpha approach as they are. Verify the chart still renders and its reference area is unchanged in geometry.
- [x] 2.4 Confirm the status fills are unchanged, so every reading marker's contrast is exactly what it is today and the region's interior stays the value the marker rules are satisfied against.

## 3. Visual plumbing

- [x] 3.1 Add a band class to each status visual and to each collapsed Calendar phase in `src/lib/fertility-visuals.ts`, so the collapsed view cannot drift from the Status view's palette. Verify the records stay total over the status and the phase.
- [x] 3.2 Add `BlockEdges`, four separately-coloured sides, and record why they cannot be one class: a border-colour utility sets all four sides at once, and a side's width does not undo a colour that has been set. Verify the four classes are distinct and each names its own edge.
- [x] 3.3 Give the fertile phase a block and no band, and give the two quiet phases a band and no block, so no phase carries both and the window is the only region on the calendar.
- [x] 3.4 Add a `block` slot to the layer paint record, populate it for the fertile layer, and confirm every other layer leaves it empty.
- [x] 3.5 Make the legend swatch render the mark its day cells draw — a bar for a band, an outlined region for a block — and give each phase key the matching footprint. Verify the existing legend tests pass and the hollow-swatch path is unchanged.

## 4. Grid

- [x] 4.1 Add `windowStart` and `windowEnd` to the resolved day cell, derived from the same window that produced its status. Verify a day inside the window reports neither, the first and last day report one each, a one-day window reports both on one day, and a window with no end reports a start and never an end.
- [x] 4.2 Verify a projected cycle's window is identified from the projection's own window, and that a future day with no projection and a day outside any cycle report neither.
- [x] 4.3 Add `windowEdgesByDay`, deriving each day's four region edges from the whole displayed month, since a cell cannot know whether the day above or beside it is inside the window. Verify which sides are painted on the first and last day of each row, and that no bottom edge is drawn where the run continues down a column.
- [x] 4.4 Pass the window's true last day into the edge calculation, so a run merely clipped by the displayed month is not rounded as though the window ended there. Verify a run continuing past the month keeps a square outer edge on its last visible day.
- [x] 4.5 Thread the derived edges into every day cell, resolving the month's cells once rather than once per render.

## 5. Cell rendering

- [x] 5.1 Paint the band on every day in a quiet phase, bridging the grid gap, and paint no band on a day with no phase. Verify the cell is not `overflow-hidden` and that the band overhangs it.
- [x] 5.2 Paint the window as a full-height outlined region, leaving every side it does not have transparent, and reach into the row gap only in a column where the run continues. Verify an interior day carries no side's colour class at all, and that a day whose run continues up and down paints no horizontal edge.
- [x] 5.3 Shape the run's ends by rounding only the window's first and last day, on the cell that also draws their vertical edge. Verify a row beginning mid-window stays square, that a clipped run stays square, and that no second element is rendered beside the day.
- [x] 5.4 Confirm the band, the region, the bottom menses stripe, and the monitor marker render on the same day without one covering another, and that hiding a phase layer removes its mark while the accessible label still names the phase.
- [x] 5.5 Confirm no band and no region are painted anywhere when the algorithm is disabled, and that no region is painted on a day that is not in the window.

## 6. Verification

- [x] 6.1 Update the existing Calendar tests that assert where a phase's colour sits on the cell, since the marks are descendants rather than classes on the cell itself, and confirm the rest of the Calendar suite is unaffected.
- [x] 6.2 Run `pnpm check` and confirm format, lint, tests, and build are green, and that `openspec validate --all` passes with these artifacts present.
- [x] 6.3 Confirm in the running app, in both themes, that the window's region paints only the edges the window has, that its two true ends are the only rounded ones, and that no reading marker has lost legibility. Read the rendered result back out of the DOM on a month whose window wraps two row boundaries: confirmed the first day paints top and left with a rounded left, the row-ending day paints right and no bottom while the run carries on below it, the following row's first day paints left and no top, the three interior days in that row paint only a bottom because the run continued in from above, and the last day paints right and bottom with a rounded right. Confirmed the two quiet phases still carry their bands, that the window carries none, and that no menses day carries a region. Light mode paints the outline `rgb(225, 29, 72)` and dark `rgb(251, 113, 133)`, each on the sides that day actually has.
- [ ] 6.4 Confirm on a real device, in both themes, that the three phases are told apart at a glance, that the window reads as one thing across a week boundary, that its two ends are identifiable, and that the menses stripe is no longer confused with the window. Review from `pnpm dev` in the issue worktree. Record any visual finding as an issue comment rather than expanding this change.
