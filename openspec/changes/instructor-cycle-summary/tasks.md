# Tasks

Test-first throughout: the failing test is written and run before the implementation it pins. `pnpm test`
after every group; `pnpm check` at the end of each group that touches `src/**`.

Every load-bearing assumption in `design.md` Decisions 1-13 is exercised by a test, not just asserted in
the pull request. A green run on a guessed decision is still a guessed decision — the point of naming them
here is that the owner can check the behaviour against their intent by reading the test names.

Groups 2 and 3 both write to `src/features/cycle-summary/lib.ts`; they are sequenced, not parallel. Group
4 touches `src/index.css` and `src/app/layout.tsx`, which nothing else in this change writes.

## 1. Pure model and copy

- [x] 1.1 Add the failing cases to `src/features/cycle-summary/__tests__/lib.test.ts` for
      `buildSummaryModel`, and run `pnpm test` to confirm they fail. A closed 28-day cycle reports
      `cycleNo`, `day1`, a day range of 1 to 28, `open: false`, and `length: 28`. An open cycle reaching
      day 17 reports `open: true`, `length: null`, and a day range of 1 to 17. A cycle with monitor Peaks
      on days 12 and 15 reports `peakDay: 15` and `peakCount: 2`; a cycle with none reports `peakDay:
null`. A cycle whose only logged values are Day 1 menses and monitor readings reports every optional
      column `false`; adding one mucus, one temperature, one intercourse day, one pregnancy test, one
      symptoms entry, and one note turns each column `true` independently. A day with no record appears in
      the day's list with `monitor: null`.
- [x] 1.2 Implement `buildSummaryModel` in `src/features/cycle-summary/lib.ts`. It takes the cycle's
      `CycleResult`, the cycle's `DayRecordEntity[]`, the `EngineWarning[]` for that cycle, the configured
      band, and `algorithmEnabled`, and returns the document's data. Day rows come from `result.days` so an
      unlogged day is present with nothing in it; the Peak count is a count of logged records, per
      `design.md` Decision 12. With `algorithmEnabled` false it returns `window: null`, `peakDay: null`, and
      `warnings: []` while leaving the identity and the day rows intact. Run `pnpm test`.
- [x] 1.3 Add the failing cases for the window basis, table-driven over every `BeginRule` and `EndRule`
      the engine produces. `calendar-day-6` and `calendar-earliest-peak-minus-6` state the calendar rule;
      `first-high-or-peak` states the user's own reading. `current-peak-plus-n` and `earliest-end` with a
      Peak day name that Peak day; `historic-peak-plus-n` names earlier cycles' readings and reports no
      Peak day; `none` states no end can be set; `protocol-default-band` has a defined sentence rather than
      falling through. Every basis sentence names the rule behind it, and every rule label comes from
      `END_RULE_LABELS`/`BEGIN_RULE_LABELS` so it carries the literal `3`. Run `pnpm test`.
- [x] 1.4 Implement `windowBasis` in `src/features/cycle-summary/lib.ts` as two `Record`s keyed on the
      engine's unions, so a new rule value is a type error rather than a silent blank. Reuse
      `BEGIN_RULE_LABELS`, `endRuleLabel`, and `END_RULE_LABELS` from `@/features/status/lib`; do not restate
      any of that wording. Run `pnpm test`.
- [x] 1.5 Add the failing cases for `warningLines`: one line per warning, covering all four kinds; the
      out-of-window line names the offending cycle day and states the window was not changed; the
      out-of-band line states the cycle's length and the configured band; the open-cycle line states the
      end cycle day; an empty warning list yields no lines. Assert every produced line matches neither the
      forbidden wording regex already used in `src/features/status/__tests__/lib.test.ts` nor a
      countdown pattern. Run `pnpm test`.
- [x] 1.6 Implement `warningLines` in `src/features/cycle-summary/lib.ts`, reusing `WARNING_LABELS` from
      `@/features/status/lib` for the two kinds it covers and owning the copy for `no-peak-end` and
      `cycle-out-of-band`, per `design.md` Decision 5. Do not modify `src/features/status/lib.ts`. Run
      `pnpm test`.
- [x] 1.7 Add the failing cases for the length and snapshot lines: a closed cycle states its length; an
      open cycle says in progress, names the cycle day reached, and says the length is not yet known with no
      number in its place; the snapshot line carries the generation date and the word "snapshot" and states
      that predictions and projected cycles are not included. Run `pnpm test`.
- [x] 1.8 Implement those two helpers alongside the rest. `todayKey` is passed in rather than called, so
      the line is a pure function of its input. Run `pnpm test`.

## 2. The document component

- [x] 2.1 Add the failing cases to `src/features/cycle-summary/__tests__/document.test.tsx` for the
      presentational component rendered with a hand-built model. Every section is present for a closed
      cycle with interpretation on: identity, window with both bases, warnings, per-day table. With
      interpretation off: no window section, no Peak day, no warnings section, and the raw log still
      present. An open cycle shows the in-progress wording and no length number. An unknown cycle's empty
      state is a separate case in task 4.3, not here. Run `pnpm test`.
- [x] 2.2 Create `src/features/cycle-summary/document.tsx` as a pure props-in component — no store, no
      router — so the section structure is testable without the app. Use semantic `section`/`table`
      elements and existing theme tokens; introduce no new colour, token, or status. Assert in the tests
      from 2.1 that the monitor reading is rendered as a word per day, which is what makes the document
      survive black and white. Run `pnpm test`.
- [x] 2.3 Build the per-day table from the shadcn `Table` components with compact type and padding
      overrides, and gate each optional column on the model's column flags. Give the table a
      `data-testid` and give the monitor cell a per-day `data-monitor` attribute so a test can assert a
      specific day. Confirm `<thead>` is used so the header repeats when the table breaks across pages.

## 3. The view and the route

- [x] 3.1 Add the failing cases to `src/features/cycle-summary/__tests__/cycle-summary.test.tsx`, using
      the same `resetStore`/`seedCycles` helpers as `src/features/cycle-chart/__tests__/helpers.ts`. Cases:
      a closed cycle renders every value the acceptance list names — cycle number, Day 1, day range,
      length, Peak day, window begin and end; the window's basis lines are present and no confirmed or
      predicted window label is anywhere in the document; a raised warning appears on the document; an open
      cycle is labelled in progress; with the algorithm off the window, Peak day, and warnings are gone and
      the raw log remains; the print control calls `window.print`; the document title is set on mount and
      restored on unmount. Run `pnpm test` and confirm the new cases fail.
- [x] 3.2 Create `src/features/cycle-summary/index.tsx`. Subscribe to `output`, `dayRecords`, and
      settings; resolve the cycle from the route param; pass `output.warnings` filtered to that cycle's
      number into `buildSummaryModel` per `design.md` Decision 4, and do not also pass `result.warnings`.
      Call `todayKey()` once and pass it down, per Decision 11. Set and restore `document.title` per
      Decision 13. Render an empty state with a Calendar link when no cycle resolves. Run `pnpm test`.
- [x] 3.3 Register `/summary/:cycleId` in `src/app/router.tsx` under `RootLayout`, matching the flat
      route style already used. Do not add it to `NAV_ITEMS` in `src/app/layout.tsx` — a document route
      reached from the per-cycle view does not belong in the primary navigation.
- [x] 3.4 Add the entry point to `src/features/cycle-chart/index.tsx`: one `Button asChild` wrapping a
      `Link` to `/summary/${model.cycleId}`, beside the existing "Compare cycles" link, labelled so it
      reads as a document for an instructor. No second entry point from History, per `design.md`
      Decision 8.
- [x] 3.5 Add the case that pins the projection invariant: with `projectFutureCycles` enabled the
      document renders the same text as with it disabled, and no projected cycle day appears. This is the
      behavioural guard `design.md` Decision 9 asks for in place of a check for a value that cannot arrive.

## 4. Print behaviour

- [x] 4.1 Add a `@media print` block to `src/index.css` per `design.md` Decision 10: `@page` margins, and a
      `.print-sheet` class re-declaring `--background`, `--foreground`, `--card`, `--card-foreground`,
      `--muted`, `--muted-foreground`, and `--border` to light values, plus a rule unclipping
      `[data-slot="table-container"]`. Keep the file's 4-space formatting, which `.oxfmtrc.json` requires.
- [x] 4.2 Add `print-sheet` to the document's root element, and `print:hidden` to the shell header and to
      the document's own controls in `src/app/layout.tsx` and the summary view. Add `print:p-0` to the
      shell's `main` so the document starts at the top of the page, and `print:break-inside-avoid` to each
      section and the per-day table so they do not split.
- [x] 4.3 Assert the print rules exist and target the sheet: read `src/index.css` in a test, or assert the
      class names on the rendered root and the controls, and confirm no screen-only control is inside the
      sheet. Then open the app in a browser at a summary route, print-preview it in both themes, and check
      it is black on white with no navigation, that the chart's window keys are gone, and that a 42-day
      cycle with every optional column still fits the page.

## 5. Remove the stale chart legend keys

- [x] 5.1 Remove the `"Predicted window"` and `"Confirmed window"` `LegendItem`s from
      `src/features/cycle-chart/index.tsx`, and the now-unused `FERTILITY_FORECAST_VISUAL` import if
      nothing else in the file needs it. `design.md` Decision 6.
- [x] 5.2 Add a case to `src/features/cycle-chart/__tests__/cycle-chart.test.tsx` asserting the legend
      carries no `Predicted window` or `Confirmed window` key **with the algorithm on**, which is the state
      the existing tests do not cover. The existing "algorithm off" assertions in
      `cycle-chart.test.tsx:49-50`, `src/features/settings/__tests__/algorithm-off.test.tsx`, and
      `src/features/calendar/__tests__/calendar.test.tsx` must keep passing unchanged. Run `pnpm test`.

## 6. Follow-up from the browser verification pass

The browser pass found one real overclaim the automated tests could not, and it is the same class of bug
the `#29` pass found: a value that is true of the engine's output and false of the user's data. With the
algorithm disabled, `buildSummaryModel` nulls `peakDay` because it was not computed — and the header's
`peakLine(null, …)` then read **"No monitor Peak reading recorded in this cycle"** on a document whose raw
log directly beneath it showed two Peak readings. The document was contradicting itself on the one sheet
whose job is to be believed.

- [x] 6.1 Add the failing case to `src/features/cycle-summary/__tests__/document.test.tsx`: a model with
      `peakDay: null`, `peakCount: 2`, and two `peak` days in its log, rendered with interpretation off,
      has no Peak day row at all, contains no "no monitor Peak reading recorded", and still shows both
      readings in the log. Run `pnpm test` and confirm it fails.
- [x] 6.2 In `src/features/cycle-summary/document.tsx`, omit the `Monitor Peak` `Fact` entirely when
      interpretation is off rather than filling it in, and add the reason as a comment at the call site so
      the omission is not "tidied" back later. Nothing else about the header changes. Run `pnpm test`.
- [x] 6.3 Re-run the browser pass for the algorithm-disabled document and confirm the header no longer
      names a Peak day while the log still carries the readings.

## 7. Verification and handoff

- [x] 7.1 Run `pnpm check` and confirm format, lint, all tests, and the build are green.
- [x] 7.2 Run `openspec validate --all` and confirm it passes.
- [x] 7.3 Confirm no dependency was added, no colour or visual token was introduced, and that
      `src/core/engine/`, `src/core/store/`, and `src/core/backup/` are untouched.
- [x] 7.4 Confirm no new string produced for the document matches a countdown, a safety claim, or a
      disclaimer, and that the only place the string "confirmed" or "predicted" may appear beside the
      window is the line stating they are not used.
- [ ] 7.5 Comment on issue #26 with the assumption list, so the record is visible from the issue thread as
      well as the pull request.
