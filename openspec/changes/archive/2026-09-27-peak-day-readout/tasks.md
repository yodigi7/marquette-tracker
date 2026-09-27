# Tasks

Test-first: write or update the failing table cases before touching the engine, per the project's
tests-first rule for `src/core/engine`. `pnpm test` after every task in group 1.

Decisions 2 and 7 in `design.md` are **assumptions, not settled questions** — the history-window-scoped
range adds a field to `Forecast` that the ticket asserted was unnecessary, and the Peak-anchoring
question is half-deferred. Both are recorded in the PR.

## 1. Engine — report the Peak days the calendar rule used

- [x] 1.1 Add the failing table cases to `src/core/engine/__tests__/predict.test.ts` before changing
      any implementation: with `historyWindow` 6 and monitor Peak days `12, 16, 17` inside the window
      the reported range is `12` to `17` with 3 contributing cycles and the windowed begin/end still
      derive from it; with 10 closed cycles peaking on `11,12,13,14,16,18,19,20,21,22` the reported
      range comes from the most recent 6 only and does not widen to day `11`; with 3 closed cycles
      peaking `14, 15` the range is `14` to `15` with 2 contributing cycles; with a window holding no
      monitor Peak the range is `null`; and the existing all-cycles `peakDayEarliest`/`peakDayLatest`
      pair is unchanged in every one of those cases. Run `pnpm test` and confirm the new cases fail.
- [x] 1.2 In `src/core/engine/types.ts`, add a `PeakDayRange` interface carrying `earliest`, `latest`,
      and the number of cycles in the window that held a monitor Peak, and add
      `peakDayRangeInWindow: PeakDayRange | null` to `Forecast`. Nullable rather than a `0` sentinel,
      because `0` is not a cycle day. Do not change `peakDayEarliest`/`peakDayLatest`.
- [x] 1.3 In `src/core/engine/predict.ts`, widen `predictFertileWindow`'s return to include the
      windowed minimum, the windowed maximum, and the count of contributing cycles — all three already
      in hand at the point it derives `beginDay`/`endDay` — and put them on the `Forecast` as
      `peakDayRangeInWindow`, or `null` when `lastWindow` is empty. No new input, no new iteration, no
      change to the dates it returns. Run `pnpm test` and confirm the engine suites pass.
- [x] 1.4 Confirm the new `marquette-engine` requirement about the latest monitor Peak anchoring the
      end is already satisfied by `computePeak` and `computeEnd` without a code change, and that the
      scenarios in the delta hold. Verify in `src/core/engine/__tests__/marquette.test.ts`: Peaks on
      days 12 and 15 give `peakDay` 15 and end 18; a second Peak on day 21 moves `peakDay` to 21 and
      the end to 24; a single Peak anchors it; and a mucus `peak` on day 14 after a monitor `peak` on
      day 12 leaves `peakDay` at 12. If any case fails, fix the engine rather than the test.

## 2. Status copy helpers

- [x] 2.1 Add the failing cases to `src/features/status/__tests__/lib.test.ts` for a
      `peakCountLine` helper: `3` with a Peak on day 12 yields a line naming cycle day 12 and 3 days;
      `0` yields the same-day phrasing and the string `"0 days"`; `1` is singular; a cycle day below
      the Peak yields the "this date is before it" phrasing and contains no digit count; `null` yields
      the "no Peak reading logged" empty state; and a `peaks` count above 1 appends the "last of N"
      clause while a count of 1 does not. Assert no produced line contains countdown wording.
- [x] 2.2 Implement `peakCountLine` in `src/features/status/lib.ts` as a pure function taking the
      cycle's `peakDay`, the selected cycle day, and the number of monitor Peak readings in the cycle.
      Follow Decision 1 and the copy table in `design.md` exactly. Run `pnpm test`.
- [x] 2.3 Add the failing cases to `src/features/status/__tests__/lib.test.ts` for an
      `expectedPeakRangeLine` helper: a full window yields the "based on your last N completed
      cycles" line naming earliest, latest, and N; a window where fewer cycles contributed appends the
      "K of those cycles have a Peak reading" sentence; `null` forecast or a `null` range yields
      `null`; and no produced line contains "predicted", "confirmed", "ovulation", or disclaimer
      wording.
- [x] 2.4 Implement `expectedPeakRangeLine` in `src/features/status/lib.ts` as a pure function taking
      the `Forecast`. Use `lookbackWindow` for the "last N completed cycles" count and the range's own
      cycle count for the partial sentence. Run `pnpm test`.

## 3. Status view and card

- [x] 3.1 In `src/features/status/index.tsx`, subscribe to `dayRecords`, count the selected cycle's
      records with `monitor === "peak"`, and pass the count plus the selected cycle day and the
      cycle's `peakDay` into `StatusCard` as new props. The count must be relative to the selected
      date, never to today. No change to the existing status, window line, warning banner, or
      next-period estimate.
- [x] 3.2 In `src/features/status/status-card.tsx`, render `peakCountLine` below the window
      explanation and `expectedPeakRangeLine` below it, both in the existing
      `FERTILITY_TEXT_VISUALS.body` and `.muted` tokens. Take no `FERTILITY_FORECAST_VISUAL` treatment
      for the range, per Decision 8. Add a `data-testid` to each line. Keep the existing early return
      for `algorithmEnabled === false` ahead of both lines, so neither can render while interpretation
      is disabled, and add no new component, colour, or token.
- [x] 3.3 Run `pnpm test` and confirm the existing `status.test.tsx` cases still pass, in particular
      `shows no status source badge`, `renders no label asserting safety`, and
      `renders no medical disclaimer in either interpretation mode`.

## 4. Tests for the new behaviour

- [x] 4.1 Extend `src/features/status/__tests__/status.test.tsx` with the counted case: a cycle with a
      Peak on day 12, a record on day 1, and today at cycle day 15 shows "3 days" and names cycle day
      12, with nothing logged on days 13 or 14 — which also pins that unlogged days do not move the
      number.
- [x] 4.2 Add the uncounted case: a cycle with no monitor Peak reading shows the empty state, and
      `document.body.textContent` contains no "0" day count for it.
- [x] 4.3 Add the multiple-Peak case: Peaks on days 12 and 15 with today at cycle day 17 shows 2 days,
      names cycle day 15, and shows the "last of 2 Peak readings" clause.
- [x] 4.4 Add the pre-Peak-date case: with a Peak on day 12, selecting cycle day 8 shows the Peak's
      cycle day and no count, and no negative number.
- [x] 4.5 Add the algorithm-disabled case: a cycle with a Peak and the setting off shows neither the
      count nor the range, and still shows the logging-only explanation.
- [x] 4.6 Add the range cases: with prior cycles peaking on `12, 16, 17` inside a 6-cycle window, the
      view shows the range labelled as coming from past cycles; with more than 6 closed cycles the
      range comes from the most recent 6 and does not include an older cycle's day; and with no Peak
      in the window no range line renders. Assert the rendered range text contains no "predicted",
      "confirmed", or "ovulation".
- [x] 4.7 Assert across the new cases that no rendered string matches a countdown pattern such as
      `/\d+ days? until|until (your )?peak|days? to (your )?peak|next peak/i`, reusing the forbidden
      regex already declared in that file for the disclaimer check.
- [x] 4.8 Re-run `pnpm check` and confirm format, lint, test, and build are green.

## 5. Verification and handoff

- [x] 5.1 Run `openspec validate --all` and confirm it passes.
- [x] 5.2 Confirm no new dependency was added and no colour, status, or visual token was introduced,
      and that `openspec/specs/history/spec.md` is untouched — History's Peak-day range keeps its
      all-cycles meaning.
- [x] 5.3 Confirm the readout uses no new visual treatment: both new lines resolve to existing
      `FERTILITY_TEXT_VISUALS` classes, verified by asserting the class names on the rendered elements
      in the tests from group 4.
- [x] 5.4 Comment on #29 recording the Decision 7 outcome: the reporting anchor is settled in
      `marquette-engine` and the method-sourced justification for preferring the latest reading over
      the first is explicitly deferred, per this change's acceptance criteria.

## 6. Follow-up from the browser verification pass

The first browser pass found a real overclaim the automated tests could not: the Status date picker has
no future cut-off, so a date that has not happened yet can be selected, and the count read "13 days
since" for a date eight days out. The difference of cycle days is a true number that the word "since"
then makes false. Fixed before the PR was opened, and recorded as a fourth state in Decision 1 rather
than patched quietly.

- [x] 6.1 Add the failing cases to `src/features/status/__tests__/lib.test.ts`: a selected cycle day
      past today's cycle day names the Peak's day and states the date has not happened yet, with no
      count; today's cycle day still counts normally; the boundary is exclusive in the right
      direction; and the multiple-Peak tally survives the future state. Run `pnpm test` and confirm
      they fail.
- [x] 6.2 Change `peakCountLine` in `src/features/status/lib.ts` to take a `PeakCountInput` object
      carrying `todayCycleDay`, and check the future state before the elapsed arithmetic — a Peak can
      only be logged on a day that has happened, so a future date is always ahead of it and would
      otherwise fall into the count branch. Run `pnpm test`.
- [x] 6.3 In `src/features/status/index.tsx`, compute the selected cycle's day for `todayKey()` and
      pass it through. Do not clamp to the selection, and do not restrict the picker: both were
      considered and rejected in Decision 1, and restricting the picker is a change to a shipped
      behaviour belonging in its own issue.
- [x] 6.4 Add the case to `src/features/status/__tests__/status.test.tsx`: a cycle with a Peak on day
      11 and today on day 15 counts "4 days" normally, and selecting cycle day 20 then shows the
      Peak's day and no count.
- [x] 6.5 Add the corresponding requirement text and scenario to `specs/status/spec.md`, and the
      fourth state plus the two rejected alternatives to `design.md` Decision 1. Run
      `openspec validate --all`.
- [x] 6.6 Re-run `pnpm check` and confirm format, lint, test, and build are green.
