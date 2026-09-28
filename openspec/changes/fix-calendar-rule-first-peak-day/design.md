# Design

## Context

See `proposal.md` for motivation and `specs/` for the requirements. What shapes the approach, all
verified against the code as it stands:

**The collapse is one function, and it is load-bearing in four places.** `computePeak`
(`marquette.ts:35-46`) walks the cycle's records and overwrites `monitorPeak` on every `peak`, so its
return value is the **latest** reading; it is assigned to `CycleResult.peakDay` (`types.ts:98`). That one
field then feeds:

| Reader                                    | Line                 | What it needs after this change               |
| ----------------------------------------- | -------------------- | --------------------------------------------- |
| `computeBegin` via `history.peaksByCycle` | `marquette.ts:55,68` | the **first** reading                         |
| `computeEnd`                              | `marquette.ts:88-93` | the **last** reading (unchanged)              |
| `computeCycle` → `DayResult.status`       | `marquette.ts:194`   | existence only                                |
| `engineSdk` history feed                  | `engineSdk.ts:64`    | **first**, for the next cycle's begin         |
| `projection` history build                | `projection.ts:114`  | **first** for the begin, **last** for the end |
| `predict` calendar rule                   | `predict.ts:110-114` | **first** for the begin, **last** for the end |
| `Forecast.peakDayEarliest/Latest`         | `predict.ts:74-75`   | **first**                                     |
| `Forecast.peakDayRangeInWindow`           | `predict.ts:114`     | **first**                                     |

**Confirmed, not assumed: no test can currently reach this bug.** Every `cycleNo > 6` case in
`marquette.test.ts` hand-builds its history through `historyWithPeaks([12, 16, 14, 15, 13, 14])` — a
fabricated list of single integers, never real records. The only two cases with two Peak readings in one
cycle (`"repeat highs do not move the begin after its set"`, `marquette.test.ts:223-238`, and
`:276`) are both `cycleNo: 1`, where the calendar rule is the day-6 constant and the begin comes from a
High on day 3 anyway. So no case feeds a genuine multi-day run into a later cycle's begin. The gap is
structural, not an oversight in one table row.

**Confirmed, not assumed: the demo data cannot surface it either.** `seedDemo.ts:100-103` writes
`monitor: "peak"` on exactly one cycle day per cycle (`day === peak`), with `high` on the days before
and `low` before that. Every demo cycle therefore has a single reading, `firstPeakDay` and
`lastPeakDay` coincide in all of them, and the demo's calendar begin is unchanged by this work. That is
also why the defect survived review of the app as it is actually used.

**The composed fallback is one expression, currently `12 + 3`.** `projection.ts:33-34` defines
`PROTOCOL_DEFAULT_WINDOW_BEGIN = 6` and `PROTOCOL_DEFAULT_WINDOW_END = DEFAULT_EARLIEST_PEAK +
DEFAULT_POST_PEAK_DAYS`, and both `projection.ts:173-174` and `predict.ts:104-105` consume the pair.
`DEFAULT_EARLIEST_PEAK` (`marquette.ts:21`) is documented as "earliest possible peak day 12 minus 6
yields fertile day 6" and is also used at `marquette.ts:65` for the cycle-7+ no-history begin. Under the
settled definition that constant means the earliest possible **first** Peak day, so its `begin` use is
already correct and only the composed `end` is short.

**The begin rule already has the right shape and no written rule.** `computeBegin` (`marquette.ts:72-77`)
takes the first `high`-or-`peak` record and returns it whenever it precedes the calendar day. Because
every Peak is also a High-or-Peak, the first such record is at or before the last Peak reading, so
`begin <= firstHighDay <= lastPeakDay` holds by construction. That is the invariant the new requirement
states, and it is currently true only because the arithmetic works out — nothing asserts it.

## Goals / Non-Goals

**Goals:**

- One reading per job: first reading for the calendar begin and for anything named "Peak day", last
  reading for the window end and for the retrospective count against it.
- Make the compiler, not review, responsible for catching every reader that meant the other value.
- Keep every composed number derived from a named constant, so the corrected fallback cannot drift back.
- Assert the begin invariant as a property, not a table row, so the next arithmetic change cannot break
  it silently.

**Non-Goals:**

- Any change to the three-day post-Peak interval, the day-6 first-six-cycles rule, or the monitor-only
  evidence boundary.
- Any change to mucus, BBT, or the out-of-window warning. Moving the begin earlier can only make that
  warning fire on _fewer_ days, never more, so it needs no edit.
- Retro-fitting the demo seed with multi-day Peak runs. It would exercise the corrected rule, but it
  changes what a first-time user sees in the demo and is not needed to land the fix.
- Persisting either value. Both are derived at read time like every other engine output.

## Decisions

### D1. `peakDay` is removed, not redefined

`CycleResult` gains `firstPeakDay` and `lastPeakDay`, and `peakDay` is deleted.

The alternative is keeping `peakDay` and pointing it at the first reading, adding `lastPeakDay`
alongside. It is less churn and it is what the spec's vocabulary suggests. It is also unsafe: `peakDay`
changing meaning from "last" to "first" compiles cleanly at all eight readers in the table above, and
each one silently changes behaviour. `status/lib.ts:162-177` is the concrete hazard — its count is
specified to measure from the reading the window end came from, and it would keep compiling while
measuring from the other reading.

Deleting the field turns all eight into compile errors and forces each to be re-decided. Churn is
preferable to a silent one-day error in the direction that matters.

`CycleResult.peakSource` stays as-is; it already describes monitor-or-none and is unaffected.

### D2. `CycleHistory` carries two parallel arrays, not one array of pairs

`peaksByCycle` becomes `firstPeaksByCycle` and `lastPeaksByCycle`, both `(number | null)[]`, both in
cycle order, appended in the same pass of the same loop.

The alternative is a single array of `{ first, last }` objects. It makes desync structurally impossible,
which is its real advantage, but it changes the slicing and filtering idiom at `marquette.ts:55` and
`predict.ts:96` and reads worse in the table-driven tests, where history is written as a flat literal.

Two parallel arrays keep the existing test idiom, and desync is already prevented by construction: both
are pushed in the same iteration of `engineSdk.ts:63-65` and built together at `projection.ts:113-116`.
A test asserting the two arrays are the same length guards the invariant for a future caller.

`computeBegin` reads `firstPeaksByCycle`. The peakless-cycle filter is unchanged — both arrays carry
`null` for the same cycle, so filtering one and not the other cannot disagree.

### D3. A forecast window takes its two edges from two different readings

`predict.ts` and `projection.ts` open the window from the earliest **first** Peak in the lookback and
close it from the latest **last** Peak in it.

The alternative is using first-Peaks for both edges, which is self-consistent — one measurement
throughout. It is rejected because the end rule is definitionally anchored on the last reading: if the
projection's end came from a first reading, the projected cycle would close a day or two before the
same window does once the user logs the readings that determine it. The projection would then contradict
the user's own chart for the same cycle, which is the exact failure D1 exists to prevent.

Mixing edges is deliberate and is the one place the two values are combined. It produces the widest
plausible window, each edge from the reading its own rule uses, and both edges are reported to the
surface so a reader can reconstruct them.

### D4. The fallback end is recomposed, and the minimum run is a named constant

`PROTOCOL_DEFAULT_WINDOW_END` becomes `DEFAULT_EARLIEST_PEAK + (MIN_PEAK_RUN_DAYS - 1) +
DEFAULT_POST_PEAK_DAYS` = 12 + 1 + 3 = **16**, where `MIN_PEAK_RUN_DAYS = 2` carries the Fehring 2013
citation in its doc comment. `PROTOCOL_DEFAULT_WINDOW_BEGIN` stays 6, which is `DEFAULT_EARLIEST_PEAK -
6` and is now correct by definition rather than by coincidence.

Keeping the literal 15 was rejected outright: it closes the window a day before the protocol allows,
in the direction that costs a user who is avoiding pregnancy.

Writing `MIN_PEAK_RUN_DAYS` as a constant rather than folding the `+1` into the expression is what stops
the number drifting again. The previous change to this value failed precisely because a literal from the
cycle-length band was left standing next to a derived one.

### D5. The begin invariant is asserted as a property over generated histories

A dedicated test sweeps a set of histories and current-cycle readings and asserts
`window.begin <= firstPeakDay` wherever a Peak exists, alongside the existing end invariant.

The end invariant shipped as a single table row in the previous change and did not catch the class of
bug it was written for. A table row is only as good as the case someone thought to write. The begin
invariant is a two-line property, so it is asserted directly over a generated matrix rather than left to
a named case.

### D6. Surfaces name both readings and their jobs; no surface shows a bare range

The History column, the printable summary, and Status name the Peak day, state how many readings the
cycle holds, and — when there is more than one — state the last reading and that the end is measured
from it.

Showing a range such as "12–13" was rejected. It reads as "ovulation happened somewhere in here", which
is the single-day estimate the History and Status specs already forbid, reintroduced through the
arithmetic notation rather than the word "estimate".

Showing only the Peak day and the count was rejected for the opposite reason: the reading the end came
from would then be absent from the document, and an instructor checking the stated end against the
summary would find a number with no reading behind it.

Status's retrospective count stays on the last reading, and the spec now says why: it is counted
against the end. Only the _range_ on Status moves to first-Peak readings.

### D7. `Forecast.peakDayEarliest` / `peakDayLatest` are renamed

They become `firstPeakDayEarliest` / `firstPeakDayLatest`. Same hazard as D1, smaller blast radius: two
readers in `history/index.tsx:159-166`, and their meaning silently changing would put an
incorrectly-labelled range above a correctly-computed window.

The two-field shape and the all-cycles-versus-in-window distinction documented at `types.ts:164-171` are
preserved; only the naming and the reading they draw from change.

## Risks / Trade-offs

- **The fertile window grows by one to two days from cycle 7 onward.** Every labelled fertile-day total,
  the History fertile-days stat, and the cycle chart shading move with it. Nothing is subtracted. →
  Called out in the spec scenarios so the shift is expected rather than reported as a regression; the
  change is only visible to a user who has more than six cycles with Peak readings, since below that the
  day-6 rule is unchanged.

- **A user comparing today's Status range against one they read yesterday sees it shift earlier.** The
  underlying logged data did not change. → The range is labelled as derived from past cycles, and the
  projection and forecast specs already state that these values are recomputed on every read.

- **Two parallel history arrays can desync if a future caller pushes to one and not the other.** →
  Both are appended in a single loop iteration today; a test asserts equal length, and D2's pairing
  option is recorded here as the fallback if that test ever has to be worked around.

- **The composed fallback now depends on a research citation rather than on the day-6 rule alone.** If a
  later reading of the monitor's behaviour says a one-day Peak run is possible, the fallback end
  shortens back to 15 by changing one constant. → That is the reason `MIN_PEAK_RUN_DAYS` is its own
  named constant with the citation attached, so the revision is a one-line edit with its reasoning
  intact.

- **`computeEnd`'s signature does not change, but its argument's meaning moves.** With D1 the caller has
  to pass `lastPeakDay`, so the compiler forces the right choice at `marquette.ts:180`. → No mitigation
  needed; this is D1 working as intended.

## Migration Plan

None. Nothing is stored: both values are derived from the day's records on every read, no schema field
is added or changed, and there is no version bump or data rewrite. The change is visible immediately on
the next read.

Rollback is a revert of the engine and display changes. A user who saw the corrected begin will see it
return to the later day; nothing they logged is affected either way.

## Open Questions

- **Column width on the History cycle table.** Naming both readings makes the Peak day cell wider than
  the others, and the existing scenario `"Clicking a cycle row opens that cycle's chart"` does not cover
  layout. Worth checking against the narrow viewport during implementation, and worth a truncation
  decision if it does not fit. Deferrable: it changes no requirement, and the only decision is whether
  the second clause wraps to a second line.
