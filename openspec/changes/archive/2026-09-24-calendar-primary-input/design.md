# Design

## Context

The current router assigns `/` to `TodayView` and `/calendar` to `CalendarView`. `TodayView` owns daily input, explicit cycle creation, status display, and the medical disclaimer, while `CalendarView` already resolves dates, opens the shared `QuickEntry`, and relies on store replanning to derive cycle ownership. The derived engine exposes `CycleResult.peakDay`, which is non-null whenever the cycle has a monitor Peak or mucus Peak and uses the latest such Peak for window calculations.

The user has chosen Calendar as the only daily-input surface, Status as a separate read-only route, and removal of the medical disclaimer from both the UI and project policy/documentation.

## Goals / Non-Goals

**Goals:**
- Make `/` render Calendar and expose Status at `/status`.
- Keep date-based daily entry and cycle derivation in Calendar.
- Auto-open today's input at most once per date per browser session when no record or current-cycle Peak exists.
- Keep Status date-selectable and read-only while preserving its algorithm-off explanation.
- Remove Today-specific input/start-cycle UI and remove the disclaimer requirement from project artifacts.

**Non-Goals:**
- Change the Marquette engine, placement rules, Peak calculation, database schema, or settings persistence.
- Add a new start-cycle action or preserve `/calendar` as an alias.
- Redesign the StatusCard beyond removing input/disclaimer content.
- Add a new dependency or alter the cycle-chart's data behavior.

## Decisions

### Decision 1: Give Calendar and Status separate feature ownership

Create a status feature under `src/features/status/` containing the date picker and status-only view. Make `/` render `CalendarView` and `/status` render the new status view; remove the `/calendar` route and the Today navigation item. Update `NAV_ITEMS` to use `Calendar` at `/`, `Status` at `/status`, `History`, and `Settings`.

Move `QuickEntry` into the Calendar feature because Calendar is its only product caller. Move status labels and date-picker helpers with Status, and remove the obsolete Today input/start-cycle modules after updating imports and tests. Keep the store's cycle actions available for internal/test compatibility; only the explicit start-cycle UI is removed.

This makes the route ownership match the user's input model and avoids leaving a `today` feature whose name no longer describes its responsibility.

### Decision 2: Derive auto-open eligibility from existing store and engine output

After hydration, Calendar will evaluate an auto-open candidate using the current `today` key:

1. Find a Day Record whose `date` equals today.
2. Resolve the current cycle with `cycleForDate(cycles, today)` after the store's placement pass.
3. Resolve that cycle's `CycleResult` from `cycleResultsByCycleId(output)`.
4. Treat the candidate as eligible when no record exists and either no cycle exists yet or the result's `peakDay` is null.

The candidate opens the existing day-entry dialog with today selected. The check deliberately uses `peakDay` as a boolean: monitor and mucus Peaks, including multiple back-to-back Peaks, suppress the prompt while the engine retains its latest-Peak window behavior.

Use a date-specific `sessionStorage` marker to enforce the once-per-day-per-browser-session rule. Set the marker only when the automatic dialog actually opens. A condition that was false because data or a Peak already exists is not marked consumed, so a later state change can be evaluated on a subsequent Calendar visit.

This avoids duplicating cycle-placement or Peak rules in the feature and keeps the behavior correct when today's menses entry creates a new cycle.

### Decision 3: Keep Status read-only and preserve algorithm transparency

Status will retain its date picker and `StatusCard`, including the algorithm-off logging-only explanation. It will not render `QuickEntry`, `StartCycleCard`, delete controls, or the medical disclaimer. With no cycle for the selected date it will show a no-cycle state without offering a separate start form.

The existing `StatusCard` props and derived status/window calculations remain the source of read-only information. The cycle-chart empty state will link to `/` with Calendar-oriented copy instead of referring to a Today start-cycle action.

### Decision 4: Treat the disclaimer removal as a project-policy change

Remove the visible disclaimer from the application and delete the requirement and stale references from `AGENTS.md`, `README.md`, `IMPLEMENTATION_PLAN.md`, `openspec/config.yaml`, and milestone documentation. Update affected OpenSpec deltas to refer to Status/Calendar rather than Today. No data migration is needed because this is presentation, routing, and documentation only.

## Risks / Trade-offs

- **Automatic opening can interrupt a user who only wants to browse** → It is limited to today's unlogged/no-Peak case and happens at most once per date per browser session.
- **The current cycle can change after a menses entry** → Eligibility is evaluated from the post-replan store output on each Calendar opening; no cached cycle assumption is used.
- **Removing `/calendar` breaks old links** → The user explicitly chose a single root Calendar route; no compatibility alias will be added.
- **Moving shared feature files creates broad imports/tests to update** → Sequence the move with focused component tests and finish with the full test/lint/build gates.
- **Removing the disclaimer conflicts with prior project guidance** → The user explicitly approved removing both the UI and the policy; all authoritative project documents are included in the change impact.

## Migration Plan

1. Add the Status route/module and move shared entry/status helpers without changing persistence behavior.
2. Switch the root route and navigation, then remove obsolete Today input/start-cycle code and route references.
3. Add the session-scoped auto-open behavior and focused Calendar tests.
4. Update Status, settings, cycle-chart, app-shell, and documentation expectations.
5. Run the complete test, lint, and production-build gates; no database migration or data backfill is required.
