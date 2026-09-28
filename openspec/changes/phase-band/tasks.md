# Tasks

## 1. Palette guard (tests first)

- [x] 1.1 Rewrite `scripts/__tests__/fertility-palette.test.mjs` to read the monitor colours, the status fills, the window's bar, and the theme surfaces out of `src/index.css` for both `:root` and `.dark`, including `oklch` for the surfaces, and delete the hand-copied `CELL_FILLS` table. Verify it reports the new token as missing against today's stylesheet.
- [x] 1.2 Assert per theme that every monitor reading clears 3:1 against every surface a Calendar day cell can present — including the window's bar, because a reading on a window day sits on the bar — reading each surface from the stylesheet. Verify a marker pushed below the ratio fails.
- [x] 1.3 Assert per theme that the three monitor readings stay mutually distinguishable at the existing `0.25` floor, so a future attempt to lighten them together to free the fills fails.
- [x] 1.5 Assert that the window's bar is a distinguishable large area in both themes, by colour distance from the page and from the fills it sits beside — deliberately not by a contrast ratio, because 3:1 is a rule about boundaries and indicator shapes and no fill in this palette meets it against the page. Verify the bar pushed toward the page fails.
- [x] 1.6 Assert that the bar survives its worst reading in both themes, and that the failure message names the reading that binds it. The binding reading is Low, not Peak; getting that backwards is how the bar ends up brighter than a reading can survive.
- [x] 1.7 Add a check on the test file's own source asserting it contains no rule requiring status fills to be mutually distinguishable, and that the reason is stated in a comment. This is what stops a future maintainer re-adding an unsatisfiable rule.

## 2. Palette values

- [x] 2.1 Add a window token in both themes, with its theme aliases. Dark is the value the readings allow; light is the existing fertile tint, which is already the loudest thing on a white page.
- [x] 2.2 Settle the dark window at `#700b25`: the brightest rose at `0.0382` luminance that clears all three readings, with Low binding at `3.18:1`. A step of `0.209` OKLab L above the page, against the cell tint's `0.106`.
- [x] 2.3 Align the cycle-chart fertile window fill hue to the window's hue, leaving its border and alpha approach as they are. Verify the chart still renders and its reference area is unchanged in geometry.
- [x] 2.4 Confirm the status fills are unchanged, so every reading marker's contrast is exactly what it is today and the Status view is untouched.
- [x] 2.5 Remove the per-phase band tokens in both themes. The band was withdrawn: it and the menses stripe are both horizontal lines at opposite cell edges, 8px apart across a week boundary, where they read as one mark.

## 3. Visual plumbing

- [x] 3.1 Add a `bar` slot to the phase visual, populated for the fertile phase only, and record that it is allowed to differ from the status fill because it is the mark the window is recognised by.
- [x] 3.2 Give the Calendar's fertile phase the window colour as its fill as well as its bar, so a rounded bar end cannot reveal the darker status tint through its own corner.
- [x] 3.3 Add a `bar` slot to the layer paint record, populate it for the fertile layer, and confirm every other layer leaves it empty.
- [x] 3.4 Make a legend swatch take its colour from the paint and its shape from the layer's own declared footprint, so the two can no longer be chosen independently and drift apart. Give the window a tall block and the two tints a small tile.
- [x] 3.5 Remove the band from the status and phase records and from the paint record, and drop the day cell's band element. Verify no day cell in any phase draws a strip along its top edge.

## 4. Grid

- [x] 4.1 Add `windowStart` and `windowEnd` to the resolved day cell, derived from the same window that produced its status. Verify a day inside the window reports neither, the first and last day report one each, a one-day window reports both on one day, and a window with no end reports a start and never an end.
- [x] 4.2 Verify a projected cycle's window is identified from the projection's own window, and that a future day with no projection and a day outside any cycle report neither.
- [x] 4.3 Add `windowEdgesByDay`, deriving each day's bar edges from the whole displayed month, since a cell cannot know whether the day above or beside it is inside the window. Verify which sides are painted on the first and last day of each row.
- [x] 4.4 Position every day by its own row and column in the grid, rather than counting the days before it. A month padded with leading blanks has fewer real days in its first row, and counting put every later row in the wrong row — which bled the bar outside the calendar's outer columns and left holes inside the run. Verify a padded month produces the shape an unpadded one would.
- [x] 4.5 Pass the window's true last day into the edge calculation, so a run merely clipped by the displayed month is not rounded as though the window ended there. Verify a run continuing past the month keeps a square outer end on its last visible day.
- [x] 4.6 Thread the derived edges into every day cell, resolving the month's cells once rather than once per render.

## 5. Cell rendering

- [x] 5.1 Paint the band on every day in a quiet phase, bridging the grid gap, and paint no band on a day with no phase. Verify the cell is not `overflow-hidden` and that the band overhangs it.
- [x] 5.2 Paint the window as a solid bar at full cell height in its own colour, carrying no outline, and paint no bar on a day that is not in the window.
- [x] 5.3 Span the whole day gap wherever the window continues across it, and decide left and right independently so a day that opens or closes its row still joins the run. Verify nothing shows through between two days of the window, and that no part of the bar extends beyond the grid's outer edge.
- [x] 5.4 Never fill a row gap. The bar is exactly the cell's height, so the calendar's weeks stay legible across the whole window and a run that wraps weeks is one bar per row. Verify no bar bleeds vertically in any of the run's shapes.
- [x] 5.5 Round only the window's first and last day, and only at the end facing away from the window. Verify a row that merely opens or closes inside the window is square, and that a clipped run is square.
- [x] 5.6 Confirm the band, the bar, the bottom menses stripe, and the monitor marker render on the same day without one covering another, and that hiding a phase layer removes its mark while the accessible label still names the phase.
- [x] 5.7 Confirm no band and no bar are painted anywhere when the algorithm is disabled.

## 6. Verification

- [x] 6.1 Update the existing Calendar tests that assert where a phase's colour sits on the cell, since the marks are descendants rather than classes on the cell itself, and confirm the rest of the Calendar suite is unaffected.
- [x] 6.2 Run `pnpm check` and confirm format, lint, tests, and build are green, and that `openspec validate --all` passes with these artifacts present.
- [x] 6.3 Confirm in the running app, in both themes, that the bar's geometry is right and the bands are gone. Read the rendered result back out of the DOM on a month whose window wraps two row boundaries: confirmed zero tabs outside the grid's first and last columns, zero holes between bars in a row, zero bars bleeding vertically, a rounded left end on the window's first day and a rounded right end on its last, and `rgb(112, 11, 37)` dark / `rgb(254, 205, 211)` light. Confirmed the cell behind each rounded end is that same colour, so the corner reveals nothing but the window, and zero bands anywhere in the month with the two quiet phases still tinted at `rgb(69, 26, 3)` and `rgb(2, 44, 34)`. Confirmed the two quiet phases still carry their bands, the window carries none, and no day carries both a bar and a menses stripe.
- [ ] 6.4 Confirm on a real device, in both themes, that the window reads as one thing at a glance, that its two ends are identifiable and show no trace of the old tint, that the calendar's week rows stay legible across it, that the menses stripe is no longer confused with it, and that `Before` and `After` are still told apart by tint alone. That last one is the known weak point and is worth checking first. Review from `pnpm dev` in the issue worktree. Record any visual finding as an issue comment rather than expanding this change.
