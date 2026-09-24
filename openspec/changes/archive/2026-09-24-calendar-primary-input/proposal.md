# Proposal

## Why

The current Today view mixes daily input, cycle creation, and read-only status, while the Calendar already provides date-based entry for every day. Making Calendar the default and sole input surface reduces navigation and keeps cycle placement tied to the dates where observations are actually recorded. Status remains useful as a separate read-only view.

## What Changes

- Make `/` render the Calendar and remove the `/calendar` route.
- Replace the Today navigation destination with a read-only Status destination at `/status`.
- Make Calendar the only daily-input surface; move the shared quick-entry form out of the Today feature and remove the explicit start-cycle form.
- Preserve the date picker in Status so a selected day's derived status can be inspected without entering data.
- On the first Calendar opening for a date within a browser session, automatically open today's input when no record exists for today and today's derived cycle has no Peak. Do not auto-open when today's data exists or when the current cycle has a monitor or mucus Peak. Mark the date consumed only when the dialog actually opens.
- Keep multiple Peak readings valid: any Peak in the current derived cycle suppresses automatic opening, while the existing engine continues to use the latest Peak for window calculations.
- Remove the medical disclaimer from the application UI and remove its requirement/references from project guidance and documentation.
- Update navigation, empty states, tests, and project documentation to reflect the new routes and responsibilities.

## Capabilities

### New Capabilities

- `status`: Provide a read-only Status view with a date picker and derived cycle-status summary.

### Modified Capabilities

- `app-shell`: Replace Today/Calendar navigation with Calendar at `/` and Status at `/status`, and update route and active-navigation requirements.
- `calendar`: Add the Calendar-first default and session/day-scoped automatic opening of today's input.
- `app-settings`: Update algorithm-off and clear-all-data expectations to refer to Status/Calendar rather than the removed Today view.

## Impact

- `src/app/router.tsx` and `src/app/layout.tsx`: Change routes, labels, and active navigation.
- `src/features/calendar/`: Own the shared daily-entry dialog and automatic today's-input behavior.
- `src/features/today/`: Retain status-only behavior, move shared entry/date helpers, and remove start-cycle/input-specific code.
- `src/features/cycle-chart/`: Update the empty-state link and copy when no cycle exists.
- `src/features/settings/__tests__/algorithm-off.test.tsx` and related view tests: Replace Today expectations with Status/Calendar expectations.
- `AGENTS.md`, `README.md`, `IMPLEMENTATION_PLAN.md`, `openspec/config.yaml`, and milestone documentation: Remove the medical-disclaimer requirement and update the view/route descriptions.
- No new dependency, database schema, or engine behavior is required.
