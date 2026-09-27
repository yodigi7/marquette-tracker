# Tasks

## 1. Guard the palette with a failing test first

- [x] 1.1 Add `src/lib/__tests__/fertility-palette.test.ts` that parses the six
      `--fertility-monitor-{low,high,peak}` values out of `src/index.css` (both the `:root` and
      `.dark` blocks) and asserts each one meets WCAG 3:1 against every Calendar fill for its
      theme — light: `#ffffff`, `#fef3c7`, `#fecdd3`, `#d1fae5`, `#f5f5f4`, `#ede9fe`; dark:
      `#0a0a0a`, `#171717`, `#451a03`, `#4c0519`, `#022c22`, `#292524`, `#2e1065`. Verify it
      FAILS on the current palette, specifically on light Low at 2.90:1.
- [x] 1.2 In the same file, add the perceptual-separation guard: compute OKLab distance between the
      three readings per theme and assert every pair clears a floor that the current palette fails on
      the Low/Peak pair. Verify it FAILS before the recolour.
- [x] 1.3 Run `pnpm test` and confirm both new guards fail for the right reason (contrast and
      separation), not a parse error.

## 2. Recolour the palette

- [x] 2.1 In `src/index.css`, set the light-theme monitor values to `#115e59` (Low), `#c2410c`
      (High), `#c026d3` (Peak), adding a short comment naming each as its Tailwind step.
- [x] 2.2 In the same file's `.dark` block, set `#0d9488` (Low), `#fb923c` (High), `#e879f9` (Peak)
      with the same style of comment.
- [x] 2.3 Run `pnpm test` and confirm the two new guards now pass and that no pre-existing test
      regressed — the existing suite asserts class names, not colour values, so it should not move.

## 3. Verify the surfaces pick the change up

- [x] 3.1 Confirm no call site needed editing: `FERTILITY_MONITOR_VISUALS` in
      `src/lib/fertility-visuals.ts` and `LAYER_PAINT` in `src/features/calendar/layers.ts` must be
      untouched, since only token values changed. Verified: `git diff --stat` on those paths is
      empty.
- [x] 3.2 Confirm `src/features/cycle-chart/comparison-chart.tsx` is unaffected — it uses its own
      `MONITOR_OPACITIES` and block height and does not consume the monitor tokens. Verified by
      grep: no `fertility-monitor` reference in that file.
- [x] 3.3 Run the full gate: `pnpm check` clean (format, lint 0/0, 554 tests, build), and
      `openspec validate --all` clean (15 passed, 0 failed).

## 4. Record the outcome

- [x] 4.1 Post a comment on issue #24 with the before/after contrast and separation figures and the
      two load-bearing assumptions, so the decision is visible from the issue thread.
- [x] 4.2 Note in the PR that the cycle-chart overlay legibility gap (mucus/intercourse/BBT drawn on
      the bands at ~1.05:1–1.89:1, unfixable by recolouring in light mode) is pre-existing and
      untouched, so it is not mistaken for a regression from this change.
