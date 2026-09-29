# Tasks

## 1. Palette guard (tests first)

- [x] 1.1 Rewrite `scripts/__tests__/fertility-palette.test.mjs` to read the monitor colours, the status fills, the window's bar, and the theme surfaces out of `src/index.css` for both `:root` and `.dark`, including `oklch` for the surfaces, and delete the hand-copied `CELL_FILLS` table. Verify it reports the new token as missing against today's stylesheet.
- [x] 1.2 Assert per theme that every monitor reading clears 3:1 against every surface a Calendar day cell can present — including the window's bar, because a reading on a window day sits on the bar — reading each surface from the stylesheet. Verify a marker pushed below the ratio fails.
- [x] 1.3 Assert per theme that the three monitor readings stay mutually distinguishable at the existing `0.25` floor, so a future attempt to lighten them together to free the fills fails.
- [x] 1.5 Assert that the window's bar is a distinguishable large area in both themes, by colour distance from the page and from the fills it sits beside — deliberately not by a contrast ratio, because 3:1 is a rule about boundaries and indicator shapes and no fill in this palette meets it against the page. Verify the bar pushed toward the page fails.
- [x] 1.6 Assert that the bar survives its worst reading in both themes, and that the failure message names the reading that binds it. The binding reading is Low, not Peak; getting that backwards is how the bar ends up brighter than a reading can survive.
- [x] 1.6a Assert that each quiet phase fill is a visible area against the surface behind the cell, and that the window is a more prominent surface than either. Stated as distance from the surface rather than lightness, because "loud" means lighter in dark and darker in light, and an earlier draft of this rule got light mode exactly backwards. Measured against the card, which is the surface the Calendar renders on and the binding one.
- [x] 1.7 Add a check on the test file's own source asserting it contains no rule requiring status fills to be mutually distinguishable, and that the reason is stated in a comment. This is what stops a future maintainer re-adding an unsatisfiable rule.

## 2. Palette values

- [x] 2.1 Add a window token in both themes, with its theme aliases. Dark is the value the readings allow; light is the existing fertile tint, which is already the loudest thing on a white page.
- [x] 2.1a Move the dark `Before` fill from amber to a warm gold and lift both quiet fills. Amber sat 32 degrees from the rose window, so brightening it walked it toward the window — the review that asked for the tints to be lighter also said `Before` looked like the window. Gold ends at hue 86, seventy-one degrees away. Both tints sit below the window in lightness and chroma, and clear the Low reading at 3.08:1 and 3.36:1. Light mode deliberately untouched.
- [x] 2.1a0 Establish the ceiling and stop searching. The binding reading dot caps any day background at 0.0435 luminance regardless of hue, and the value sits at 94% of it, so the sweep is flat: the value furthest from the window is always the dimmest. Three of the four things the last review asked for are the same knob. The last legal value is taken, `#4c3700` at 3.03:1, and the next one up is 3.00:1. Darkening the Low reading dot is NOT the way past it: a darker dot forces a lighter background while Peak forces a darker one, so the readings straddle the fill and no background serves all three. Paid for in reading margin, 3.21:1 to 3.03:1.
- [x] 2.1a1 Try indigo for `Before` and reject it. A cool fill spends its whole luminance budget on being cool, so it is capped harder: it cleared the Low reading at 3.66:1 and still landed darker against the card than the gold, which is the dimension the review had complained about. Recorded so the next search does not run to the widest gap on the wheel again.
- [x] 2.1b Retint the `Before` legend-swatch border to an amber step, since the swatch draws it around the fill and the outline has to belong to the same hue family as the tile.
- [x] 2.2 Settle the dark window at `#700b25`: the brightest rose at `0.0382` luminance that clears all three readings, with Low binding at `3.18:1`. A step of `0.209` OKLab L above the page, against the cell tint's `0.106`.
- [x] 2.3 Align the cycle-chart fertile window fill hue to the window's hue, leaving its border and alpha approach as they are. Verify the chart still renders and its reference area is unchanged in geometry.
- [x] 2.4 Confirm the status fills are unchanged, so every reading marker's contrast is exactly what it is today and the Status view is untouched.
- [x] 2.5 Remove the per-phase band tokens in both themes. The band was withdrawn: it and the menses stripe are both horizontal lines at opposite cell edges, 8px apart across a week boundary, where they read as one mark.

## 2b. The cap was in the reading, not the fill

- [x] 2.6 Establish that the 3:1 rule bounds the marker and the fill _together_, so the fill's ceiling is
      set by the darkest reading and moves when that reading moves. Everything up to here treated the fill as
      the constrained object and the marker as fixed inside it, which is why three of the four things a review
      asked for looked unsatisfiable. The dark `Low` at `#0d9488` permitted a fill of 0.0435; the fills sat at
      94% of that ceiling, which is what made an arbitrary number read as a property of the palette.
- [x] 2.7 Lighten the dark `Low` reading to `#04ab96`, raising the permitted fill ceiling from 0.0435 to
      1.0406. This frees the two phase fills and the window bar at once — none of which had been near its own
      limit; all three were held down by the same dot. Scope note: the readings were originally out of scope
      and are explicitly not any more, which is the honest record of why they moved.
- [x] 2.8 Re-space the three readings on **lightness**, which is the channel that survives a small target:
      0.31, 0.44 and 0.47 luminance, against 0.037 of spread before. Verified that saturation could not have
      done it — all three were within 0.02 of the sRGB gamut edge, and pushing all three to their limits moved
      the worst pair only from 0.261 to 0.277.
- [x] 2.9 Set `Peak` at OKLab L 0.80 (`#f195ff`) by the product owner after a rendered sweep, knowingly
      under the 0.25 separation floor against `High` at 0.231, and name that one pair as an exception in the
      guard rather than lowering the floor for every pair. Add a test asserting the set of things under the
      real floor is exactly that pair, so the exception cannot widen and a further regression on it fails.
- [x] 2.10 Settle the dark window at `#800630`. The first value bright enough to be unmistakable, `#9d0041`
      at 0.0755, raised the floor every reading must clear to 0.3265 and squeezed the three readings into a
      band too narrow to separate. 0.0493 puts that floor at 0.2480 and the bar still out-separates the
      `Before` fill, by 0.0123.
- [x] 2.11 Re-check the fills against the freed headroom. `Before` lands at `#5a4a10`, 7% of what the `Low`
      reading now permits, clearing it at 3.00:1. `After` is unchanged at `#053b2c`. `Before` and `After` are
      0.131 apart, against 0.057 where this change started.

## 2c. Guard correctness

- [x] 2.12 Strip CSS comments before reading any token. An unterminated comment had been commenting out the
      dark `Before` fill and three other dark tokens for an entire review cycle, and because the guard matched
      the stylesheet as raw text it found those tokens inside the comment and reported a clean pass for a
      palette the app was no longer painting. Add a test that fails on a comment that is never closed.
- [x] 2.13 Check only the readings that can be painted on each fill, rather than the full cross product,
      and add the engine test the scoping depends on: a pre-fertile day is before the window's begin, the begin
      is `min(first High-or-Peak, calendar begin)`, so a `Before` day can only hold a `Low` reading or none.
      Asserting that against the engine rather than assuming it is what stops the scoping from being a lie if
      the window's begin rule ever changes.

## 3. Visual plumbing

- [x] 3.1 Add a `bar` slot to the phase visual, populated for the fertile phase only, and record that it is allowed to differ from the status fill because it is the mark the window is recognised by.
- [x] 3.2 Give the Calendar's fertile phase the window colour as its fill as well as its bar, so a rounded bar end cannot reveal the darker status tint through its own corner.
- [x] 3.3 Add a `bar` slot to the layer paint record, populate it for the fertile layer, and confirm every other layer leaves it empty.
- [x] 3.4 Make a legend swatch take its colour from the paint and its shape from the layer's own declared footprint, so the two can no longer be chosen independently and drift apart.
- [x] 3.4a Give all three phase keys the same footprint. They were first given different sizes — a tall
      block for the window's bar, a small tile for the two tints — which was an attempt to show the difference
      in shape and read instead as a claim about importance, on the one key most often compared against its two
      neighbours. The three are told apart by colour, and a difference the eye has to search for is not doing
      the work of one it can see.
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
- [x] 6.3 Confirm in the running app, in both themes, that the bar's geometry is right and the bands are gone. Read the rendered result back out of the DOM on a month whose window wraps two row boundaries: confirmed zero tabs outside the grid's first and last columns, zero holes between bars in a row, zero bars bleeding vertically, a rounded left end on the window's first day and a rounded right end on its last. Confirmed the cell behind each rounded end is that same colour, so the corner reveals nothing but the window, and zero bands anywhere in the month. _(The colour values recorded at the time were `rgb(112, 11, 37)` dark and `rgb(254, 205, 211)` light, with the two quiet phases at `rgb(76, 55, 0)` and `rgb(5, 59, 44)`; they were true when observed and have since changed — see 2.11 and 2.10 for the current values. Left as the record of what was checked rather than rewritten to match later code.)_
- [x] 6.5 Confirm the final palette in the running app in dark mode, read back from the DOM rather than
      from the stylesheet: window `rgb(128, 6, 48)`, `Before` `rgb(90, 74, 16)`, `After` `rgb(5, 59, 44)`, and
      the three markers `rgb(4, 171, 150)` / `rgb(255, 152, 83)` / `rgb(241, 149, 255)`. Confirm the three
      phase legend keys are all 10x10. `pnpm check` green at 1052 tests, `openspec validate --all` 19/19.
- [x] 6.4 **Confirmed on a real device by the product owner, in both themes.** The checklist it was written against:

  In dark, the things most likely to be wrong, in order:

  1. **That `Peak` and `High` are tellable apart.** They measure `0.231` where the floor is `0.25`, which
     is a known and accepted shortfall, and the `Peak` value was chosen by eye rather than by the metric.
     This is the pair to look at hardest. If they blur, the fix is `Peak` at L `0.76` or below, which
     clears the floor and visibly pinks it down.
  2. **That the gold `Before` reads as "before"** and not as a third kind of window. It is brighter than
     anything this change previously shipped, at 7% of the ceiling the `Low` reading now permits, and it is
     only `0.0123` behind the window in prominence. That margin is the thinnest in the palette.
  3. **That `Before` and `After` are told apart.** They are `0.131` apart, the closest phase pair. If they
     are not, the fix belongs in the summary or the legend, not in a fourth mark on every day.
  4. That the window still reads as one thing at a glance, that its two ends are identifiable and show no
     trace of a different colour through their corners, that the week rows stay legible across it, and that
     the menses stripe is not confused with it.

  In light, check the known unfixed case: the two quiet phases are cream and mint, `0.062` apart, with the
  pale pink window among them. Its readings are closer together than dark's but all three pairs clear the
  floor. Nobody has reported it; it is unfixed by choice rather than by oversight.

  Review from `pnpm dev` in the issue worktree. Record any visual finding as an issue comment rather than
  expanding this change.

  **What this confirmation does and does not settle.** It settles the two risks this change knowingly
  carried: the `Peak`/`High` pair at `0.231` against a `0.25` floor, and the `0.0123` margin between the
  window and the gold. Both were left in place deliberately and neither produced a change, so they are
  accepted as they stand rather than outstanding.

  It does not make the palette provably correct on hardware in general, and the guard still does not cover
  what a device pass covers. Two things remain true afterwards and are recorded in design.md rather than
  closed here: the separation floor is a poor proxy for legibility, because OKLab sums hue with lightness
  and cannot say which pairs are backed by which; and light mode's two quiet phases are still `0.062`
  apart, which was never fixed and is now confirmed as readable rather than as addressed.
