# Tasks

Tests first. The CSV writer is a pure module, so `src/core/export/__tests__/csv.test.ts` is written
and failing before `src/core/export/csv.ts` exists.

## 1. Pure CSV projection module

- [x] 1.1 Add `src/core/export/__tests__/csv.test.ts` covering the documented column contract in one
      table-driven pass: exact header row; one row per day record sorted by date with cycle columns
      denormalized; a cycle with no day records emitted as a single `row_type = cycle` row with empty
      day cells; an empty dataset producing the header row alone with no data row; an empty cell for a
      field never recorded while a recorded `monitor: "none"` and `intercourse: false` are written
      literally; `symptoms` joined with `;` in one cell and an empty array written as an empty cell;
      a note containing a comma, a double quote, and a line break quoted so the row still parses as
      one row; a stored Celsius value passed through unchanged; a day record whose `cycleId` matches no
      cycle still emitted with empty cycle columns; UTF-8 BOM, CRLF separators, and a trailing CRLF.
      Verify with `pnpm test` — the file must fail to import `buildCsvExport` at this point.
- [x] 1.2 Add `src/core/export/csv.ts` with a pure `buildCsvExport` taking the cycle and day-record
      arrays and returning the whole document as a string, plus a hand-rolled RFC 4180 field writer.
      Import nothing but types from `@/core/store/entities` — no React, Dexie, or browser API. Verify
      with `pnpm test src/core/export` — all of 1.1 green.
- [x] 1.3 Add `src/core/export/index.ts` re-exporting the writer, matching the barrel style of
      `src/core/backup/index.ts`. Verify with `pnpm test` still green.

## 2. Settings action

- [x] 2.1 Add to `src/features/settings/__tests__/backup.test.tsx` (same file, so the shared jsdom
      Blob/anchor mocks are reused) a test that the Data & backup section exposes
      `settings-csv-export`, that clicking it calls `URL.createObjectURL` exactly once with a
      `text/csv` Blob and clicks an anchor whose download name ends in `.csv` and contains the export
      date, that no `fetch` happens, and that a status message appears. Verify it fails first.
- [x] 2.2 Add the button and handler to `src/features/settings/data-backup-section.tsx`. The handler
      reuses the store's existing `createBackup()` and writes
      `buildCsvExport(document.data.cycles, document.data.dayRecords)` to a Blob downloaded as
      `marquette-tracker-export-<exportedAt slice(0,10)>.csv`. Add the one-line description saying
      the file is for viewing or analysing data in a spreadsheet and cannot be imported back. Do not
      touch the JSON export, the restore dialog, or any store/repository file. Verify with
      `pnpm test src/features/settings`.

## 3. Documentation

- [x] 3.1 [P] Add the column contract to `README.md`'s Data portability section: every column name
      with its meaning, the `YYYY-MM-DD` date format, the empty-cell-means-not-recorded rule with
      `none`/`false` written literally, `;` as the multi-value separator, Celsius in `bbt_c`, the BOM
      and CRLF dialect, the cycle-only row, the absence of engine output and record ids, and the
      statement that the JSON backup remains the only restorable format. Add `core/export/` to the
      Project layout block. Verify by reading the table against the writer's header row, cell by cell.
- [x] 3.2 [P] Update the `AGENTS.md` non-negotiables line that still says "No PDF/CSV export for
      now" so it reads consistently with the line below it, which already scopes CSV as a separate
      low-priority human-readable export. Leave the "no printed chart" clause intact.

## 4. Scenario coverage and gate

- [x] 4.1 Walk every `#### Scenario` in the three delta specs and name the test that covers it. Add
      `scripts/__tests__/csv-export-docs.test.mjs`, which reads `README.md` and the writer's own
      header so the published column table cannot drift from the file; add a settings test that the
      Fahrenheit display preference still exports Celsius; add a settings test that the JSON export
      is still the versioned document once a CSV export exists; add a settings test that the only
      file control still accepts JSON, so no CSV import surface exists; and extend the cycle-summary
      print test to assert printing generates no file. Verify with `pnpm test`.
- [x] 4.2 Run `pnpm check` and `openspec validate --all`; both must be clean.

Verified on the branch tip: `pnpm check` exits 0 (format, lint 0 warnings, 836 tests in 43 files,
build); `openspec validate --all` reports 17 passed / 0 failed, and `openspec validate
add-csv-export --strict` reports the change valid.
