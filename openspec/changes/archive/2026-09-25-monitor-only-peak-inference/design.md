# Design

## Context

The current pure engine derives `peakDay` from the latest monitor Peak and latest mucus Peak, then uses that result for begin/end rules, forecasts, post-Peak planning, and auto-open eligibility. The store already persists inferred Low rows with provenance, suppression, a 30-row budget, cycle/future-date boundaries, and immediate reconciliation. The archived `harden-post-peak-reconciliation` work already provides atomic source-mutation/reconciliation transactions, hydration gating, algorithm-off inferred-data hiding, and user-only initial cycle placement.

This change is therefore a delta on that baseline: it introduces monitor-only engine evidence, a four-day default, monitor-High tail interruption, explicit user-only evidence in every placement pass, and an input-only Calendar dialog. Mucus fields remain part of daily records and chart overlays, but they will not be engine evidence.

See `proposal.md` for motivation and the capability deltas under `specs/` for the behavioral contract.

## Goals / Non-Goals

**Goals:**

- Make user-entered monitor Peak the only Peak evidence in the current engine, post-Peak planner, forecasts, and auto-open eligibility.
- Use a default four-day post-Peak interval, with the inferred Low tail beginning at P+5 for the default.
- Keep inferred Low records available for algorithm-on coverage/display calculations without allowing them to establish evidence or cycle boundaries.
- Make a user-entered monitor High stop the active tail and make a later monitor Peak start a fresh tail.
- Make every cycle-placement pass use user-authored records as boundary evidence.
- Remove computed status text from the Calendar day-entry dialog while preserving provenance and input behavior.
- Update user-facing copy that currently hard-codes the old post-Peak default.
- Keep the pure engine framework-independent and table-driven.

**Non-Goals:**

- No Marquette/Creighton/mixed protocol-mode selector; that decision is tracked in GitHub issue #12.
- No repeated-Peak method research or new synthetic Peak/High sequence; that research is tracked in GitHub issue #11.
- No removal of mucus logging or mucus chart overlays; they become inert with respect to engine calculations.
- No redesign of atomic reconciliation, hydration ordering, or algorithm-off inferred-data retention already delivered by the archived hardening change.
- No new runtime dependency, backend, export, or cloud-sync behavior.
- No retroactive generation of future dates or inferred High/Peak records.

## Decisions

### 1. Carry provenance into the pure engine and filter evidence there

Add optional `dataOrigin` to `DayRecordInput`. Records without the field remain user-authored for backward compatibility. `computeCycle` will sort all supplied records, derive an evidence subset containing only user-origin records, and use that subset for Peak, begin, end, and confirmation rules. It will still return day results for every supplied record so inferred Low rows remain available to display and coverage views.

`computePeak` will inspect only `monitor === 'peak'`. Mucus High/Peak values will no longer contribute to any engine rule. `PeakSource` will narrow to the monitor-only output contract (`monitor` or `none`). Store calls may continue to pass all records when interpretation is enabled; the engine enforces the evidence boundary itself. Pure-engine callers and forecasts therefore cannot bypass it.

Alternative: filter records only in the store before `computeAll`. Rejected because it would make the evidence rule depend on a particular caller and duplicate mode logic.

### 2. Treat `postPeakDays` as the configurable four-day default

Change the pure-engine default and persisted settings default from 3 to 4. The existing settings control and validation range remain unchanged. The settings repository's default merge gives 4 to a missing legacy value; an explicitly persisted user value is not overwritten. Users can still choose another configured interval, and both the monitor-only fertile-window end and fill boundary use the same value.

At the default, monitor Peak P produces an inclusive fertile window through P+4 and a first inferred Low candidate at P+5. The fill boundary remains `monitorPeakDay + postPeakDays + 1`; it is not derived from mucus or from a different historical end.

Status explanations currently hard-code "3 days after Peak". They will be changed to derive the count from the configured setting or use configuration-neutral wording, with component/unit coverage for the new default.

Alternative: introduce a separate fill offset independent of the fertile-window setting. Rejected because it would allow the displayed window and automatic tail boundary to disagree without a user-visible reason.

### 3. Make the post-Peak planner monitor-only and interruption-aware

Rename the planner's cycle input to explicit `monitorPeakDay` semantics. The store will pass the monitor-only engine result, and the planner will inspect user-origin records for monitor Peaks and monitor Highs.

For each active fill window the planner will:

1. find the latest user-entered monitor Peak;
2. calculate the configured tail start;
3. find the earliest user-entered monitor High on or after that start;
4. generate inferred Low rows only before that High;
5. invalidate inferred rows at and after the High that are no longer eligible;
6. when a later monitor Peak exists, use it as the new window basis and reset the generated-row budget.

A user-entered monitor Low, notes, BBT, intercourse, or another non-monitor field does not stop the current tail. A mucus Peak is ignored. A later monitor Peak starts a fresh tail, including after a High stopped the prior one.

The existing `after-user-low` mode remains available, but its anchor search is also bounded by the same High-stop rule. `auto-after-window` remains the default, and the existing 30-generated-row budget is unchanged.

Alternative: make any user-authored row stop the tail. Rejected because the confirmed interruption is specifically a monitor High, and ordinary notes/BBT edits must not destroy an eligible tail.

### 4. Keep inferred Low records in algorithm-on coverage but out of all boundary evidence

The store will continue to persist inferred Low records with provenance. With interpretation enabled, they remain available to Calendar/chart/record-coverage views and read-time day-result output. With interpretation disabled, the archived algorithm-off hiding and retention behavior remains unchanged.

Every cycle-placement pass will use user-origin records as the `placementRecords` input. Generated rows will be assigned to the already-derived cycle and day number only after placement is known. In particular, the final post-generation assignment pass will retain the user-only placement context rather than re-deriving boundaries from all records.

The pure engine will independently enforce the same evidence rule through `DayRecordInput.dataOrigin`, keeping store placement and engine evidence coherent.

This change does not revisit the archived atomic transaction, hydration gate, or `recordsForMode` implementation; it adjusts the final placement call and the engine contract around them.

### 5. Make auto-open and status copy monitor-only

Because `shouldAutoOpenToday` already reads the engine's `peakDay`, the monitor-only engine change automatically makes a mucus-only Peak insufficient to suppress today's auto-open. The Calendar spec and tests will be updated to require a user-entered monitor Peak for suppression; mucus-only and other mucus values remain visible but do not block the prompt.

The Calendar day-entry dialog will remove the computed selected-status calculation and status description from `src/features/calendar/index.tsx`. It will continue to show the date, full daily-entry fields, inferred-data marker, and edit/delete actions. The read-only Status view remains the derived-status surface. Tests will assert that the dialog renders no status/source/forecast text with interpretation on or off.

Status/rule labels that hard-code "3 days after Peak" will be parameterized so the new four-day default and other configured values are described accurately.

### 6. Keep protocol-mode and repeated-Peak research outside this change

GitHub issues #12 and #11 document future decisions. This change establishes only the confirmed interim monitor-only behavior, four-day default, High interruption, and dialog behavior. It does not add a protocol selector or infer synthetic Peak/High values.

## Risks / Trade-offs

- **Existing settings retain an explicit value of 3** -> New/missing values use 4, but an existing user who saved 3 keeps 3. The UI and documentation identify the current value and new default; the user can change it explicitly.

- **Monitor-only behavior changes historical calculations and auto-open** -> Update engine, forecast, planner, store, Status-label, and Calendar auto-open tests together; label the change as an intentional protocol decision.

- **Removing mucus Peak from the engine can allow today's prompt in a mucus-only-Peak cycle** -> Update the Calendar requirement and test the exact mucus-only case so the new behavior is explicit.

- **High stop removes previously inferred rows** -> Only rows with inferred origin are invalidated; the user-authored High and all other user rows are preserved. Add reconciliation tests in both directions.

- **A later Peak creates a new tail and cap** -> Persist the monitor Peak/window basis in inference lineage and test Peak-after-High transitions.

- **Inferred coverage and observed-evidence statistics become mixed** -> Keep provenance visible, qualify coverage behavior as algorithm-on, and preserve algorithm-off isolation.

- **Final cycle assignment could accidentally reintroduce boundary feedback** -> Retain user-only placement input in every pass and add a regression asserting inferred rows cannot split or move cycles.

- **Removing dialog status reduces context** -> The dedicated Status view remains available, and the dialog stays focused on logging/provenance.

## Migration Plan

1. Replace the old-contract engine assertions that currently expect mucus-only Peak to count and monitor-plus-mucus to select the later date; add the monitor-only and default-four table cases first.
2. Add failing planner/store tests for monitor-only anchors, P+5 default start, High interruption, later-Peak restart, and user-evidence-only final placement.
3. Change pure-engine types/evidence filtering, default settings, planner inputs, and the final placement call; preserve explicit persisted settings and the archived atomic/hydration behavior.
4. Remove the Calendar dialog status line and update auto-open, Status-label, and component coverage.
5. Update project guidance, specs, and user-facing documentation from default 3 / monitor-or-mucus to default 4 / monitor-only, while keeping mucus logging and overlays documented as inert for the engine.
6. Confirm the earlier post-Peak fill and hardening changes remain archived and their durable specs are the baseline for this delta.
7. Run `pnpm test`, `pnpm lint`, `pnpm build`, `openspec validate monitor-only-peak-inference --type change`, `openspec validate --all`, and `git diff --check`.

Rollback is a code/configuration revert. Existing user-authored records and persisted inferred provenance are not deleted by a rollback; a later cleanup can reconcile inferred rows under the prior policy.

## Open Questions

None for this interim implementation. Protocol-mode selection and the method question of repeated Peak readings are intentionally deferred to GitHub issues #12 and #11.
