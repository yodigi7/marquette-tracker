# Proposal

## Why

The current engine combines monitor and mucus Peak evidence and the Calendar day-entry dialog exposes a computed status even though it is primarily a logging surface. The post-Peak fill also needs a clear monitor-only contract: after the current/latest user-entered monitor Peak window and the four configured post-Peak days, inferred Low records should reduce repetitive manual entry without becoming evidence that invents a new Peak or changes cycle boundaries.

## What Changes

- Make the current fertility engine monitor-only for Peak and fertile-window calculations; mucus remains loggable/displayable but does not influence engine results.
- Change the default post-Peak interval to four days. With the default setting, the current/latest monitor Peak on day P is followed by post-Peak days P+1 through P+4, and the first inferred Low begins on P+5. A later monitor Peak starts a new window.
- Keep `auto-after-window` as the default post-Peak fill mode and retain the existing 30-generated-row window budget.
- Make a user-entered monitor High at or after the active tail start stop the current inferred Low tail. A later user-entered monitor Peak starts a fresh post-Peak fill window; earlier inferred rows from the stopped window are reconciled as appropriate.
- Keep inferred Low records persisted with provenance so that, when interpretation is enabled, they can participate in record-coverage and display calculations while remaining excluded from evidence used to establish Peak, fertile-window boundaries, or cycle placement. The existing algorithm-off hiding and retention rules remain authoritative.
- Remove the computed fertile-window status text from the Calendar day-entry dialog. The dialog remains an input/provenance surface; the read-only Status view remains the place for derived status.
- Keep the future Marquette/Creighton/mixed protocol-mode decision and repeated-Peak method research in the linked GitHub issues; this change implements only the confirmed monitor-only interim behavior.

## Capabilities

### New Capabilities

- `marquette-engine`: Monitor-only Peak evidence, four-day post-Peak calculation behavior, and explicit separation between user evidence and inferred Low records.

### Modified Capabilities

- `post-peak-fill`: Use monitor Peak only, stop an active tail on a user monitor High, restart after a later monitor Peak, and define how inferred Low rows participate in calculations.
- `calendar`: Remove computed status from the day-entry dialog while retaining daily input, provenance, and future-date behavior.
- `app-settings`: Change the default post-Peak interval to four days while retaining immediate persistence and the existing settings surface. The new default applies to missing/new values; an explicitly persisted user value is preserved.

## Impact

- Pure engine inputs/results and Marquette table-driven tests in `src/core/engine/`.
- Post-Peak planner inputs, reconciliation behavior, and store tests in `src/core/engine/postPeakFill.ts` and `src/core/store/`.
- Settings/defaults and persisted settings hydration for the four-day interval.
- Calendar dialog rendering and component tests in `src/features/calendar/`.
- Documentation describing monitor-only engine evidence, inferred Low coverage, High interruption, and the dialog's logging-only role.
- Existing provenance, suppression, cap, atomic-reconciliation, hydration-gating, and algorithm-off isolation work is treated as baseline; this change adds the monitor-only/default-four/High-stop/dialog delta.
- No new runtime dependency, backend, export, or cloud-sync behavior.
