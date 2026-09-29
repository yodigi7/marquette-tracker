# Tasks

Tests first in every group: each task names the assertion to add before the code that satisfies it, and the
command that proves it. `src/features/instructor-chart/lib.ts` is the pure model and is edited throughout
groups 1-2; `document.tsx` is the printable sheet in group 3; `index.css` and `index.tsx` are single edits
in groups 4-5. Groups 1-2 must land before 3, because the sheet renders the model's output and has nothing
to assert against until the model speaks the new vocabulary.

## 1. Model — the cell vocabulary and the short date

- [x] 1.1 In `src/features/instructor-chart/__tests__/lib.test.ts`, add failing cases asserting the
      monitor row reads `L` / `H` / `P`, the menses row reads `1` / `2` / `3` for light / medium / heavy,
      the intercourse row reads `X`, the pregnancy row reads `+` / `-`, and the mucus row reads
      `L` / `H` / `P`. Run `pnpm test` and confirm each new case fails against the current words.
- [x] 1.2 In `lib.ts`, replace the exported `MONITOR_LABELS`, `MUCUS_LABELS`, `BLOOD_FLOW_LABELS` and
      `PREGNANCY_LABELS` word maps with the glyph maps, and add the intercourse mapping (currently
      inline as `Yes` / `No`). Keep the temperature text function as the stored number. Run `pnpm test`
      and confirm 1.1 passes.
- [x] 1.3 In `lib.test.ts`, add a failing case asserting a day with no record and a day whose record holds
      no monitor reading both read the same single mark in the monitor row, and that a record holding no
      value for any other row still reads an absence distinct from the blank used for a day with no
      record. Run `pnpm test` and confirm it fails.
- [x] 1.4 In `lib.ts`, collapse the two monitor-absence states onto one mark, and unify the
      already-logged-but-empty absence mark with it. Delete the now-unused `NO_READING_LOGGED` constant
      and the unreachable `MONITOR_LABELS.none` entry, and update the test import. Run `pnpm test`.
- [x] 1.5 In `lib.test.ts`, add a failing case asserting the date row holds `9/28`-style short dates with
      no year, and that a cycle crossing a month boundary shows the change of month. Run `pnpm test` and
      confirm it fails.
- [x] 1.6 In `lib.ts`, add a short-date formatter that splits the stored date key on its hyphens rather
      than constructing a `Date`, keeping the model DOM-free and free of any timezone dependency, and use
      it for the date row. Run `pnpm test`.

## 2. Model — rows, prose, evidence and legend

- [x] 2.1 In `lib.test.ts`, update the row-order case to assert symptoms and notes are absent from the
      grid even when logged, and add a case asserting they are reported once each in the per-cycle prose
      list with their cycle day. Run `pnpm test` and confirm the row-order case fails.
- [x] 2.2 In `lib.ts`, remove `symptoms` and `notes` from the grid's optional rows and extend the
      per-cycle prose list to carry both, so nothing is reported twice. Run `pnpm test`.
- [x] 2.3 In `lib.test.ts`, update the evidence cases to the compressed line: every contributing Peak is
      printed with its cycle and day, the line carries `(all on this chart)` or `(none on this chart)`
      when the run is wholly one or the other, and only the uncharted entries are marked individually when
      it is mixed. Run `pnpm test` and confirm the updated cases fail.
- [x] 2.4 In `lib.ts`, strip the charted parenthetical from each `ChartEvidence.phrase` and add the
      line-level note the document appends, covering the mixed case without repeating the note on every
      entry. Run `pnpm test`.
- [x] 2.5 In `lib.test.ts`, add failing cases asserting the model returns a legend naming each mark for
      every row it built, that a run with no pregnancy test gets no pregnancy entry, and that with
      interpretation off the legend omits the fertile-window entry. Run `pnpm test` and confirm they fail.
- [x] 2.6 In `lib.ts`, return a `legend` derived from the rows actually built, so the legend cannot drift
      from the grid. Run `pnpm test`.
- [x] 2.7 Shorten the row labels the grid prints — `Fertile window` to `Fertile`, `Cervical mucus` to
      `Mucus`, `Pregnancy test` to `Test` — asserting the new labels in `lib.test.ts` alongside the
      existing row-order case. Run `pnpm test`.

## 3. Sheet — fit the page, print the legend, absorb the prose

- [x] 3.1 In `src/features/instructor-chart/__tests__/document.test.tsx`, replace the "carries a word for
      every monitor reading" case with one asserting the sheet prints the glyphs and that the fixture's
      date cells are short-form. Run `pnpm test` and confirm it fails.
- [x] 3.2 In `document.tsx`, render the model's cells unchanged and update the grid's label column to
      `w-20`. Run `pnpm test`.
- [x] 3.3 In `document.test.tsx`, add failing cases asserting the sheet prints the legend with a
      testid, that it is inside the printed sheet rather than the toolbar, and that it is absent with
      interpretation off when the model carries no legend. Run `pnpm test` and confirm they fail.
- [x] 3.4 In `document.tsx`, print the model's legend beneath the sheet header, inside `print-sheet`. Run
      `pnpm test`.
- [x] 3.5 In `document.test.tsx`, add a failing case asserting the grid table carries a fixed layout and
      that its cells clip their own content rather than spilling. Run `pnpm test` and confirm it fails.
- [x] 3.6 In `document.tsx`, put the grid on `table-fixed` at `w-full` and give every cell
      `overflow-hidden` with an ellipsis, so a too-narrow cell elides instead of overlapping its
      neighbour. Run `pnpm test`.
- [x] 3.7 In `document.test.tsx`, update the evidence and begin-note cases for the compressed line, and
      add a case asserting the per-cycle prose list renders symptoms and notes once each beneath the grid.
      Run `pnpm test`.
- [x] 3.8 In `document.tsx`, render the compressed evidence line and the prose list. Run `pnpm test`.
- [x] 3.9 In `src/features/instructor-chart/__tests__/instructor-chart.test.tsx`, update the two
      evidence-line assertions to the compressed wording, and add a case asserting the legend reaches the
      sheet. Run `pnpm test`.

## 4. Print CSS — a landscape page for the chart only

- [x] 4.1 In `src/index.css`, add a named landscape page for the chart sheet and assign the sheet to it,
      leaving the existing global `@page` margin and its no-size declaration in place so every other
      document the app prints keeps the page it uses today. Verify by reading the block back: the global
      `@page` still declares only a margin, and the chart's page is the only one declaring a size.

## 5. Toolbar copy

- [x] 5.1 In `src/features/instructor-chart/index.tsx`, drop the instruction telling the user to choose
      landscape, keeping the sentence that printing hands the page to the browser and the app produces no
      file. Verify with a test in `instructor-chart.test.tsx` that the toolbar no longer offers orientation
      advice. Run `pnpm test`.

## 6. Gate

- [x] 6.1 Run `pnpm check` and confirm `format:check`, `lint`, `test` and `build` are all clean, and
      `openspec validate --all` passes. Fix anything the gate reports rather than relaxing it.
- [x] 6.2 Confirm by reading the diff that `core/engine`, the stored record shape, the settings shape, the
      JSON backup format and the CSV export are untouched, and that nothing is written when the chart is
      opened or printed.

## 7. Added during verification

The verify pass found that the spec's "every mark has a text equivalent" scenario and the design's
"a `sr-only` word beside it" decision had been specified but not built, so they are tasks of this change
rather than an optional extra.

- [x] 7.1 In `lib.ts`, give every row a `phrases` map from the character it prints to what the character
      means, and derive both a cell's `spoken` value and the legend from it, so the key and the grid cannot
      disagree. Verify with `pnpm test` on the chart's model.
- [x] 7.2 In `document.tsx`, render a cell's `spoken` value as screen-reader text beside its character,
      leaving a blank cell and a date to say nothing. Verify that a marked cell reads as its row's value
      in words and that an absence mark is announced rather than silent.
- [x] 7.3 Assert that the single-cycle summary does not claim the chart's named page, so the chart's
      landscape does not reach the other printable document. Verify in `document.test.tsx`.
