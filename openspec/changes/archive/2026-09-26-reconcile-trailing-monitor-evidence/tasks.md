# Tasks

Test-first: write or update the failing table cases before touching the engine, per the project's
tests-first rule for `src/core/engine`. `pnpm test` after every task in groups 1–3.

Decision 1 in `design.md` (warn rather than move the window) is an **assumption, not a settled
question**. Confirm it before implementing group 2 — the engine diff differs materially.

`#21` decision (1) shipped in `fix-protocol-post-peak-and-status-honesty`; this change covers
decisions (2) and (3) and closes the ticket.

## 1. Engine — out-of-window evidence warning

- [x] 1.1 Add the failing table cases to `src/core/engine/__tests__/marquette.test.ts` before
      changing any implementation: a monitor `high` on day 15 with a window ending day 13 reports a
      warning naming day 15 and leaves the end at 13; a `high` at day 15 with the window ending 17
      reports nothing; a `low` at day 15 with the window ending 13 reports nothing; a cycle with no
      determinable end reports nothing; and with readings on days 15 and 17 the reported day is 15.
      Run `pnpm test` and confirm the new cases fail.
- [x] 1.2 Add the warning variant to `EngineWarning` in `src/core/engine/types.ts`, carrying the
      cycle number and the offending cycle day. Keep the two existing variants unchanged.
- [x] 1.3 In `src/core/engine/marquette.ts`, add the reconciliation inside `computeCycle`, which
      already holds both the computed window and `records`. Scan for user-entered monitor `high` or
      `peak` on cycle days later than `fertileWindow.end`, take the earliest such day, and push the
      warning onto the result's `warnings`. Leave `fertileWindow` and every day status untouched.
      Run `pnpm test` and confirm the engine suites pass.

## 2. Engine — open cycle past its computed end

- [x] 2.1 Add failing cases to `src/core/engine/__tests__/marquette.test.ts`: an open cycle with a
      Peak on day 10, window end day 13, and `today` on cycle day 20 reports a still-in-progress
      warning and still produces day statuses through day 20; the same cycle closed reports nothing;
      and an open cycle whose end is the current day or later reports nothing. Run `pnpm test` and
      confirm they fail.
- [x] 2.2 Add the second warning variant to `EngineWarning` in `src/core/engine/types.ts` and emit
      it from `computeCycle` when `length === null` and `fertileWindow.end` is non-null and earlier
      than the current cycle day. Derive the current cycle day from the same `cycleSpan` bound the
      day results use so the two cannot disagree. Run `pnpm test`.
- [x] 2.3 Confirm `no-peak-end`, `cycle-out-of-band`, and both new kinds are all collected by
      `collectWarnings` in `src/core/engine/engineSdk.ts` and reach `EngineOutput.warnings`. Run
      `pnpm test`.

## 3. Surfaces — render the warnings

- [x] 3.1 In `src/features/status/index.tsx`, read the selected cycle's `result.warnings` and
      render the two new kinds as a banner **above the status badge** in the Status card, suppressing
      all of them when `algorithmEnabled` is false. Scope the banner to the cycle, not the selected
      day, and have it name the offending cycle day. Do not render `no-peak-end` or
      `cycle-out-of-band` — that surfacing is out of scope (`design.md` Risks). Keep the status
      treatment and the window explanation unchanged, since the end has not moved.
- [x] 3.2 In `src/features/status/lib.ts`, add a label helper for the two new warning kinds
      alongside the existing rule-label maps. Each label names the recorded reading, the cycle day it
      falls on, and the computed window end. No label may use error, invalid, or malfunction
      language, and none may contain disclaimer wording.
- [x] 3.3 Style the banner using the existing `FERTILITY_TEXT_VISUALS.warning` token plus a border
      and spacing of its own, so it reads as a block distinct from the badge and the window line in
      both themes. Add no new palette and no new dependency.
- [x] 3.4 In `src/features/history/index.tsx`, report a count of cycles affected by either new
      warning, mirroring the existing `forecast.outOfBandCount` notice at `history/index.tsx:101`.
      Verify `pnpm test`.

## 4. Tests for the new behaviour

- [x] 4.1 Extend `src/features/status/__tests__/status.test.tsx`: the out-of-window warning renders
      for the selected cycle, the in-progress warning renders for an open cycle past its computed
      end, neither renders for an ordinary cycle, both are suppressed when the algorithm is off, the
      banner appears above the badge, the warning is still shown for a date earlier in the affected
      cycle while naming the offending day, and no dismiss control is offered. Assert the rendered
      warning matches no disclaimer pattern (reuse the `forbidden` regex already declared in that
      file) and contains no error/invalid/malfunction wording.
- [x] 4.2 Extend `src/features/status/__tests__/lib.test.ts` for the new label helper, asserting
      each kind renders distinct text that names the reading, the day, and the computed end, and that
      no label asserts safety or infertility.
- [x] 4.3 Confirm the banner is readable in both light and dark themes and is distinguishable from
      the status badge without colour being the only cue. Satisfied by the shared theme-aware warning
      token plus the text-content assertions in 4.1, which pin the wording rather than the colour;
      no separate test is warranted.
- [x] 4.4 Confirm no regression to the monitor-only Peak contract: a mucus `peak` or a BBT value
      after the computed end produces no evidence warning, while remaining visible on the logging
      and display surfaces. Verify in `src/core/engine/__tests__/marquette.test.ts`.

## 5. Documentation

- [x] 5.1 Update the `AGENTS.md` domain-rules section to state that monitor evidence falling outside
      the computed window is reported as a warning and does not move the window, and that an open
      cycle past its computed end is reported. Keep the "Monitor-only evidence" bullet unchanged, so
      mucus and BBT remain non-evidence.

## 6. Verification

- [x] 6.1 Run `pnpm check` and confirm format, lint, test, and build are all green.
- [x] 6.2 Run `openspec validate --all` and confirm it passes.
- [x] 6.3 Confirm in a browser that a cycle holding a monitor `high` after its computed window end
      shows the warning on Status, that the displayed window end is unchanged, and that toggling the
      algorithm off suppresses the warning.
- [x] 6.4 Close #21 with a comment recording that decisions (2) and (3) landed here and that the
      engine still does not move the window, referencing Decision 1 in `design.md` as the open
      question if the user chose to revisit it.
