# Design

## Context

See `proposal.md` for motivation. The facts that shape this design, all verified against the code at
the base commit:

- `DayRecordEntity.bbt` is `number | null` (`src/core/store/entities.ts`), and every value in the
  database today is Celsius because the entry field has only ever been labelled `°C`.
- The entry path is `quick-entry.tsx` → `parseFloat` → `useAppStore.addDayRecord`. `addDayRecord`
  already establishes the reject-on-save precedent by throwing `FutureDateError`, which the form
  catches and turns into a toast while leaving the dialog open.
- Backup import (`src/core/backup/backup.ts`) validates `bbt` only for being a finite number, and
  its `fail()` helper throws a typed `BackupError` that aborts the whole document atomically.
- `SettingsEntity` is a single row read through `repositories.ts`, which merges `DEFAULT_SETTINGS`
  over the stored row and normalizes unrecognised values — so a new preference reaches an existing
  database with no migration.
- The strip chart's temperature axis is `yAxisId="bbt"` with a hard-coded `±0.2` domain pad and a
  `[36, 37]` fallback. The cycle-comparison chart has no temperature axis.
- `src/core/engine` is protocol-only and the Marquette contract is explicitly monitor-only, so
  temperature rules must not land there even though they are pure.

## Goals / Non-Goals

**Goals:**

- One pure module owns every temperature rule, so the entry form, the chart, and backup import agree
  by construction rather than by convention.
- The bands are defined once in Celsius and derived for Fahrenheit, so the two scales cannot drift.
- Validation is testable without a DOM, and the existing tests stay valid.
- No change to the record shape, the backup format version, or any engine behaviour.

**Non-Goals:**

- No coverline, thermal shift, or ovulation confirmation from temperature.
- No rewriting, normalizing, or de-duplicating existing out-of-range values.
- No CSV export, no device import, no per-record unit field.
- No change to how temperature is treated as non-evidence by the engine.

## Decisions

### 1. Canonical storage unit is Celsius

**Chosen:** Celsius, in a plain `number`, with no unit marker on the record.

The reasoning is asymmetric precision. Fahrenheit is the coarser scale: its finest reading is 0.1 °F,
which is 0.056 °C, whereas Celsius reads to 0.01 °C. Storing at the _finer_ resolution is never
lossy for a _coarser_ measurement — a 0.1 °F reading lands on a Celsius value and renders back as
the same 0.1 °F. Storing at the coarser resolution is lossy for a _finer_ measurement, because every
0.01 °C reading would be quantized onto a 0.056 °C grid and the digit the user captured would be gone
permanently. The issue's framing holds: whichever unit is stored canonically is the one that cannot
be lost, so it must be the finer one.

Two independent reasons point the same way, which is why this is not a close call:

- **Every existing value is already Celsius.** Choosing Celsius makes the "existing data must survive
  a unit change" requirement true by construction for all current data, with zero migration and zero
  backup format change. Choosing Fahrenheit would mean migrating every stored reading — rewriting real
  measurements, which the issue explicitly calls out as unacceptable.
- **Fahrenheit entries remain fully recoverable.** `98.2 °F` stores as `36.7777… °C` and renders back
  as `98.2`, because the display rounds to the precision the unit is read at.

**Alternatives considered.** _Fahrenheit canonical_ — rejected; it quantizes the finer scale and
forces a migration of existing data. _Store both / store a string with a unit_ — rejected; it changes
the record shape and the backup format for a project whose data model is explicitly sync-ready, and
it would make every reader handle a union it did not previously have. _Store the raw string_ —
rejected; it defers the decision to every consumer and loses the numeric contract outright.

### 2. Two bands plus a mismatch rule, not one hard limit

**Chosen:** a three-way classification, evaluated in this order.

```
value in the active unit's plausible band?
├── yes → outside its usual band? → confirm, then save : save
└── no  → inside the *other* unit's plausible band? → refuse, naming that unit
          and showing the converted value
          → otherwise → refuse as out of range
```

Bands, defined in Celsius and derived for Fahrenheit:

| band      | Celsius   | Fahrenheit | behaviour                           |
| --------- | --------- | ---------- | ----------------------------------- |
| usual     | 35.0–38.0 | 95.0–100.4 | save silently                       |
| plausible | 34.0–42.0 | 93.2–107.6 | warn, then save on explicit confirm |
| refused   | outside   | outside    | refuse, never store                 |

The 34.0 °C floor is below any survivable human core temperature; the 42.0 °C ceiling is above the
fever range. The two plausible bands do not overlap (42.0 < 93.2), so "this is the other unit" is a
deterministic classification rather than a guess. The `usual` band is a _reporting_ threshold, not a
validity one — illness and a hot night are real, and the issue is explicit that rejecting a real
reading is itself a failure mode. Hence the confirm tier, and hence the ceiling being set at
"impossible" rather than "unusual".

**Alternatives considered.** _Single hard range with no escape_ — rejected by the issue and by the
illness case. _Reject anything outside the usual band_ — rejected; it would block a fever reading that
is genuine and diagnostically interesting. _Warn on any value the user did not type exactly_
— rejected as unfalsifiable to test.

### 3. Backup import reports implausible values rather than refusing the document

**Chosen:** import keeps its hard refusal for values that are not finite numbers, and _reports_ a
count of finite values outside the plausible range in the restore result, preserving them verbatim.

This deliberately diverges from a literal reading of "enforce a range on backup import", and it is
the assumption most worth the owner's attention. The reason: after this change ships, a user's
existing backup may well contain exactly the corruption this issue is about — a `98.2` written into a
Celsius field, with no record that it is wrong. A hard range check at import would make that backup
_unrestorable_, which is a strictly worse outcome than the one being fixed. The issue's own non-goals
("no correction or normalization of existing out-of-range values. Flag them if useful") point the
same way. Enforcement at import therefore means "no longer silent", not "refuse": the number of
readings worth checking reaches the user, and the restore still succeeds.

A backup that fails to restore is data loss. A backup that restores one reading the user can see is
flagged is a message.

**Alternatives considered.** _Hard reject on import_ — rejected; it bricks pre-existing backups.
_Strip or clamp the values_ — rejected; it is the silent rewrite the issue forbids, and it destroys
the evidence that something is wrong.

### 4. The rules live in `src/core/temperature.ts`, outside the engine

**Chosen:** a new framework-agnostic module beside the engine, not inside it.

The engine is the Marquette protocol and is explicitly monitor-only; temperature is a logged overlay
and never evidence. Putting range rules in `core/engine` would both corrupt that contract and drag a
user-preference concern (the active unit) into the portable protocol module that is meant to port to
Python for logic parity. The module imports nothing — no React, no Dexie, no browser API — so the
form, the chart, and backup validation all consume the same functions.

**Alternatives considered.** _Inside `core/engine`_ — rejected as above. _Inside the calendar feature_
— rejected; the chart and backup import would then import a React feature to get a number range, and
backup validation would pull in the UI layer.

### 5. Display rounds to the unit's read precision; saving converts from the field

Displayed temperatures are rounded to two decimals in Celsius and one in Fahrenheit, and saving
converts whatever the field holds. A consequence worth stating plainly: re-opening a day and saving
without editing the temperature can move the stored value by up to half a display digit — at most
0.005 °C. This is bounded, it only happens on a deliberate re-save, and it is what makes the field
show the user exactly the number they are agreeing to. The alternative, tracking whether the field
was touched, buys nothing a user would notice at 0.005 °C and adds state.

Changing the _preference_ never writes a record at all, which is the requirement that actually
matters for data safety.

### 6. The unit control sits in Display & protocol

Celsius/Fahrenheit is a display and entry preference, so it joins week start, the cycle-length band,
and the chart overlays in the section the project already labels "Display & protocol", rather than
opening a new section or landing in Core. The axis is labelled by suffixing the unit onto its ticks
rather than adding a separate caption, which keeps the label attached to the numbers it qualifies.

## Risks / Trade-offs

- **A prefilled Fahrenheit thermometer against a user who prefers Celsius** → the mismatch rule
  catches it at the field and explains the conversion rather than storing it. This is the single
  most likely real-world path into the old corruption, and it is exactly the case the message names.
- **Widen plausible to 34–42 °C and someone types `36.5 °F`** (a temperature in the wrong unit but
  not in the other unit's band either) → it is refused as out of range, not silently stored. The
  message cannot name a unit because neither scale explains it, which the spec states explicitly.
- **Pre-existing out-of-range values already on disk** → they are left exactly as they are. They
  still widen the chart axis (the domain derives from plotted values, so nothing plots off-screen) and
  they are now visible in a restore report. They are never rewritten.
- **A 0.005 °C shift on an untouched re-save** → accepted, bounded, and documented above.
- **`pnpm check` is red at the base commit** for an unrelated date-dependent calendar test that is
  already fixed on the in-flight `agent/issue-31` branch → deliberately not fixed here, to avoid
  colliding with that branch. The owner sequences them.

## Migration Plan

None required, and this is a deliberate property of Decision 1:

- **Data:** no migration. Celsius stays canonical, so every stored value is already correct.
- **Schema:** `SettingsEntity` gains `temperatureUnit`. `repositories.ts` merges `DEFAULT_SETTINGS`
  over the stored row, so an existing database resolves to Celsius on next read with no destructive
  migration, and the value is persisted the first time the user changes it.
- **Backup format:** unchanged. `CURRENT_BACKUP_VERSION` stays 1 — a new optional settings key does
  not change how documents are read, and `validateSettings` treats an absent value as the default.
- **Rollback:** revert the branch. No stored value was rewritten, so nothing needs repairing.

## Open Questions

None. Every decision above is resolved in the specs; the remaining choices were naming and layout.

## Assumptions

Recorded here as they were made, load-bearing first. Each is reversible only as described.

| #   | Decision                                                                                  | Why it was ambiguous                                                                                                           | Affects                                                                 | Reversible?                                                       |
| --- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ----------------------------------------------------------------- |
| A1  | Celsius is the canonical storage unit.                                                    | The issue calls the storage unit "the real design work here" and leaves the choice open.                                       | Every stored temperature, the shape of stored data, backups.            | Hard. A different choice is a migration of all existing readings. |
| A2  | Plausible range 34.0–42.0 °C, usual range 35.0–38.0 °C.                                   | The issue requires a documented range but names none, and requires a warn tier without fixing its edges.                       | What the user is allowed to save, and what they are warned about.       | Easy. Constants in one module.                                    |
| A3  | Unit mismatch is refused outright, with a conversion shown.                               | The issue says a mismatch is "caught and explained, and is not stored" but does not say whether to offer conversion.           | Entry behaviour for the most likely corruption.                         | Easy.                                                             |
| A4  | Backup import reports implausible values instead of refusing the document.                | The issue lists import among the surfaces to enforce a range on, which conflicts with keeping pre-existing backups restorable. | Restore success or failure for backups that already contain corruption. | Moderate; the report count would become a rejection.              |
| A5  | An unusual-but-plausible reading is confirmed in a dialog, not by a second click on Save. | "Lets the user proceed deliberately" does not name a mechanism.                                                                | The save interaction.                                                   | Easy.                                                             |
| A6  | The unit control is a two-option dropdown in Display & protocol.                          | The issue says "a persisted °F/°C setting" without naming the section or control.                                              | Settings layout.                                                        | Easy.                                                             |
| A7  | The chart labels its axis by suffixing the unit onto each tick.                           | "Labelled with its unit" could be a tick suffix or a separate caption.                                                         | Chart readability.                                                      | Easy.                                                             |
| A8  | Re-saving an untouched field may shift the stored value by ≤0.005 °C.                     | Follows from rounding for display; the issue does not address it.                                                              | Stored data, in the last displayed digit only.                          | Easy, at the cost of extra state.                                 |
