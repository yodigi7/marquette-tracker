# Tasks

Test-first throughout: write or update the failing table cases before touching the implementation,
per the project's tests-first rule for `core/engine`. `pnpm test` after every task in groups 1–4.

`goal` is explicitly **out of scope** — leave the field, its `<Select>`, its validator clause, and
its spec requirement alone.

## 1. Engine — fixed three-day interval

- [x] 1.1 Update the table cases in `src/core/engine/__tests__/marquette.test.ts` for the new
      interval before changing any implementation: a monitor Peak on day 14 yields an inclusive
      fertile window of days 14–17 and day 18 is post-window; delete the configurable-interval case;
      remove `postPeakDays` from the settings fixture. Run `pnpm test` and confirm these cases fail.
- [x] 1.2 In `src/core/engine/marquette.ts` set `DEFAULT_POST_PEAK_DAYS = 3` and make `computeEnd`
      read the constant instead of `settings.postPeakDays`; in `src/core/engine/types.ts` remove
      `postPeakDays` from `EngineSettings` and keep the `Goal` type. Run `pnpm test` and confirm the
      engine suites pass.
- [x] 1.3 [P] In `src/core/engine/predict.ts` make `predictFertileWindow` use
      `DEFAULT_POST_PEAK_DAYS` for the window end, and drop `postPeakDays` from the fixture in
      `src/core/engine/__tests__/predict.test.ts`. Run `pnpm test`.
- [x] 1.4 [P] Drop `postPeakDays` from the settings fixture in
      `src/core/engine/__tests__/projection.test.ts`. Run `pnpm test`.
- [x] 1.5 In the same commit as 1.2, edit the Purpose of
      `openspec/specs/marquette-engine/spec.md` to replace "the four-day post-Peak calculation
      behavior" with the fixed three-day interval. Do not land this before 1.2 — the authoritative
      spec must not claim a three-day interval while the engine still computes four (design
      Decision 6). Verify the Purpose no longer contains "four-day".

## 2. Store and backup contract

- [x] 2.1 Remove `postPeakDays` from `SettingsEntity` and from `DEFAULT_SETTINGS` in
      `src/core/store/entities.ts`, keeping `goal`. Run `pnpm typecheck` and confirm the only errors
      are the expected `postPeakDays` references.
- [x] 2.2 [P] In `src/core/backup/backup.ts` add `postPeakDays` to the destructure-to-drop list in
      `normalizeSettings` alongside `postPeakFillMode` and `postPeakSuppressions`, and remove the
      post-Peak range clause from `validateSettings`. Leave `CURRENT_BACKUP_VERSION` at 1. Update
      `src/core/backup/__tests__/backup.test.ts` and `__tests__/fixtures.ts` to cover a legacy
      document carrying `postPeakDays` being dropped on restore. Run `pnpm test`.
- [x] 2.3 [P] Remove `postPeakDays` from the settings rows in
      `src/core/store/__tests__/store.test.ts` and add a case asserting a legacy persisted row with
      `postPeakDays` restores without the field. Run `pnpm test`. Also required a matching
      destructure-to-drop in `SettingsRepository.get` (`src/core/store/repositories.ts`): the backup
      path drops the key, but the hydration path spread the raw Dexie row, so a legacy value
      survived and would have leaked into later exports.

## 3. Status view labels

All three tasks edit `src/core/engine` consumers of the same file, `src/features/status/lib.ts`, so
they are sequenced rather than parallel.

- [x] 3.1 In `src/features/status/lib.ts` drop the `postPeakDays` parameter from `endRuleLabel` and
      from `windowDescription`, and give `END_RULE_LABELS` concrete text in place of the `"N days"`
      substitution. Keep the `EndRule` member names unchanged (design Decision 3). Run
      `pnpm typecheck`.
- [x] 3.2 In the same file, rewrite `STATUS_LABELS` to `Before`, `Fertile`, `After (post-peak)`, and
      `After (by calendar)`, keeping `STATUS_TONES` unchanged so the visual treatments still map
      one-to-one to `fertility-visuals`. Run `pnpm typecheck`.
- [x] 3.3 Update the call sites in `src/features/status/index.tsx`, then update
      `src/features/status/__tests__/lib.test.ts` and `__tests__/status.test.tsx` to assert the new
      labels and that no rendered label contains "Safe". Run `pnpm test`.

## 4. Settings UI

- [x] 4.1 [P] In `src/features/settings/core-section.tsx` remove the post-Peak `NumberField` and
      drop the `sm:grid-cols-2` wrapper so the history-window field is not left alone in a
      two-column grid. Keep the goal `<Select>`. Update
      `src/features/settings/__tests__/settings.test.tsx` and `__tests__/clear-data.test.tsx` to
      assert no post-Peak control is offered. Run `pnpm test`.
- [x] 4.2 [P] Remove the `postPeakDays` reference in `src/core/store/selectors.ts`. Run
      `pnpm typecheck`.

## 5. Documentation

Sequenced after groups 1–4 are green so the file describes verified behaviour (design Decision 5).
Tasks 5.1 and 5.2 edit the same file and must be applied in order.

- [x] 5.1 In `AGENTS.md` correct the protocol rules: line 55's "4 full (24-h) days" becomes three
      full days; lines 56 and 97 replace `+ postPeakDays` with `+ 3`; line 59's "assumed (inferred)
      Low begins at P+5" sentence is removed and the default-and-configurable clause is replaced with
      the fixed three-day protocol constant.
- [x] 5.2 Delete `AGENTS.md` line 60 outright — it describes the inferred post-Peak Low tail and its
      30-row budget, both removed in `32bae5d`, and would otherwise instruct a future agent to
      rebuild a deleted feature. Then update lines 83 and 92 to drop post-Peak days from the
      Settings list and the Views list while keeping `goal`. Verify no remaining line in `AGENTS.md`
      mentions `postPeakDays`, "inferred", or "30-row".

## 6. Verification

- [x] 6.1 Run `pnpm check` and confirm format, lint, test, and build are all green.
- [x] 6.2 Run `openspec validate --all` and confirm it passes.
- [x] 6.3 Manually confirm the behaviour change end to end: Settings offers no post-Peak control,
      the Status view shows `After` rather than `Safe`, and a cycle with a monitor Peak on day P
      reports a fertile window ending on P+3 — including a cycle that already had a stored
      `postPeakDays` of 4 before this change, which must now show P+3 with no manual step. Verified
      in a real browser against a seeded legacy `postPeakDays: 4` row: Settings exposes no
      post-Peak control, the Status window line reads "current monitor Peak + 3 days" and its badge
      reads "After (post-peak)", and no view renders the word "Safe".

## 7. Post-verification coverage gaps

Added after `/opsx-verify` found two delta scenarios asserted only in part. Both were behaviour
correct but unguarded, so each fix is a test only — no production code changed.

- [x] 7.1 Guard the "no medical disclaimer is added in place of that claim" clause of the status
      requirement's "A recorded reading does not license a safety claim" scenario. Add
      `renders no medical disclaimer in either interpretation mode` to
      `src/features/status/__tests__/status.test.tsx`, matching a general disclaimer/caveat pattern
      across both the interpretation and logging-only renderings. This also closes the previously
      untested `status` scenario "Status does not render a medical disclaimer", which
      `status.test.tsx:40` only guarded for two specific phrasings. Verified by mutation: adding a
      caveat line to `StatusCard` fails the test.
- [x] 7.2 Cover the "each identifies the rule that produced its window end" clause of "The two
      post-window statuses remain distinguishable", which no test asserted. Add cases to
      `src/features/status/__tests__/lib.test.ts` asserting `windowDescription` embeds the
      `END_RULE_LABELS` text for every finite-end rule, that the Peak-closed and history-closed lines
      differ, and that an undetermined end carries no rule name. Verified by mutation: collapsing
      two rule labels to identical text, and removing the rule name from the window line, each fail.
