# Proposal

## Why

The app makes two claims it cannot support. Its fertile window ends one day later than the
published Marquette protocol says it should, and the Status view labels days "Safe" on the
authority of a window computation that never looks at what the user recorded. Both are
correctness problems in the app's central output, and both are cheap to fix now.

The post-Peak default of 4 arrived with commit `871ac4e` ("monitor-only Peak evidence, 4-day
post-Peak default, High stop") alongside the inferred-post-Peak-record feature. That feature was
removed in `32bae5d` / #17, but the default of 4 stayed. The published protocol is three:

> "the estimated fertile window begins on day 6 of the first six cycles and ends **three full days
> past the last peak reading** (of either mucus or monitor)."
> — Mu, Fehring & Bouchard, _Linacre Q_ 2022;89(1):64–72

> "Fertility ENDS on the last PEAK day plus THREE full days"
> — Fehring, _The Marquette Model_, 2018

With the engine's inclusive end, `end = peak + 3` _is_ "the Peak plus three full days". The app
currently paints one extra fertile day, and the Status view renders that as "current Peak + 4
days" without indicating it is quoting a default rather than the protocol.

Separately, `STATUS_LABELS` labels `post-peak` and `post-calendar` as **"Safe (post-peak)"** and
**"Safe (by calendar)"**. `dayInfo(window, peakKnown, day)` takes no `DayRecord` parameter, so no
recorded reading can reach a status. A day carrying a user-entered monitor `high` can therefore be
reported "Safe" — see #21, where the full trace is worked. "Safe" is a claim of infertility that
the derivation does not establish, and it is asserted in the direction that defeats the app's
purpose for a user avoiding pregnancy.

## What Changes

- **BREAKING (behaviour):** the post-Peak interval becomes a fixed protocol constant of 3. The
  `postPeakDays` setting is removed from the engine, the store, Settings, and the backup contract.
  There is no user-facing control and no persisted override, so the app can no longer represent a
  non-protocol window.
- **BREAKING (behaviour):** any locally stored or backed-up `postPeakDays` value is dropped on
  load and on restore, and the window end becomes `peak + 3` regardless of what it was. For a
  single-user app this self-corrects existing data with no migration step. `CURRENT_BACKUP_VERSION`
  stays `1` — the field is dropped by the existing destructure-to-drop mechanism in
  `normalizeSettings`, the same path that removed `postPeakFillMode` and `postPeakSuppressions`.
- The Status view's four status labels adopt the vocabulary the Calendar already uses:
  `Before` / `Fertile` / `After`, retaining the `post-peak` versus `post-calendar` distinction as
  `After (post-peak)` and `After (by calendar)`. "Safe" is removed as an unsupported claim.
- `AGENTS.md` is corrected. Seven lines describe behaviour that no longer exists, and two of them
  instruct a future agent to build or preserve a feature that was deleted in `32bae5d`.
- `goal` is explicitly **not** touched. It is a dead setting — nothing reads it — but removing it
  is out of scope for this change and is left as-is.

### Not in this change

- The engine response to a monitor `high` recorded after the computed window end, and the
  `marquette-engine`/`status` text governing how recorded evidence relates to derived status. These
  are decisions (2) and (3) of #21 and remain open in that issue. This change makes the app stop
  _asserting_ safety; it does not make the engine _respond_ to trailing evidence.
- `days-remaining-in-window` as a derived output. It is a new feature with its own edge cases
  (no determinable end, today before the window begin, today past the window end) and warrants its
  own change.
- The three backlog issues raised during review: #18 cycle-vs-cycle overlay, #19 symptom patterns,
  #20 partner read-only share, and #12 cycle-method modes.

## Capabilities

### New Capabilities

None. This change corrects existing behaviour and adds no new capability surface.

### Modified Capabilities

- `marquette-engine`: replaces "The default post-Peak interval is four days" with a fixed
  three-day protocol interval; removes the configurable-interval scenario; updates the
  "Day results span the derived window" scenario that encodes a Peak on day 12 producing fertile
  days 13 through 16 (under a three-day interval day 16 is past the window).
- `app-settings`: removes post-Peak days from the Core preferences and its two scenarios
  ("Post-peak days shift the fertile-window end", "Default post-Peak interval is four days"), and
  removes the post-Peak range from the invalid-numeric-input scenario, which no longer has a field
  to validate.
- `status`: replaces the requirement clause "SHALL preserve the existing status labels" with the
  Calendar's phase vocabulary, and requires that no status label assert infertility for a day whose
  recorded evidence the derivation did not consider.

## Impact

**Engine** (`src/core/engine/`) — `DEFAULT_POST_PEAK_DAYS` becomes 3 and stops being overridable;
`EngineSettings` loses `postPeakDays`; `computeBegin`/`computeEnd` in `marquette.ts` and
`predictFertileWindow` in `predict.ts` read the constant. Pure TypeScript, no new imports, still
portable to Python. `Goal` in `types.ts` is untouched.

**Store** (`src/core/store/`) — `SettingsEntity` and `DEFAULT_SETTINGS` lose `postPeakDays`.
`repositories.ts` already merges `{ ...DEFAULT_SETTINGS, ...row }`, so a persisted value is
overridden by nothing once the field is gone from defaults and the row type; the backup normaliser
is what guarantees the key is dropped from restored documents.

**UI** (`src/features/`) — `settings/core-section.tsx` loses the post-Peak `NumberField`, which
leaves the `sm:grid-cols-2` wrapper holding a single field. `status/lib.ts` loses
`endRuleLabel`'s `postPeakDays` parameter, so `END_RULE_LABELS` carries concrete text, and
`STATUS_LABELS` is rewritten to the phase vocabulary. `status/index.tsx` and
`store/selectors.ts` follow.

**Backup** (`src/core/backup/`) — `postPeakDays` joins the destructure-to-drop list in
`normalizeSettings` and leaves `validateSettings`. No format version bump.

**Docs** — `AGENTS.md` lines 55, 56, 59, 60, 83, 92, 97. Line 60 is deleted outright: it describes
the inferred post-Peak Low tail and its 30-row budget, both removed in `32bae5d`.

**Dependencies** — none added. This is a hobby project and no new package is required.

**Scale** — 46 references across 17 files, 24 of them in tests. `pnpm check` covers format, lint,
test, and build.
