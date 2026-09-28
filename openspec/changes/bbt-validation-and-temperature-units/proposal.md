# Proposal

## Why

Basal body temperature is the only daily field with no plausibility check anywhere in the app. A
Fahrenheit reading typed into a Celsius field is stored, plotted as an absurd spike on the cycle
chart, and never flagged — the user finds out weeks later, if ever, and the temperature overlay is
quietly wrong with nothing indicating anything is wrong. The field is also labelled °C with no unit
setting, so every user outside the metric world converts by hand each morning, or skips the
conversion and creates exactly that corruption.

Validation is the cheaper and more urgent half: it protects existing data regardless of which unit
is eventually chosen, and it stops the corruption at the source. The unit preference is then
convenience rather than damage control, and the storage decision it forces is kept in one place.

## What Changes

- **A plausibility range for basal temperature, enforced in two tiers.**
  - Inside the _usual_ band the value saves silently.
  - Inside the _human-plausible_ band but outside the usual band (illness, a hot night, travel) the
    value saves only after an explicit, informed "save anyway" confirmation.
  - Outside the human-plausible band the value is refused, never coerced, clamped, or stored.
- **A distinct unit-mismatch refusal.** A value that is plausible in the _other_ scale is refused
  with a message naming the likely cause and showing the converted value, so `98.2` entered into a
  °C field is explained rather than merely rejected.
- **A persisted °C/°F preference** in Settings → Display & protocol, applied to the day-entry field
  label, hint, and input step, and to the cycle chart's temperature axis.
- **One canonical storage unit, chosen deliberately:** Celsius. Conversion happens on display and on
  input only. Changing the preference never rewrites a stored record, and records entered before the
  preference existed render correctly in either unit.
- **Backup import stops being silent about range without becoming unrestorable.** Values that are not
  finite numbers are still refused as today; values that are finite but implausible are preserved
  verbatim and reported in the restore result rather than rejected.

No new dependency. No change to the engine, the fertile window, or any derived output — temperature
remains a logged overlay and never engine evidence. No correction or normalization of existing
out-of-range values; they are reported, not rewritten. No coverline, thermal-shift, or
ovulation-confirmation logic, and no device or wearable import.

## Capabilities

### New Capabilities

- `basal-temperature`: The temperature contract itself — the canonical storage unit and the
  precision reasoning behind it, the accepted range and what happens at each edge, unit conversion
  in both directions, and unit-mismatch detection. Owns the rules that the entry form, the chart,
  and backup import all depend on.

### Modified Capabilities

- `calendar`: The day-entry temperature field gains a unit-aware label, hint, and input step, plus
  inline validation feedback; an implausible value is refused without writing anything, and an
  unusual-but-plausible value requires a deliberate confirmation.
- `app-settings`: Adds the persisted °C/°F preference in the Display & protocol section, defaulting
  to Celsius, with an unrecognised stored value discarded rather than treated as an error.
- `cycle-chart`: The temperature axis rescales to the active unit and labels its ticks with that
  unit, including the default domain when no readings are present.
- `data-backup`: Import preserves stored temperature values exactly regardless of display
  preference, and reports — rather than rejects or rewrites — finite values outside the plausible
  range.

## Impact

- **New pure module** `src/core/temperature.ts` holding the canonical unit, the range bands, the
  conversion helpers, and the validator. Framework-agnostic like `core/engine`, but deliberately not
  part of the engine: temperature is an overlay, and the engine stays monitor-only.
- **Record shape unchanged.** `DayRecord.bbt` stays `number | null`. The storage-unit decision is
  satisfied by the existing shape, so no migration and no backup format version bump.
- **Settings row gains one field** (`temperatureUnit`), which `settings.get()` already merges from
  defaults, so an existing database picks up Celsius with no destructive migration.
- **Touched surfaces:** day-entry form, Settings → Display & protocol, cycle-chart strip, backup
  import validation and restore result.
- **Tests:** table-driven coverage of range rejection, unit-mismatch detection, conversion in both
  directions, preference persistence, and backup round-trip.
- **Known unrelated failure:** `pnpm check` is already red on `main` — a date-dependent calendar test
  ("refuses to log a projected day") fails in the last few days of a month. It is already fixed on
  the in-flight `agent/issue-31` branch and is deliberately not touched here.
