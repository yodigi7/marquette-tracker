# Tasks

## 1. Pure backup contract and validation

- [x] 1.1 [P] Add table-driven tests in `src/core/backup/__tests__/backup.test.ts` for the versioned envelope, readable export shape, empty backup, derived-output exclusion, metadata round-trip, legacy provenance normalization, older-format migration, newer-format rejection, malformed JSON/data, duplicate identities, invalid settings, and future dates; run the targeted suite to establish the expected failures.
- [x] 1.2 Add strict backup types, the format discriminator/version constant, structured error codes, and a build-time application-version source in `src/core/backup/` (with the minimal `vite.config.ts` wiring if needed); keep the module free of React, Dexie, and browser imports and verify the TypeScript/lint constraints.
- [x] 1.3 Implement the pure serializer, deterministic readable JSON formatting, normalizer, validator, summary builder, and versioned migration registry in `src/core/backup/`; reject unsupported future formats, apply only documented backward-compatible defaults, and run the new backup tests plus the existing engine/store suites.
- [x] 1.4 Add round-trip fixtures covering cycles, pinned starts, user records, inferred post-Peak records, edited inferred records, post-Peak suppressions, settings metadata, and empty datasets; verify the fixtures prove stable IDs/content and `synced: false` normalization.

## 2. Store and repository restore path

- [x] 2.1 [P] Add store tests in `src/core/store/__tests__/backup.store.test.ts` for consistent snapshot export, replace-only restore, full settings replacement, preserved IDs/timestamps/version/provenance, reset sync flags, cycle re-derivation, engine recomputation, algorithm-off behavior, inferred-record reconciliation, pinned boundaries, empty backup restore, and rollback on write/reconciliation failure; run the targeted suite to establish the expected failures.
- [x] 2.2 Extend `src/core/store/repositories.ts` (and `src/core/store/db.ts` only if transaction typing requires it) with a consistent three-table snapshot and transaction-scoped bulk replacement helpers; preserve the existing repository APIs and verify current CRUD/store tests remain green.
- [x] 2.3 Refactor `src/core/store/useAppStore.ts` so cycle re-derivation and post-Peak reconciliation can run inside a caller-provided transaction, while keeping the existing hydrate/write/clear-data behavior unchanged; add the backup snapshot/prepare/commit actions and verify existing store and post-Peak tests.
- [x] 2.4 Implement the atomic restore commit: clear and bulk-write validated rows, normalize imported metadata/internal markers, re-derive cycle relationships, run post-Peak reconciliation and engine computation before commit where practical, refresh the Zustand mirror after commit, and return structured success/error results; run the complete `src/core/store/__tests__/` suite.

## 3. Settings backup and restore UI

- [x] 3.1 [P] Add Settings tests in `src/features/settings/__tests__/backup.test.tsx` for the new section order, export action, JSON file selection, validation summary, disabled-until-acknowledged replacement, optional current-backup download, cancel/no-write behavior, unsupported/invalid backup errors, and no network upload; run the targeted suite to establish the expected failures.
- [x] 3.2 Add `src/features/settings/data-backup-section.tsx` using existing shadcn/ui primitives and native `File.text()`, `Blob`, and object URLs; integrate the Data & backup section into `src/features/settings/index.tsx` between Display & protocol and Danger zone, and run the focused Settings tests.
- [x] 3.3 Implement accessible summary, warning, confirmation, optional safety-download, progress/error, and success states for export/restore; ensure selecting or cancelling a file never writes, confirm restores the full dataset, and verify the Settings/Calendar/Status views rehydrate from the restored store.

## 4. Documentation and validation gates

- [x] 4.1 Update `README.md` (and any user-facing Settings copy) to document JSON backup contents, local-only file handling, replace-only restore, supported-version/migration behavior, inferred-record handling, and the separate CSV/merge backlog; verify the documentation matches the implemented labels and errors.
- [x] 4.2 Run `pnpm test`, `pnpm lint`, `pnpm build`, `openspec validate --all`, and `git diff --check`; verify all gates pass, no dependency was added, and existing clear-data, settings, cycle-placement, and post-Peak behavior remains intact.
- [x] 4.3 Reject backups containing duplicate Day Record dates with a structured error and a rollback regression test; run the backup/store suites and the full quality gates.
