# Design

## Context

See `proposal.md` — Why. What shapes the approach:

- `src/core/backup/` is a pure, framework-free module: `createBackup(snapshot)` returns a
  `BackupDocument` built from one consistent read of IndexedDB, and `data-backup-section.tsx` turns
  that document into a Blob and an anchor click. Nothing about that path is JSON-specific except
  `serializeBackup` and the `.json` file name.
- `CycleEntity` and `DayRecordEntity` are the only two persisted shapes an export needs. A cycle is
  created by "Start a new cycle" **without** any day record, so "a cycle with no days" is an ordinary
  state, not an edge case.
- `bbt` is stored canonically in Celsius; the display unit is a preference that rewrites nothing
  (see `src/core/temperature.ts` and the data-backup temperature requirement).
- "Not recorded" and "recorded as absent" are different things in the domain: `monitor: "none"` and
  `intercourse: false` are values a user entered. The CSV has to keep that distinction or the export
  is useless for filtering.
- The engine's fertile windows, statuses, and forecasts are derived at read time and never stored.
- One spec statement needs re-scoping: `instructor-summary` currently says _the app_ SHALL NOT
  generate a CSV. A data export from Settings is not a summary, so the sentence is narrowed to the
  summary flow rather than left to contradict the new capability.

## Goals / Non-Goals

**Goals:**

- A single, self-describing file that opens correctly in Excel, LibreOffice, and Google Sheets
  without the user configuring anything.
- One place that defines the column contract, so the README table and the writer cannot drift.
- Zero new dependencies, zero new store actions, zero persisted-field changes.

**Non-Goals (design level, beyond the spec's scope):**

- Any import, merge, or round-trip of the CSV.
- Carrying engine output, so nothing in the file can be stale.
- A column-per-cycle wide format, a zip, or multiple files.

## Decisions

### D1 — One file, one row per day record, cycle fields denormalized

`buildCsvExport(cycles, dayRecords)` emits a single table: a header row, then one row per day record
sorted by date, with `cycle_number`, `cycle_start`, `cycle_closed`, and `cycle_notes` repeated on
every row.

_Alternatives._ Two files (one per entity) would need a zip to stay a single download, and a zip
writer is a dependency. A wide "one column per cycle day" layout is unreadable past a handful of
cycles. A normalized two-file export is what a database person would ask for, but the stated goal is
a spreadsheet a person opens — the denormalized row is the shape that sorts and filters with no
setup.

_Cost._ Cycle fields repeat. Accepted: it is a projection for reading, and the redundancy is what
removes the join.

### D2 — A cycle with no day records still gets a row

Such a cycle is emitted as a single row with `row_type` = `cycle`, its cycle columns filled, and
every day column empty.

_Alternatives._ Dropping it silently loses a cycle the user created. A second file is rejected by D1.
`row_type` makes the row self-identifying instead of relying on an empty date.

_Cost._ The file contains rows that are not days. A spreadsheet user filtering on `row_type = day`
gets exactly the days.

### D3 — No derived output, no identifiers, no sync metadata

The file carries user-entered values only. No fertile window, day status, forecast, record UUID,
revision counter, or `createdAt`/`updatedAt` timestamp is written.

_Alternatives._ Including computed windows would be genuinely useful for charting, but it would make
the file a snapshot of one interpretation on one day, it would tie a read-only projection to the
engine, and it would be a second place where the "derived at read time, never stored" rule has to be
honoured. Cycle length, peak day, and fertile days are all derivable from `day_in_cycle` and `date`
in the file itself. Identifiers and timestamps belong to the lossless JSON path; including them would
make the CSV look like a backup it is not.

_Cost._ A user wanting engine output re-derives it. Documented in the README.

### D4 — Temperatures are always Celsius, in a column named `bbt_c`

The writer takes no unit parameter and passes the stored number through unchanged, so the file cannot
change meaning when the display preference changes.

_Alternatives._ Honouring the display preference is friendlier at the moment of reading, but it makes
the same column hold two different units depending on who exported it, and quietly violates the
contract the JSON backup already set ("the display preference does not affect the document"). A
Fahrenheit user reading `36.5` is a one-glance fix; a silently mixed-unit column is a data-quality
bug. The unit lives in the column name, not in a prose note.

### D5 — Empty cell means "not recorded"; recorded values are written literally

`monitor: "none"` exports as `none`, `intercourse: false` as `false`, an absent field as an empty
cell, and an explicitly cleared `bbt: null` as an empty cell. Multi-valued `symptoms` become one cell
with `;` separators.

_Alternatives._ A sentinel such as `NA` or `-` would need its own legend and collides with real note
text. Empty is the convention every spreadsheet tool already understands. Semicolons (not commas) keep
multi-value cells readable in tools that split naively, and a comma inside a note is handled by
quoting.

_Cost._ A note that is literally empty and an unrecorded field look the same. That is the correct
loss of information here — the stored value _is_ an empty string.

### D6 — Hand-rolled RFC 4180 writer, UTF-8 with BOM, CRLF endings

Fields are quoted when they contain a comma, a double quote, CR, or LF, and embedded quotes are
doubled. The file is prefixed with a UTF-8 BOM and records are separated by CRLF with a trailing
CRLF.

_Alternatives._ A CSV library is a new dependency for ~30 lines of logic, against the project's
"no new dependency without the owner's awareness" rule. A BOM because Windows Excel otherwise
mis-reads accented characters in notes; the cost is a stray first character in hand-rolled parsers,
which is well-trodden. CRLF because that is what RFC 4180 specifies and what Excel expects.

### D7 — Reuse the existing backup snapshot; no new store action

The Settings handler calls the store's existing `createBackup()` and feeds
`document.data.cycles` / `document.data.dayRecords` to the writer.

_Alternatives._ A dedicated store action or repository method would be a second read path that could
drift. Reusing the snapshot guarantees the CSV and a JSON backup taken at the same moment describe
the same data, and the extra work (cloning settings) is irrelevant. The file name reuses the
document's `exportedAt`, so both files carry the same date.

_Cost._ `createBackup` is named for JSON. Accepted: it is "the consistent source snapshot", and
renaming it would churn a tested, widely-referenced contract for a naming nicety.

### D8 — Placement and wording in Settings

A third action in the existing Data & backup section, labelled "Export CSV (spreadsheet)", with
`data-testid="settings-csv-export"`. The description under the actions says the file is for viewing or
analysing data in a spreadsheet and cannot be imported back. The existing backup paragraph is left
alone.

_Alternatives._ A new "Export" section would contradict the four-section Settings spec for no gain.
Calling the button "Export data" would blur it with the backup; naming the format and the purpose in
the label keeps the distinction visible at the point of the click.

## Assumptions

Recorded here because the workflow could not ask. Load-bearing assumptions change what the user sees
or what leaves the app, so they are repeated in the pull request and carry the `needs-confirmation`
label.

| #   | Assumption                                                                                                                                              | Why it was ambiguous                                                                                                                                     | Load-bearing                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| A1  | The export is a single CSV with one row per day and cycle fields repeated, rather than two files                                                        | "a human-readable CSV export of cycle and daily-record data" does not say whether cycles and days are one table or two; one file means no zip dependency | Yes — the shape of every row in the file       |
| A2  | A cycle with no logged days gets its own row, marked `row_type = cycle`                                                                                 | The issue does not say; dropping such a cycle would lose data, and a second file is rejected by A1                                                       | Yes — extra rows appear in the file            |
| A3  | The file carries only user-entered values: no fertile windows, statuses, forecasts, UUIDs, revision flags, or timestamps                                | "useful for common analysis" could justify computed columns; "not a lossless backup" cuts the other way for the metadata                                 | Yes — what data leaves the device              |
| A4  | Temperatures are always Celsius, in a column named `bbt_c`, regardless of the display preference                                                        | The JSON backup is unit-independent, but a human-readable export could follow the display unit                                                           | Yes — the numbers in the file                  |
| A5  | "Not recorded" is an empty cell; a recorded `none` or `false` is written as the word                                                                    | The issue asks for missing values to be documented but not how; a sentinel was possible                                                                  | Yes — how the user reads every blank cell      |
| A6  | The action is a third button in the existing Data & backup section, labelled "Export CSV (spreadsheet)" with a line saying it cannot be imported back   | Placement and copy were unspecified                                                                                                                      | Yes — a new visible control                    |
| A7  | The `instructor-summary` "SHALL NOT generate a PDF, PNG, CSV, or other export file" sentence is re-scoped to the summary flow rather than left standing | The issue asks for exactly the thing that spec forbids; the sentence reads app-wide but the requirement is about producing a summary                     | Yes — it relaxes a stated app-wide prohibition |
| A8  | Symptoms are joined with `;` inside one cell                                                                                                            | Separator unspecified                                                                                                                                    | No — mechanical formatting choice              |
| A9  | UTF-8 with BOM, CRLF record separators, trailing CRLF, RFC 4180 quoting                                                                                 | Dialect unspecified                                                                                                                                      | No — invisible to the user, and documented     |
| A10 | File name is `marquette-tracker-export-<export-date>.csv`, matching the JSON backup's naming                                                            | The JSON backup sets the precedent; "export" distinguishes it from "backup" in the downloads list                                                        | No — naming, and trivially reversible          |
| A11 | Multi-value cells, free text, and dates are unchanged from stored values; no unit conversion, reformatting, or truncation anywhere                      | —                                                                                                                                                        | No — covered by A3/A4                          |

## Risks / Trade-offs

- **A cycle-only row could be mistaken for a day** → `row_type` names it, the day columns are empty,
  and the README documents the column.
- **Denormalized cycle fields repeat free text** (`cycle_notes` on every row) → a long note makes a
  wide file. Accepted: cycle notes are short by nature, and splitting them out would need a second
  file.
- **The BOM is a stray first character for hand-rolled parsers** → documented, and every mainstream
  tool handles it. The alternative (mojibake in Excel) is worse.
- **A future day-record field would be silently absent from the export** → the README column table is
  the contract, and the writer is the single place to change. A field is added to both together.
- **A day record whose cycle is missing** (only reachable through a hand-edited backup) → the row is
  still emitted, with empty cycle columns, rather than dropped.
- **Scope collision with other in-flight work** → this touches `data-backup-section.tsx`, the
  `data-backup` spec's README paragraph, and `AGENTS.md`. Anything else editing those files in
  parallel should be sequenced after this PR.

## Migration Plan

None. No stored data, schema, setting, or route changes; rollback is reverting the commit.

## Open Questions

None. Every open question would have changed the column contract, so it is resolved above.
