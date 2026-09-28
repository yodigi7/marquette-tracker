# Tasks

Test-first throughout: the failing case is written and run before the implementation it pins, per the
project's rule for `src/core/engine`. `pnpm test` after every group.

Every decision in `design.md` is pinned by a test named in the task that implements it. Decisions 1, 2, 4
and 6 change engine output, so their tests are the evidence; decisions 3, 5, 7 and 8 are verified by the
group-4 and group-5 review tasks rather than by new engine cases.

Groups 2 and 3 both edit `src/core/engine/types.ts` and are sequenced, not parallel. Group 6 edits the two
exhaustive label maps and is sequenced after groups 2 and 3 have fixed the unions.

## 1. Engine — the end rule

- [x] 1.1 Add the failing cases to `src/core/engine/__tests__/marquette.test.ts` before touching
      `computeEnd`. Table cases, all on cycle 9 with history Peaks `12, 16, 13, 14, 16, 15`: a current
      Peak on day 20 ends on 23; a current Peak on day 10 ends on 13 and is not pulled earlier; a cycle
      with no Peak reports `end: null` and `endRule: "none"`; the cycle's Peak day and the three days
      after it are all `fertile`; days after the end are `post-peak`. Plus the invariant case, stated as
      its own test: for every case carrying a monitor Peak, `window.end >= peakDay`. Run `pnpm test` and
      confirm the three earlier-of-two cases fail.
- [x] 1.2 Rewrite the three table cases the audit identified as locking in the bug, by their current
      names: `"cycle 9: historic latest peak 16+3=19 ends before current 20+3=23 → earliest-end"`,
      `"cycle 9: current peak end 13 beats historic end 19"`, and
      `"cycle 9 without peak falls back to historic latest peak + 3"`. The first and third change
      expectation; the second keeps `end: 13` but is renamed, because "beats historic end" is no longer
      a comparison the engine makes. Confirm no other case name in the file still claims a historical
      end.
- [x] 1.3 In `src/core/engine/marquette.ts`, replace `computeEnd` with the single-expression rule and
      narrow its signature to `(peakDay: number | null)`. Update the call site at line 169. Delete the
      `history` and `settings` reads that existed only for the historical branch. Keep
      `DEFAULT_POST_PEAK_DAYS` and the doc comment explaining why it is not configurable. Run
      `pnpm test`.
- [x] 1.4 Confirm the out-of-window warning now fires only for a High after a confirmed Peak, and add
      that as a case in the `describe("out-of-window monitor evidence")` block: cycle 9, history Peaks
      `12..16`, current Peak on day 20, Highs on days 16, 17, 18 and 20 — no
      `monitor-evidence-outside-window` warning. Keep the existing case that a High after `peak + 3`
      still warns. Run `pnpm test`.

## 2. Engine — the no-Peak signal and the begin label

- [x] 2.1 Add the failing case for the begin label to `marquette.test.ts`: a cycle 9 with an empty
      lookback reports `begin: 6` and `beginRule: "calendar-day-6-fallback"`, while the same cycle with
      Peaks `12, 16` in the lookback reports `beginRule: "calendar-earliest-peak-minus-6"` and the same
      begin day of 6. Run `pnpm test` and confirm it fails.
- [x] 2.2 In `src/core/engine/marquette.ts`, give the empty-history branch of `computeBegin` its own rule
      value. The begin _day_ is unchanged in every case. Run `pnpm test`.
- [x] 2.3 Add the failing cases for the High-run signal to `marquette.test.ts`: nine consecutive `high`
      readings with no Peak produce `{ kind: "high-run", cycleNo, run: 9 }`; eight do not; a run broken
      by a `low` and restarted is not reported and is not measured as one run; a `peak` ends the run. In
      every case the reported window begin and end are identical to the same cycle without the run, so the
      signal cannot move the window. Run `pnpm test` and confirm they fail.
- [x] 2.4 Implement the run count in `marquette.ts` as a pure helper over the already-sorted records, and
      raise the warning **outside** the `end === null` / `else` split so it is reported whether or not an
      end was found. Run `pnpm test`.

## 3. Engine — the unions

- [x] 3.1 In `src/core/engine/types.ts`, narrow `EndRule` to `"current-peak-plus-n" | "none"` and add
      `"lookback-latest-peak-plus-n"` and `"protocol-fallback-window"` for the projection paths, then add
      `"calendar-day-6-fallback"` to `BeginRule` and the `{ kind: "high-run"; cycleNo: number; run: number }`
      member to `EngineWarning`. Every value in the union must have exactly one producer and one label
      entry by the end of group 6. Do not leave a value that nothing produces.
- [x] 3.2 Run `pnpm test` and confirm the failures are exactly the label maps and fixtures that reference
      removed values, listed in group 6, and nothing else. A failure outside that list means an unexpected
      consumer and must be investigated rather than patched.

## 4. Projection

- [x] 4.1 Add the failing cases to `src/core/engine/__tests__/projection.test.ts`. With lookback Peaks
      `12, 13, 16, 17`, a projected cycle's window begins six days before 12 and ends three days after 17.
      With no Peak anywhere in the lookback, the window is 6 through `DEFAULT_EARLIEST_PEAK +
DEFAULT_POST_PEAK_DAYS` — asserted as the composition, not as the literal 15, so a change to either
      constant moves the expectation. A recorded peakless cycle still gets no end and no fallback.
      Run `pnpm test` and confirm they fail.
- [x] 4.2 In `src/core/engine/projection.ts`, recompose `PROTOCOL_DEFAULT_WINDOW_END` from
      `DEFAULT_EARLIEST_PEAK + DEFAULT_POST_PEAK_DAYS` instead of the literal 21, update the block comment
      that says the band applies only when there is no Peak history, and rename the rule value it reports
      to `protocol-fallback-window`. Note in a comment that `predict.ts` consumes the same constant so the
      forecast and the projection cannot disagree.
- [x] 4.3 Replace `boundWindow` with a function that derives a projected cycle's window from the lookback
      Peaks when any exist — begin `earliest - 6` with `beginRule: "calendar-earliest-peak-minus-6"`, end
      `latest + 3` with `endRule: "lookback-latest-peak-plus-n"` — and uses the composed band only when
      the lookback is empty. Re-derive day statuses from the resulting window exactly as `boundWindow`
      does today. Run `pnpm test`.
- [x] 4.4 Add the case that pins `design.md` Decision 7: an open cycle with a real monitor Peak on day 20,
      with `projectFutureCycles` supplying a projection, yields a projected window whose end is day 23 —
      the same as the real cycle's — because the open cycle's own Peak is the last element of the lookback.
      Assert the real cycle's result is untouched by the projection call. Run `pnpm test`.

## 5. Vocabulary — the exhaustive maps

- [x] 5.1 In `src/features/status/lib.ts`, drop the `earliest-end` and `historic-peak-plus-n` entries from
      `END_RULE_LABELS`, add `lookback-latest-peak-plus-n` and `protocol-fallback-window`, and add
      `calendar-day-6-fallback` to `BEGIN_RULE_LABELS` with a label that says it is a fallback rather
      than the first-cycle rule. Every label must name the rule it describes; no entry may be a synonym
      of another. Confirm `warningBanner` still returns `null` for `no-peak-end` and `high-run` unless
      group 6 widens it.
- [x] 5.2 In `src/features/cycle-summary/lib.ts`, bring `BEGIN_BASIS` and `END_BASIS` in line with the
      new unions: drop the two removed rules, add the three new ones, and rewrite the sentences that named
      an earlier cycle's Peak as the reason a window ended. `END_BASIS` must keep stating the literal
      three for every rule that measures from a Peak. Confirm the new `BeginRule` gets a sentence
      distinct from `calendar-day-6`'s, or a comment saying deliberately that they share one.
- [x] 5.3 Run `pnpm test`. Expect failures only in the test files that enumerate the old unions:
      `status/__tests__/lib.test.ts` and `cycle-summary/__tests__/lib.test.ts`. Fix those enumerations
      and delete the assertions whose subject no longer exists — the two post-window rules no longer have
      distinct text, and the summary no longer states an end from an earlier cycle.

## 6. Surfaces

- [x] 6.1 Add the failing cases for the Status surface. A cycle with no Peak shows a warning naming the
      missing Peak and stating the cycle is unresolved, and it does not render a clinician referral or a
      disclaimer; a cycle with a nine-day High run shows a warning naming the run length; an ordinary
      cycle shows neither; everything is suppressed when interpretation is disabled. Reuse the forbidden
      regex already declared in `status/__tests__/status.test.tsx` so the no-disclaimer guarantee is
      enforced by the same expression. Run `pnpm test` and confirm they fail.
- [x] 6.2 Widen `WARNING_LABELS` and `warningBanner` in `status/lib.ts` to cover `no-peak-end` and
      `high-run`, keeping the existing precedence: reconciliation evidence outranks still-in-progress,
      which outranks the no-Peak and High-run observations. Copy stays factual — the run's length and the
      monitor's own guidance, nothing about the user's body, no referral.
- [x] 6.3 Add the failing case to `cycle-summary/__tests__/lib.test.ts` for a `high-run` warning reaching
      the document, asserting the run length is printed and that the run is not presented as a Peak. Then
      add the `high-run` line to `warningLines`. Run `pnpm test`.
- [x] 6.4 In `src/features/history/index.tsx`, leave the reconciliation counter alone. A `high-run` or
      `no-peak-end` cycle is not a reconciliation and must not inflate the "cycles to look at" count.
      Confirm by test that the count is unchanged for such a cycle.

## 7. Docs

- [x] 7.1 Update `AGENTS.md`'s fertile-window end table: the "After 6 cycles" row becomes the same rule as
      cycles 1–6, and the line reading "If a cycle has no Peak (8–10% of cycles), fall back to the calendar
      rule for the end" becomes "a cycle with no Peak has no end, in every cycle". Keep the post-Peak
      constant paragraph and its warning against reintroducing a setting.
- [x] 7.2 Add the 9-consecutive-High signal to `AGENTS.md`'s domain rules, and correct the begin table's
      note so it does not imply the earliest-Peak rule applies when there is no Peak to measure from.
- [x] 7.3 Check `docs/MILESTONE_2_ENGINE.md`, which documents the end rule and its test matrix in prose.
      Correct the rows that describe the earlier-of-two rule, and say plainly in the file that it records
      a superseded milestone rather than current behaviour, so a reader is not misled by a doc that looks
      authoritative.

## 8. Verification and handoff

- [x] 8.1 Run `pnpm check` and confirm format, lint, all tests, and the build are green.
- [x] 8.2 Run `openspec validate --all` and confirm it passes, with no "archive would refuse" note.
- [x] 8.3 Confirm the engine is still pure: `src/core/engine/` imports nothing from React, Dexie, or a
      browser API, and no new input was added to any engine function.
- [x] 8.4 Grep for every removed value across the repo and confirm no occurrence remains outside
      `openspec/changes/archive/**` and `docs/` prose that group 7 corrected.
- [x] 8.5 Comment on issue #31 recording the two findings this change verified rather than assumed — that
      the open cycle's re-derivation is confined to future days by a date comparison in the grid, and that
      the "no screen displays the unresolved signal" line was already partly stale because #26's printable
      summary shows it — plus the two legacy scenario headings kept for archive compatibility.
