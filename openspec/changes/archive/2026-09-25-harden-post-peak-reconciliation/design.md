# Design

## Context

The store currently owns persisted `dayRecords` and derived output in one state object, while several feature views read the raw record list directly. Reconciliation currently opens its own Dexie transaction after user/settings mutations have already committed, and `hydrate()` publishes `hydrated: true` before the reconciliation refresh completes. The combined change must preserve stored inferred rows while making the active-mode evidence and render state coherent.

## Goals / Non-Goals

**Goals:**

- Use only user-authored records and declared cycle starts for cycle placement and derived output while the algorithm is off.
- Keep inferred rows persisted but absent from every frontend interpretation surface while off.
- Keep the app loading until initial reconciliation and final refresh complete.
- Commit source mutations and reconciliation atomically through one outer Dexie transaction.
- Add regression coverage at store, provider, Calendar, cycle-chart, and output levels.

**Non-Goals:**

- Change the post-Peak planner's boundary formula, cap, suppression matching, or provenance rules.
- Add a migration for legacy inferred rows without lineage; that remains GitHub issue #10.
- Add a new database table, dependency, or cloud synchronization behavior.
- Change the algorithm-on presentation of eligible inferred rows.

## Decisions

### 1. Separate persisted records from active evidence

The store will retain all records in IndexedDB, but when `algorithmEnabled` is false it will derive cycles and output from `isUserRecord` evidence only. Existing inferred rows will not be reassigned, deleted, or used as placement evidence while off; they remain available for the next algorithm-on reconciliation.

A shared selector/helper will expose the records that the current mode permits the frontend to render: all user records plus inferred records only when interpretation is enabled. Calendar, cycle-chart, and any record-dependent dialogs will consume that view; Status and History will consume output derived from the same user-only evidence. This keeps the raw backend state available without allowing inferred rows to leak into the UI.

Alternative considered: remove inferred rows while off. Rejected because the feature requires retained inferred data and re-enable reconciliation.

### 2. Extract transaction-aware reconciliation

The current transaction body in `reconcileGeneratedRecords()` will be split into an internal operation that assumes an active transaction and a public wrapper for callers that need their own transaction. A shared mutation helper will open one `rw` transaction over cycles, day records, and settings, execute the source mutation, then execute reconciliation in that same transaction. It will call the in-memory refresh only after the transaction commits.

`addDayRecord`, `removeDayRecord`, `setNewCycle`, and `updateSettings` will use this helper. The helper will return values needed by callers such as `setNewCycle` without publishing a partially refreshed state. The existing hydration path will use the same internal reconciliation operation without nesting a second transaction.

Alternative considered: leave writes and reconciliation as separate transactions and retry on failure. Rejected because the user requested atomic persistence and a retry can still leave a visible mismatch.

### 3. Publish hydration after the final refresh

`hydrate()` will load the persisted snapshot while `hydrated` remains false, run the transaction-aware reconciliation and final refresh, and set `hydrated: true` only after all of that resolves. If reconciliation rejects, the flag remains false and the rejection follows the existing async boot error path; the provider does not render the partial state.

### 4. Coordinate algorithm-off and atomic writes

An algorithm-off user write still changes user evidence and must be committed atomically with the user-only reconciliation pass. Existing inferred rows remain untouched during that pass. When the algorithm is re-enabled, the normal full reconciliation sees all persisted records, repairs assignments, and applies the active fill mode.

## Risks / Trade-offs

- **Filtering must be applied consistently** → Centralize the visible-record policy and add tests for Calendar, cycle-chart, Status, and History behavior.
- **A larger transaction holds more tables longer** → Keep the transaction limited to local IndexedDB operations and avoid network/framework work inside it.
- **Refresh failure after commit** → Treat the database transaction as authoritative; propagate the error and recover on the next hydration/reconciliation attempt.
- **Existing inferred rows can have stale assignments while off** → Keep them hidden and reconcile all rows on algorithm-on hydration/writes.
- **Failure-injection tests may be sensitive to Dexie internals** → Test rollback through a controlled reconciliation failure and verify the persisted source record/settings state after rejection.

## Migration Plan

1. Add the user-only evidence/display selector and tests.
2. Extract transaction-aware reconciliation and migrate mutation paths.
3. Move the hydration flag transition after reconciliation.
4. Add rollback, algorithm-off, hydration, and cross-view tests.
5. Run `pnpm test`, `pnpm lint`, `pnpm build`, and OpenSpec validation.

Rollback is a code-only revert. Existing inferred rows and suppressions remain in IndexedDB and require no migration.
