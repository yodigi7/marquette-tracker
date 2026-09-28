# Proposal

## Why

The JSON backup is the right file for restoring this app and the wrong file for anything else: it is
versioned, metadata-heavy, and shaped for the code rather than for a person. There is no way to open
a cycle history in a spreadsheet, sort it by cycle day, or chart basal temperatures over time. Issue
#5 asks for a second, explicitly lesser export for exactly that inspection, and
`README.md` already points at it as a tracked gap.

The export must stay visibly secondary. It is a read-only projection for looking at data, not a
second backup, and it must not be mistaken for one.

## What Changes

- A **human-readable CSV export** of cycles and daily records, written to a local file from the
  existing Settings → Data & backup section, next to the JSON export.
- One file, one header row, one row per day record, sorted by date, with the owning cycle's fields
  repeated on each row so the file sorts and filters without a join.
- A cycle that has no day records still gets a row, so no cycle disappears from the export.
- Documented column names, `YYYY-MM-DD` date format, and a single documented representation for
  "not recorded" (an empty cell), separate from the recorded values `none` and `false`.
- The JSON backup is unchanged and remains the only restorable format. The CSV cannot be imported
  and the app does not pretend otherwise anywhere in the UI.
- The instructor-summary requirement that forbids the app from generating export files is re-scoped
  to the summary flow, which never produces one, so the spec set does not contradict itself.

## Capabilities

### New Capabilities

- `csv-export`: the human-readable, read-only CSV projection of stored cycles and day records, its
  documented column contract (names, date format, missing values), and the rule that it is never a
  restorable format.

### Modified Capabilities

- `app-settings`: the Data & backup section gains a CSV export action alongside the existing JSON
  export and import.
- `instructor-summary`: the "no export file" prohibition is scoped to producing a cycle summary; the
  summary still produces none, but the app is no longer forbidden from generating a CSV elsewhere.

## Impact

- **New code**: a pure, framework-free CSV projection module under `src/core/export/` (a hand-rolled
  RFC 4180 writer — no new dependency), a table-driven test file for it, and a small export action
  in the existing Settings backup section.
- **Existing code**: `src/features/settings/data-backup-section.tsx` gains one button and one
  handler, reusing the store's existing `createBackup` snapshot so no new store action, repository
  method, or persisted field is introduced.
- **Persisted data and engine**: untouched. Nothing is written, migrated, or re-derived, and no
  computed fertile window, status, or forecast is added to the file.
- **Docs**: `README.md` (data-portability section plus the project layout line),
  `AGENTS.md`'s non-negotiables list, which still says no CSV export exists.
- **No new dependency**, no network access, no new route, no new setting.
