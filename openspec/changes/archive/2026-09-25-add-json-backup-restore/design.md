# Design

## Context

The current source of truth is a Dexie database with `cycles`, `dayRecords`, and one `settings` row. Every row carries sync/version metadata, and the store re-derives cycle structure and engine output from persisted records. The active post-Peak feature also persists inferred Day Records with provenance, so backup/restore must preserve the distinction between inferred and user-authored data.

The app has no backend and no new dependency is needed for local file handling. The pure Marquette engine remains unchanged; backup validation and migration logic must stay outside `src/core/engine` and free of React, Dexie, and browser APIs. See `proposal.md` for motivation and the delta specs for the behavioral contract.

## Goals / Non-Goals

**Goals:**

- Provide a lossless, readable, versioned JSON export and replace-only restore.
- Validate and migrate a complete backup before any database write.
- Make the database replacement, cycle re-derivation, and post-Peak reconciliation atomic from the user's perspective.
- Preserve stable identity, user intent, supported metadata, and inferred-record provenance.
- Restore settings and recompute all derived interpretation from restored source data.
- Keep browser file I/O in the Settings feature and business rules in testable core code.
- Use existing shadcn/ui, Zustand, Dexie, Vitest, and fake-indexeddb infrastructure.

**Non-Goals:**

- CSV import/export, merge import, cloud synchronization, a backend, encryption, or print/PDF output.
- Persisting or restoring engine-derived fertile windows, statuses, forecasts, or other computed output.
- Changing Marquette protocol rules or adding a new interpretation mode.
- Introducing a streaming backup format or a general-purpose sync conflict-resolution layer.

## Decisions

### 1. Separate a pure backup contract from browser and database I/O

Create a framework-agnostic backup module under `src/core/backup/` (outside the pure engine) for the envelope types, serialization, validation, migration, normalization, and summary calculation. It may depend on the typed store entities but must not import Dexie, React, or browser globals.

The Settings feature will use native `File.text()`, `Blob`, and object URLs to read and download files. The store will expose operations that accept already-parsed/validated backup data and return a JSON document for the feature to serialize.

This keeps validation and migration table-driven and testable without IndexedDB, while allowing the same contract to be reused by a future sync or Python-backed implementation.

**Alternative considered:** Build JSON directly inside the Settings component and bulk-write from the UI. Rejected because it mixes file parsing, validation, persistence, rollback, and presentation, and makes migration coverage difficult.

### 2. Use an explicit backup format version independent of the Dexie version

The initial envelope is:

```json
{
  "format": "marquette-tracker-backup",
  "formatVersion": 1,
  "appVersion": "0.0.0",
  "exportedAt": "2026-09-24T23:30:00.000Z",
  "data": {
    "cycles": [],
    "dayRecords": [],
    "settings": {}
  }
}
```

`formatVersion` is the compatibility boundary for backup migrations. `appVersion` is informational, and `exportedAt` is traceability metadata. A migration registry maps each supported older version to the next shape before validation against the current shape. A version greater than the current supported version is rejected with a clear error; the app never guesses how to interpret a future format.

The Dexie schema version remains an independent local-database migration concern. Adding a Dexie table or index does not automatically change the backup format, and changing the portable data contract requires a backup migration.

**Alternative considered:** Use the app version as the migration key. Rejected because patch releases can be unrelated to data shape and a user may move between builds with the same or different app versions.

### 3. Export a consistent source snapshot, not the in-memory derived cache

Export reads all three tables in one read transaction and creates the envelope from the persisted rows. The export includes cycles, day records, and the settings row, including supported sync/version metadata and post-Peak inference/suppression fields. It does not include `output`, forecast values, or any other derived cache.

The settings payload includes the persisted settings values and metadata. The internal `demoSeeded` marker is normalized rather than treated as a user preference: it is not allowed to cause demo data to appear after a successful import. The exact normalization is implemented in the backup normalizer and covered by tests.

The file name includes a stable prefix and export date, for example `marquette-tracker-backup-2026-09-24.json`. JSON is pretty-printed with stable property ordering supplied by the serializer where practical so the file remains human-readable without relying on a CSV projection.

**Alternative considered:** Export the Zustand state. Rejected because it can contain derived output and may be a transient mirror rather than a transactionally consistent database snapshot.

### 4. Separate prepare/confirm from commit

The import flow has two phases:

```text
read file
   -> parse
   -> migrate
   -> validate + normalize
   -> build summary
   -> show confirmation
   -> commit transaction
```

A successful preparation produces a typed `PreparedBackup` containing the current-format document and summary. No database write occurs during preparation. The UI can offer a local download of the current export from the confirmation dialog, but the dialog does not automatically download anything.

The initial commit is replace-only. There is no merge path in this change. A future merge feature can reuse the prepared document and validation rules, but must define its own conflict policy.

**Alternative considered:** Replace immediately after file selection. Rejected because a file-selection event is too easy to trigger accidentally and provides no opportunity to inspect counts or preserve a current snapshot.

### 5. Make replacement, re-derivation, and post-Peak reconciliation one transaction

Refactor the existing reconciliation path so its core work can run inside a caller-provided Dexie transaction. The restore path will:

1. Clear `cycles`, `dayRecords`, and `settings` inside one read/write transaction.
2. Bulk-write the validated backup rows.
3. Normalize imported rows (`synced: false`, supported internal markers, and validated metadata).
4. Run the existing cycle-placement and post-Peak reconciliation against the restored rows.
5. Compute the restored engine output before the transaction commits where practical.
6. Commit, then refresh the Zustand mirror from the committed rows.

A failure in validation, writing, cycle re-derivation, reconciliation, or computation aborts the transaction and leaves the previous database untouched. The public store action returns a typed result that the Settings UI can map to a user-facing error.

This is necessary because the current store reconciliation helper owns its own transaction and refreshes afterward. Keeping two independent transactions would allow a failed post-import reconciliation to leave a partially restored database.

**Alternative considered:** Clear and write first, then call the existing `hydrate()` path. Rejected because it cannot guarantee rollback across re-derivation/reconciliation and would briefly expose a partially restored state.

### 6. Re-derive structure while preserving authoritative records and metadata

Imported `cycleId` and `dayInCycle` values are treated as hints, not authoritative structure. After writing the source rows, the existing placement logic re-derives cycle membership, cycle days, cycle numbers, and open/closed boundaries. Stable record UUIDs are retained, and existing cycle rows are matched by day 1 so pinned starts and surviving cycle metadata remain associated where possible.

A record with `dataOrigin: 'inferred'` remains inferred when untouched. A record edited by the user is persisted with `dataOrigin: 'user'` and is never automatically removed by post-Peak reconciliation. Legacy rows without provenance are normalized as user-authored. Inference lineage and post-Peak suppression records are retained.

`synced` is reset to `false` for imported cycles, records, and settings; `version`, `createdAt`, and `updatedAt` are retained after validation so future sync code has revision context. Re-derived relationship fields may be updated without changing the record identity.

**Alternative considered:** Trust the exported cycle relationships exactly. Rejected because cycle placement is already re-derived after ordinary writes and a stale relationship would reintroduce inconsistent day numbers after restore.

### 7. Validate strictly before migration output is accepted

The validator checks the envelope discriminator and version, required arrays/objects, unique non-empty identities, date-key syntax, current-date bounds for Day Records, supported enum values, numeric ranges, cycle/date relationships that are meaningful before re-derivation, and the settings ranges already enforced by the Settings UI. It reports structured error codes rather than throwing raw JSON/TypeScript errors.

Backward-compatible omissions may be filled by an explicit migration or normalizer (for example, missing provenance means user-authored). Unknown or newer format shapes are not silently coerced. A backup with an empty dataset is valid when it still contains a valid settings object; restoring it produces the normal empty state.

**Alternative considered:** Repair or skip invalid rows during import. Rejected because partial repairs make a backup appear successfully restored while silently losing data.

### 8. Add a focused Data & backup Settings section

Extend `SettingsView` with a `Data & backup` section between Display & protocol and Danger zone. Add an export button, a JSON file input, a validation/error status region, and a confirmation dialog modeled on the existing clear-data dialog.

The dialog shows the backup format/app version, export timestamp, and cycle/day-record counts. The destructive action remains disabled until the user acknowledges replacement of current records and settings. A secondary action may download the current local backup. Errors identify the rejected condition but do not print the full health data payload to the UI or console.

Use existing shadcn/ui primitives and browser APIs; do not add a file-serialization or schema-validation dependency.

## Risks / Trade-offs

- **Large backups consume browser memory while being validated** → Keep the initial format JSON-based and hobby-scale; avoid logging payloads; consider a size guard or streaming format only if real data demonstrates a need.
- **Re-derivation can discard metadata attached to a cycle that no longer exists** → Match and preserve existing cycle rows by day 1, retain pinned boundaries, test notes/pinned behavior, and treat only user-entered record content and supported settings as lossless guarantees.
- **A future app adds a field without incrementing the format version** → Require a format migration for every incompatible portable-shape change and test that newer versions are rejected.
- **Importing an old backup can change settings and inferred-record behavior** → Show a full summary, require explicit acknowledgement, and run the same reconciliation path as ordinary writes.
- **A transaction succeeds but the subsequent Zustand refresh fails** → Treat the database as committed, surface a recoverable refresh/reload error, and ensure the next hydrate rebuilds the mirror; do not attempt a second destructive write.
- **Browser file APIs differ across older PWA environments** → Use broadly supported `File.text()`/Blob APIs, provide accessible error states, and keep the core contract independent of the browser.

## Migration Plan

1. Add the pure envelope, normalizer, validator, migration registry, and table-driven unit tests with no UI or database dependency.
2. Add repository snapshot/bulk-restore primitives and refactor reconciliation into a transaction-aware helper; add store tests for atomic replacement, rollback, settings, metadata, provenance, and re-derivation.
3. Add the Settings Data & backup section, native file download/import handling, confirmation/summary/error states, and UI tests.
4. Update user-facing documentation with backup contents, replace-only behavior, unsupported-version handling, and the fact that files remain local.
5. Run `pnpm test`, `pnpm lint`, and `pnpm build`; verify no new dependency and no regression to clear-data or post-Peak behavior.

Rollback is additive: remove the Settings controls and backup module/store actions without changing the existing Dexie schema. Existing backups remain ordinary JSON files and are not deleted or modified by rollback.
