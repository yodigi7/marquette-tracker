# Proposal

## Why

Marquette Tracker keeps cycle records and settings only in the browser's local IndexedDB, so clearing browser data or changing devices can leave the user without a usable recovery path. The app needs a lossless, version-aware JSON backup and restore flow that protects the existing local dataset while allowing future schema evolution.

## What Changes

- Add a Settings action to export the complete supported local dataset as a readable, versioned JSON backup.
- Add a Settings action to select, validate, migrate, and restore a JSON backup.
- Make restore replace-only for the initial release; merge behavior remains a separate backlog concern.
- Validate the complete backup before writing and apply the restore atomically so invalid or failed imports leave existing data unchanged.
- Restore user-facing settings together with cycles and day records.
- Preserve stable record IDs, user content, timestamps, revision metadata, and supported provenance; mark restored records as unsynchronized.
- Re-derive cycle membership and cycle-day assignments from restored source data, then recompute engine-derived output rather than trusting stored derived values.
- Preserve inferred post-Peak records and their provenance; explicit user edits remain user-authored after restore.
- Reject unsupported/newer backup formats with a clear message and support migrations from older supported formats.
- Show a backup summary and explicit destructive confirmation, with an optional action to download the current data before replacement.
- Keep CSV import/export and merge behavior outside this change.

## Capabilities

### New Capabilities

- `data-backup`: Versioned JSON export/restore, validation and migrations, metadata/provenance handling, atomic replacement, and restore UX behavior.

### Modified Capabilities

- `app-settings`: Extend the Settings screen with the JSON backup/restore controls and confirmation flow while retaining the existing settings organization and clear-data behavior.

## Impact

- Add framework-agnostic backup envelope, validation, and migration logic outside the pure Marquette engine.
- Extend Dexie repositories/store hydration with an atomic import path and re-derivation/reconciliation after restore.
- Add Settings UI controls, file selection/download handling, confirmation/error states, and accessibility coverage.
- Add unit tests for envelope/migrations/validation and store/UI tests for round-trip, rejection, rollback, settings, provenance, and re-derivation behavior.
- No new runtime dependency is required; use existing browser file APIs and current test infrastructure.
- The change must remain compatible with the persisted post-Peak provenance and fill-mode settings already present in the data model.
