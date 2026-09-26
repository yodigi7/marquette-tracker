# Design

## Context

See `proposal.md` — Why. The current state that matters for the approach:

Three separate places gate a day's derived status on that day having a stored record. `computeCycle` builds its `days` array by mapping over the record list, the Calendar's `resolveCell` returns `info: null` when no record is found for the date, and the Cycle chart's `buildStripModel` looks the day up in that same record-derived array. The Status view is the exception: it already calls the window function with no record gate, which is why the Status page and the Calendar currently disagree about a day that was never logged.

The engine already exports `statusForCycleDay` for extrapolating a status to a cycle day with no record. It is covered by tests and has no production caller, so the capability exists and every consumer declined it.

The `postPeakFill` planner exists to put a stored Low row on every date from `peakDay + postPeakDays + 1` onward so those days would pass the record gate. It runs inside a Dexie transaction on every write, carries staleness tracking, a 30-row budget, a user-delete suppression list, and a fill-mode setting that gates when generation starts.

Two derived concepts are being removed, and they are independent of each other:

```
  dataOrigin  "did the APP invent this row?"      -> removed; nothing is invented
  source      "does this rest on YOUR reading,       -> removed by decision
               or on a calendar rule?"
```

`source` is not provenance. It is epistemic strength, and it currently drives real presentation: the Calendar picks `predictedFill` over `fill` based on it, and the chart picks a dashed or solid window outline from it. Removing the axis removes those two treatments, which is a visual flattening the user chose deliberately.

## Goals / Non-Goals

**Goals**

- One rule for when a day has a status: the window decides, not the record list.
- Store nothing the user did not enter.
- Delete the write-path reconciliation entirely rather than leaving it inert.
- Keep the engine pure and table-testable; the fix must not touch the fertile-window begin/end rules.

**Non-Goals**

- Changing the begin/end rules, the peak-evidence boundary, or cycle placement.
- Introducing a data-version bump, or any carry-forward of the removed settings and record fields for the sake of reading an older document.
- Preserving the predicted/confirmed visual distinction in any form, including a renamed equivalent.
- Redesigning the band palette, the legend grouping, or the phase-first calendar work from the preceding change.

## Decisions

### Day results span the window, not the record list

`computeCycle` will emit a `DayResult` for every cycle day it is asked to cover, deriving the status from the window rather than mapping over records. The record list remains the source of Peak and window-boundary evidence and nothing else.

The engine needs to know how far to extend. A closed cycle has a length, so the span is unambiguous. An open cycle has none, so the span is bounded by today — a derived band may not claim a future date, because future dates belong to the forecast treatment and because the window can still move.

**Alternative considered — leave the engine alone and widen at each consumer.** Each consumer would call `statusForCycleDay` with its own bound. Rejected: three consumers would each re-derive the same bound and could disagree, and `CycleResult.days` would remain a record-shaped array that consumers must know not to trust.

**Alternative considered — synthesize display-only rows in the store.** Rejected: that recreates exactly the generated-record model being removed, and reintroduces the reconciliation problem.

### `end: null` paints forward to today, not forever

When no Peak is known the engine reports `end: null`, and the status function treats a null end as "fertile, unbounded." Painting that unbounded would smear across every future cell. The bound is therefore today, which means an open cycle with no Peak shows a solid band from the window begin through today and the forecast treatment beyond it.

This makes the derived window and the forecast numerically inconsistent for the same cycle: `predictFertileWindow` falls back to a day-6-to-day-21 band when it has no peaks, while the derived window is day-6-to-today. That is acceptable because the two answer different questions — one is what the protocol expects, the other is what is still open right now — and the solid/dashed split already communicates the difference. Aligning them was considered and rejected: it would require inventing an end day the protocol does not provide, and it would silently mark a still-open window as closed.

### Forecast applies only to future dates

`resolveCell` currently matches the forecast range without comparing to today, and the range is anchored on the newest cycle's `day1`, so it routinely covers present and past dates. With derived bands painting those same dates, both treatments would compete on one cell. Forecast becomes `inForecast && dateKey > today`.

Note that `DayCell` already prefers forecast over the phase fill when both apply, so the visible conflict resolves in forecast's favor today — which is how a confirmed fertile day after a logged Peak can currently render as predictive. Restricting the match removes the overlap rather than relying on that precedence.

### Deletion over deprecation

`postPeakFill.ts`, the reconciliation entry points, `recordsForMode`, `suppressionFor`, `clearSuppressionsForDate`, and the `dataOrigin` / `inference` / fill-mode / suppression types are removed outright. Nothing is kept behind a flag.

The reason this is safe is an invariant that already holds: any row the user edits is rewritten with `dataOrigin: 'user'`, and any row the user deletes is gone. So `dataOrigin === 'inferred'` provably identifies rows the user never touched, which is what makes the purge below safe rather than merely convenient.

**Alternative considered — keep the generator behind a default-off setting.** Rejected: the code would stay load-bearing for cycle placement and the algorithm-off path, so it could not be deleted later without redoing this analysis, and the "hiding inferred rows when off" behavior would remain a permanent special case in the store.

### Purge stored autogenerated rows when local data loads

Rows the app generated under the old behavior are deleted when the app loads local data, and again after a confirmed restore. Without this they would survive as ordinary Low readings the user never entered — the exact failure this change exists to remove — and because the field identifying them is being deleted, no later point could recognize them as wrong.

Two consequences shape the implementation:

```
  Task 4.3 removes the origin field from the shared record type.
        |
        v
  The purge has no declared field left to filter on, and
  gating it behind a version flag would mean carrying new
  persistent state forever to skip work that is a no-op
  after the first run.
```

So the purge filters the legacy field through a locally-declared row shape rather than resurrecting it on the shared type, and runs unconditionally on every load. That is safe because the operation is idempotent: after the first run nothing matches, so repeat runs remove nothing and cost one scan.

Restore needs no restore-specific validation. Validation simply stops normalizing the legacy field, so whatever an older document carries passes through to storage and the same purge removes those rows on the load that follows. There is one purge routine and one place it is called from.

**Alternative considered — gate the purge behind a stored schema version.** Rejected: it adds a permanent settings field whose only job is to skip a no-op, and introduces a version to keep in step with a format that is otherwise unversioned.

**Alternative considered — leave the rows and tell the developer to clear site data.** Rejected: it leaves the app displaying readings the user never entered, with no way for the app itself to know they are wrong.

### Backup format version stays at 1

The change only removes fields from the exported shape; it never introduces a new one and never changes the meaning of a retained one. The version number tracks shape compatibility, and a document produced by the new code is still a valid v1 document. `openspec/specs/data-backup` already commits to migrating supported older versions, so an older export is still accepted. The legacy record-origin field it may carry is not validated, normalized, or persisted as meaningful state; it survives only long enough for the purge to identify the rows it marks, which the design decision above relies on.

**Alternative considered — bump to version 2 and reject v1.** Rejected: it would turn a field removal into a breaking change for no benefit, given there is no compatibility commitment to protect.

### One status treatment per status

Removing `source` means `FertilityStatusVisual.predictedFill` and the `--fertility-source-*` tokens lose their only consumer and go with it. The chart's window reference area keeps a single outline treatment.

The `-predicted` color tokens in `src/index.css` become unreferenced. They are removed in the same pass rather than left dormant, because leaving a defined-but-unused color that means "less certain" invites a future surface to reach for it and reintroduce the axis this change deletes.

## Risks / Trade-offs

**The band now covers many more days, which changes what "unlogged" looks like.** A month with sparse logging becomes almost entirely colored, and the visual difference between a logged day and a derived day disappears. → Accepted deliberately: the band is a property of the cycle, and the record markers (monitor dot, menses stripe, asterisk-free provenance) remain the way the user sees what they actually entered. The Status view remains the place to interrogate a single date.

**A new user's first cycle is a long run from day 6 to today.** Until a Peak is logged the protocol genuinely considers those days fertile, so this is correct, but it is the first thing a new user sees and it may read as alarming. → Accepted per the `end: null` decision. The forecast treatment continues past today, so the run visibly stops rather than implying the app knows the future.

**Widening `CycleResult.days` changes its size and shape for every cycle.** Consumers that previously treated a short array as "the days with data" will now see a dense array, and any code that used array length as a proxy for logged coverage will be wrong. → The chart already computes its own `span` and does not read `days.length`; the Calendar reads per-date. Every `days` consumer is enumerated in `tasks.md` so each is re-checked rather than assumed safe.

**Removing `source` flattens two visual distinctions at once.** The predicted-versus-confirmed band fill and the chart's dashed-versus-solid window both collapse. → Accepted by decision. The `fertility-visuals` delta records the removal so a later change that wants certainty cues reintroduces them deliberately rather than by accident.

**Engine changes are load-bearing for cycle placement.** The store currently calls `reconcileCycleRows` twice per mutation, once before and once after generation. Removing the second call and the generation step means cycle membership is re-derived exactly once, from user records only. → The first call already passes `recordsForMode(allRecords, false)` — user rows only — as the placement input, so the surviving call has the same placement semantics as the first one today. A store test must assert that backfilling a Menses boundary still regroups cycles correctly.

**The purge is irreversible and runs unattended on every load.** A bug in the filter — a widened match, a stale import, a wrong literal — would silently delete real observations with no undo, and it would do so on startup rather than behind a confirmation. → The match is a single equality check on one field, and it runs after validation rather than in place of it. A store test asserts that a user-edited generated record survives, which is the case that would catch a filter matching too broadly. Reverting the commit restores the generator and re-derives the rows it would have created.

## Migration Plan

A single destructive step, run by the app rather than by hand.

1. On load, the store selects stored day records whose legacy origin marks them autogenerated and deletes them in a single bulk operation.
2. The same routine runs after a confirmed restore, so a backup taken before this change does not reintroduce them.
3. No other record is touched, and no cycle, setting, or identity changes.

The app is pre-release with a single user, so no data-version bump is introduced and the removed fields are not carried forward for the sake of reading an older document. Running the purge unconditionally is preferable to a one-shot flag precisely because there is nothing to protect.

Rollback is a revert of the commit. The purge has removed rows, but it removes only rows the reverted code would regenerate: restoring the generator makes it re-derive the tails from the user's own Peak and post-Peak settings on the next load, so a reverted build converges back to its original state without user data having been lost.

## Open Questions

None. The decisions that would have changed the specs were resolved before writing: the `end: null` bound paints to today, the `source` axis is removed from every surface, the fill-mode setting is removed outright, existing autogenerated rows are purged rather than left in place, and a restore of an older document is purged on the same load rather than being special-cased.
