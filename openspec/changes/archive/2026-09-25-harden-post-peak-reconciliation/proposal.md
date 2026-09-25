# Proposal

## Why

The post-Peak fill feature has three related consistency gaps: generated rows can influence cycle placement while interpretation is off, the app can render before hydration reconciliation finishes, and user/settings mutations commit separately from reconciliation. Together these can expose stale or partially reconciled state even though the core fill planner is correct.

## What Changes

- Treat user-authored records as the only cycle-placement and derived-output evidence while the fertile-window algorithm is off; retain inferred rows in IndexedDB but hide them completely from the frontend.
- Keep the app loading and `hydrated` false until initial post-Peak reconciliation and its final refresh complete successfully; failed hydration must not expose unreconciled state.
- Make day-record, deletion, settings, and cycle-start mutations atomic with their reconciliation by extracting a transaction-aware reconciliation operation and using one outer Dexie transaction.
- Refresh in-memory state only after the combined database transaction commits.
- Add cross-layer regression coverage for algorithm-off visibility/placement, hydration ordering/failure, and reconciliation rollback.

## Capabilities

### New Capabilities

<!-- None -->

### Modified Capabilities

- `post-peak-fill`: Algorithm-off inferred-data isolation, hydration ordering, and atomic mutation/reconciliation behavior.
- `app-settings`: Logging-only mode must retain but hide inferred data and ignore it for interpretation/cycle derivation.
- `calendar`: Calendar must completely omit inferred rows while the algorithm is off while continuing to show user-authored data.

## Impact

- `src/core/store/useAppStore.ts`, `src/core/store/selectors.ts`, and related repository/transaction helpers.
- `src/app/providers.tsx` hydration gate.
- Calendar, cycle-chart, history, and status data selectors/views.
- Store, provider, Calendar, cycle-chart, and hydration tests.
- No new dependency, storage schema, or data migration.
