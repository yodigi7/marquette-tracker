# Tasks

## 1. Palette guard (tests first)

- [ ] 1.1 Rewrite `scripts/__tests__/fertility-palette.test.mjs` to read the monitor colours, the status fills, the status bands, and the theme surfaces out of `src/index.css` for both `:root` and `.dark`, including `oklch` for the surfaces, and delete the hand-copied `CELL_FILLS` table. Verify it reports the band tokens as missing against today's stylesheet.
- [ ] 1.2 Assert per theme that every monitor reading clears 3:1 against every surface a Calendar day cell can present, reading each surface from the stylesheet. Verify a marker pushed below the ratio fails.
- [ ] 1.3 Assert per theme that the three monitor readings stay mutually distinguishable at the existing `0.25` floor, so a future attempt to lighten them together to free the fills fails.
- [ ] 1.4 Assert per theme that each band's contrast against its own fill and against the surface behind the element clears 3:1, and that the bands are mutually distinguishable against a per-theme floor. Verify a band darkened toward its own fill fails.
- [ ] 1.5 Add a check on the test file's own source asserting it contains no rule requiring status fills to be mutually distinguishable, and that the reason is stated in a comment. This is what stops a future maintainer re-adding an unsatisfiable rule.

## 2. Palette values

- [ ] 2.1 Add per-phase band tokens in both themes, with their theme aliases. Reuse the existing border values in dark; darken the light values so a 4px band clears 3:1 on white and against its own fill. Verify task 1.4 passes.
- [ ] 2.2 Align the cycle-chart fertile band fill hue to the fertile band's hue, leaving its border and alpha approach as they are. Verify the chart still renders and its reference area is unchanged in geometry.
- [ ] 2.3 Confirm the status fills are unchanged, so every reading marker's contrast is exactly what it is today.

## 3. Visual plumbing

- [ ] 3.1 Add a band class to each status visual and to each collapsed Calendar phase in `src/lib/fertility-visuals.ts`, so the collapsed view cannot drift from the Status view's palette. Verify the records stay total over the status and the phase.
- [ ] 3.2 Add a `band` slot to the layer paint record, populate it for the three phase layers, and confirm the predictive, menses, and monitor layers leave it empty.
- [ ] 3.3 Make the legend swatch show a phase's band rather than a filled block, and give the phase keys a band-shaped footprint. Verify the existing legend tests pass and the hollow-swatch path is unchanged.

## 4. Grid

- [ ] 4.1 Add `windowStart` and `windowEnd` to the resolved day cell, derived from the same window that produced its status, and thread them into the day cell. Verify a day inside the window reports neither, the first and last day report one each, a one-day window reports both on one day, and a window with no end reports a start and never an end.
- [ ] 4.2 Verify a projected cycle's window is identified from the projection's own window, and that a future day with no projection and a day outside any cycle report neither.

## 5. Cell rendering

- [ ] 5.1 Paint the band on every day that has a phase, bridging the grid gap, and paint no band on a day with no phase. Verify the cell is not `overflow-hidden` and that the band overhangs it.
- [ ] 5.2 Shape the band on the fertile run: rounded outer edge on the first and last day, square on interior days, with no separate mark drawn. Verify the first and last day are presented differently from an interior day, that a clipped run is shaped as though it continued, and that no second element is rendered beside the day.
- [ ] 5.3 Confirm the band, the bottom menses stripe, and the monitor marker all render on the same day without one covering another, and that hiding a phase layer removes its band while the accessible label still names the phase.
- [ ] 5.4 Confirm no band is painted anywhere when the algorithm is disabled.

## 6. Verification

- [ ] 6.1 Update the existing Calendar tests that assert where a phase's colour sits on the cell, since the band is a descendant rather than a class on the cell itself, and confirm the rest of the Calendar suite is unaffected.
- [ ] 6.2 Run `pnpm check` and confirm format, lint, tests, and build are green, and that `openspec validate --all` passes with these artifacts present.
- [ ] 6.3 Confirm in the running app, in both themes, that the three phases are told apart, that the fertile run reads as one band with identifiable ends, and that no reading marker has lost legibility. Record any visual finding as an issue comment rather than expanding this change.
