# Design

## Context

See `proposal.md` for motivation and `specs/` for the requirements. What shapes the approach:

`postPeakDays` is threaded through every layer. `marquette.ts` exports
`DEFAULT_POST_PEAK_DAYS = 4`; `EngineSettings` carries `postPeakDays`; `computeEnd` reads it for
both the current-cycle and historical rules; `predict.ts` reads it again in
`predictFertileWindow`; `SettingsEntity` and `DEFAULT_SETTINGS` persist it; `core-section.tsx`
renders a `NumberField` for it; `status/lib.ts` threads it into a label substitution; and
`backup.ts` validates it. 46 references across 17 files, 24 in tests.

The store loads settings as `{ ...DEFAULT_SETTINGS, ...row }` (`repositories.ts:158`), so today a
persisted value wins over any new default. That is why fixing the constant alone would not have
corrected existing data — the value is already written to IndexedDB. Removing the field removes the
override as a side effect, which is the only mechanism that self-corrects a single user's stored
data without an ambiguous rewrite.

`normalizeSettings` (`backup.ts:105`) already destructures two retired settings out of restored
documents, with a comment explaining that destructure-to-drop is the removal mechanism. `goal` is
dead but stays; see Non-Goals.

`status/lib.ts` and the Calendar disagree about vocabulary for the same two statuses. `calendar`
spec fixes the human-facing set as `Before` / `Fertile` / `After`, with `After` covering
`post-peak` and `post-calendar`; `status` spec separately requires that the view "SHALL preserve
the existing status labels".

## Goals / Non-Goals

**Goals:**

- Make the window end `peak + 3` unconditionally, so the app cannot represent a non-protocol
  window.
- Make the Status view's labels say only what the derivation established.
- Leave `AGENTS.md` true at every commit in the series.

**Non-Goals:**

- Changing what the engine _does_ about a monitor `high` recorded after the computed window end.
  That is decision (2) of #21 and is still open. This change makes the app stop asserting safety; it
  does not make the engine respond to trailing evidence.
- Removing `goal`. It is dead — five production references, all of them the `<Select>` that writes
  it, its own validator clause, and its declaration — but it is explicitly out of scope here.
- `days-remaining-in-window`, and backlog #18, #19, #20, #12.
- Renaming the `EndRule` members (see Decision 3).

## Decisions

### 1. The post-Peak interval is fixed; two neighbouring protocol parameters stay configurable

`historyWindow` (default 6) and `cycleMinLength`/`cycleMaxLength` (default 21–42) are also published
protocol numbers, and both stay user-configurable. Only the post-Peak interval is frozen. That
asymmetry is deliberate and needs a stated reason, or a future reader will read it as an accident.

The distinction is **centrality versus tolerance**. The post-Peak interval defines the _shape_ of
the fertile window — it decides when fertility ends. A wrong value makes the app's single central
output wrong, and the error is invisible because a window ending one day late still looks like a
perfectly plausible window. The other two are inputs to a heuristic: how far back to look for the
calendar rule, and which cycles count as out of band. A wrong value there degrades secondary output,
and a certified teacher may legitimately tune them per client — a 12-cycle lookback, or a band
widened for a perimenopausal client outside 21–42.

**Alternative considered:** keep the setting and fix only the default. Rejected. It leaves the app
able to render a non-protocol window as a Marquette window, which is the exact failure mode this
change exists to close. **Also considered:** keep it configurable and surface the deviation
("post-Peak interval 4, protocol: 3"). Rejected as YAGNI — a single user who sets 3 never sees the
warning, and it adds a UI concept to close a hole that not having the setting already closes.

### 2. No backup format version bump

`CURRENT_BACKUP_VERSION` stays `1`. `postPeakDays` joins the destructure-to-drop list in
`normalizeSettings`, the same path that retired `postPeakFillMode` and `postPeakSuppressions`.

**Alternative considered:** bump to `2` with a migration. Rejected. A migration would have to
distinguish a `4` that was the inherited default from a `4` a user deliberately chose, and that
distinction is not recoverable from the stored value. An automatic rewrite would destroy real
choices; dropping the key makes no claim about the old value at all. Once the field leaves
`DEFAULT_SETTINGS` and is destructured out, both `normalizeSettings` and the v0→v1 branch of
`migrate` stop carrying it.

### 3. `EndRule` members keep their `-n` suffix

`"current-peak-plus-n"` and `"historic-peak-plus-n"` become misnomers when `n` is 3.

**Chosen:** keep the names; the label map carries the concrete number. The members identify _rules_,
not values, and they are part of the engine's public type surface — consumed by `status/lib.ts` and
asserted in engine tests. Renaming touches the type, three label entries, and every test that
constructs a window literal, for no behavioural gain.

Consequence: `endRuleLabel(rule, postPeakDays)` loses its parameter and its
`.replace("N days", ...)` substitution, so `END_RULE_LABELS` holds concrete text.

**Trade-off:** `-n` reads oddly for a constant. Accepted, recorded here so it is not "corrected"
later without this context.

### 4. Labels adopt the Calendar's vocabulary rather than a new safety-neutral phrase

`Before` / `Fertile` / `After (post-peak)` / `After (by calendar)`.

**Alternative considered:** a bespoke phrase such as "Outside the estimated window". Rejected —
`calendar` spec already fixes the human-facing vocabulary, and inventing a fourth set of words for
the same two statuses would deepen the very split this change closes. The parenthetical preserves the
`post-peak` versus `post-calendar` distinction that the Status view legitimately provides and that
`fertility-visuals` requires remain visible.

This also drops a latent overclaim: "Fertile window" shown against a single day read as though the
whole window were fertile.

The `status` spec forbids a medical disclaimer, so a caveat cannot stand in for honest wording. The
vocabulary itself has to carry the claim, which is why this is a requirement and not a copy tweak.

### 5. `AGENTS.md` is corrected in the same change, last

Line 60 instructs a future agent that a High "stops the inferred Low tail" and that a later Peak
"starts a fresh tail with its own 30-row budget" — both removed in `32bae5d`. Left alone it is worse
than a stale number, because it describes a feature as live. Lines 55, 56, 59, 97 encode the 4-day
default; 83 and 92 enumerate Settings fields.

Correcting the doc in the same change keeps `AGENTS.md` accurate at every commit. Sequenced last so
it describes verified behaviour rather than intended behaviour.

### 6. The `marquette-engine` Purpose is edited at implementation time, not during planning

`openspec/specs/marquette-engine/spec.md` has a Purpose reading "the four-day post-Peak calculation
behavior used by the current fertility engine". The `specs` workflow says an existing capability's
Purpose is changed by editing the main spec directly, since a delta's Purpose is ignored.

Doing that during planning would make the authoritative spec claim a three-day interval while the
engine still computes four — spec ahead of implementation, which spends the authority the spec
exists to hold. The edit is therefore a task, applied in the same commit as the engine change, and
the spec never disagrees with the code.

**This is a deliberate deviation from the literal instruction** and is recorded in `tasks.md` as an
explicit final step.

## Risks / Trade-offs

- **A user with a deliberately non-default `postPeakDays` silently loses it** → their window becomes
  `peak + 3`. Accepted: the app is single-user, the change is the correction, and no automatic
  rewrite is possible that respects a real choice. Stated as a BREAKING behaviour change in the
  proposal so it is not discovered at runtime.
- **Every historical cycle's window end shifts by one day** → nothing is rewritten, because windows
  are derived at read time and never stored. Charts, stats, and the forecast re-derive. Only displayed
  numbers move. No stored derived state exists to migrate.
- **Removing `postPeakDays` from `EngineSettings` is a breaking engine API change** → the deferred
  Python port must hardcode 3. That is the intent, and it is the correct shape for a protocol
  constant.
- **Test churn is mechanical but wide** → three test files construct settings fixtures that will
  fail to typecheck until `postPeakDays` is removed. Straight removal; no assertion logic changes
  beyond the window-end numbers.
- **`endRuleLabel`'s signature change ripples** → `status/index.tsx` call site and
  `status/__tests__/lib.test.ts`.
- **The `sm:grid-cols-2` wrapper in `core-section.tsx` will hold one field** → drop the wrapper and
  render the history-window field directly rather than leaving a two-column grid with one child.

## Migration Plan

No data migration and no format version bump. The change ships as an ordinary PWA release; existing
cycles re-derive on load and the new window end appears immediately.

Rollback is a revert. A backup exported before this change and restored afterwards is handled by
whichever build is running: the new build drops the key in `normalizeSettings`, the reverted build
carries it again harmlessly through `...DEFAULT_SETTINGS`. Neither direction can produce a
half-restored dataset.
